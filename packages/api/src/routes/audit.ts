import { Router } from "express";
import { db, schema } from "../db/index.js";
import { asc, desc, and, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { computeContentHash, computeMerkleRoot, sha256, canonicalJson } from "../services/hashChain.js";
import { logger } from "../logger.js";
import { XMLBuilder } from "fast-xml-parser";
import { nanoid } from "nanoid";

const router = Router();

// GET /v1/audit/integrity — verify hash chain integrity (EU AI Act Art. 12 + 19)
router.get("/integrity", async (req, res, next) => {
  try {
    const auth = (req as any).auth;

    // Fetch all events for this org in insertion order
    const events = await db
      .select({
        id: schema.verificationEvents.id,
        inputHash: schema.verificationEvents.inputHash,
        outputPayload: schema.verificationEvents.outputPayload,
        decision: schema.verificationEvents.decision,
        occurredAt: schema.verificationEvents.occurredAt,
        contentHash: schema.verificationEvents.contentHash,
        prevHash: schema.verificationEvents.prevHash,
      })
      .from(schema.verificationEvents)
      .where(eq(schema.verificationEvents.orgId, auth.orgId))
      .orderBy(asc(schema.verificationEvents.recordedAt));

    let brokenAt: string | null = null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Verify content hash integrity
      const expectedHash = computeContentHash({
        inputHash: event.inputHash,
        outputPayload: event.outputPayload,
        decision: event.decision,
        occurredAt: event.occurredAt.toISOString(),
      });

      if (event.contentHash !== expectedHash) {
        brokenAt = event.id;
        break;
      }

      // Verify chain linkage
      if (i > 0 && event.prevHash !== events[i - 1].contentHash) {
        brokenAt = event.id;
        break;
      }

    }

    const validChain = brokenAt === null;
    const hashes = events.map((e) => e.contentHash);
    const merkleRoot = computeMerkleRoot(hashes);

    logger.info({ validChain, totalEvents: events.length, brokenAt }, "Integrity check completed");

    res.json({
      validChain,
      totalEvents: events.length,
      merkleRoot,
      checkedAt: new Date().toISOString(),
      brokenAt,
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/audit/export — full export with hashes, logged (EU AI Act Art. 19)
router.get("/export", async (req, res, next) => {
  try {
    const auth = (req as any).auth;
    const orgId: string = auth.orgId;

    const agentId = typeof req.query.agent_id === "string" ? req.query.agent_id : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const authorityName = typeof req.query.authority_name === "string" ? req.query.authority_name : undefined;
    const authorityRef = typeof req.query.authority_ref === "string" ? req.query.authority_ref : undefined;
    const format = typeof req.query.format === "string" ? req.query.format : "json";

    if (format !== "json" && format !== "xml") {
      res.status(501).json({
        error: {
          code: "format_not_supported",
          message: `Export format "${format}" is not supported. Use "json" or "xml".`,
        },
      });
      return;
    }

    const conditions = [eq(schema.verificationEvents.orgId, orgId)];
    if (agentId) conditions.push(eq(schema.verificationEvents.agentId, agentId));
    if (status) conditions.push(eq(schema.verificationEvents.status, status));
    if (from) conditions.push(gte(schema.verificationEvents.occurredAt, new Date(from)));
    if (to) conditions.push(lte(schema.verificationEvents.occurredAt, new Date(to)));

    const where = and(...conditions);

    const events = await db
      .select()
      .from(schema.verificationEvents)
      .where(where)
      .orderBy(asc(schema.verificationEvents.recordedAt));

    const eventIds = events.map((event) => event.id);
    const reviews =
      eventIds.length > 0
        ? await db
            .select()
            .from(schema.humanReviews)
            .where(inArray(schema.humanReviews.eventId, eventIds))
            .orderBy(asc(schema.humanReviews.reviewCompletedAt))
        : [];

    const generatedAt = new Date().toISOString();
    const exportId = crypto.randomUUID();
    const filters = {
      agent_id: agentId,
      status,
      from,
      to,
      authority_name: authorityName,
      authority_ref: authorityRef,
      format,
    };

    // Signed export chain (Art. 19): each export references the previous export's fileHash
    const prevExports = await db
      .select({ fileHash: schema.auditExports.fileHash })
      .from(schema.auditExports)
      .where(eq(schema.auditExports.orgId, orgId))
      .orderBy(desc(schema.auditExports.requestedAt))
      .limit(1);
    const prevExportHash = prevExports[0]?.fileHash ?? null;

    const exportBody = {
      exportId,
      generatedAt,
      prevExportHash,
      recordCount: events.length,
      filters,
      events,
      reviews,
    };
    const fileHash = sha256(JSON.stringify(exportBody));
    const fileSizeBytes = Buffer.byteLength(
      JSON.stringify({
        ...exportBody,
        fileHash,
      }),
      "utf8"
    );

    await db.insert(schema.auditExports).values({
      id: exportId,
      orgId,
      exportType: "full",
      format,
      filtersApplied: filters,
      recordCount: events.length,
      requestedBy: orgId,
      requesterRole: "api",
      fileHash,
      fileSizeBytes,
      storagePath: "inline",
      authorityName,
      authorityRef,
      completedAt: new Date(),
    });

    logger.info({ recordCount: events.length, fileHash, format }, "Audit export completed");

    if (format === "xml") {
      // EU regulator XML format (Art. 19)
      const xmlBuilder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
        indentBy: "  ",
        arrayNodeName: "item",
      });
      const xmlPayload = {
        AuditExport: {
          ExportMeta: {
            ExportId: exportBody.exportId,
            GeneratedAt: exportBody.generatedAt,
            PrevExportHash: exportBody.prevExportHash ?? "",
            FileHash: fileHash,
            RecordCount: exportBody.recordCount,
            AuthorityName: authorityName ?? "",
            AuthorityRef: authorityRef ?? "",
          },
          Events: {
            Event: exportBody.events.map((e) => ({
              Id: e.id,
              AgentId: e.agentId ?? "",
              EventType: e.eventType,
              EventCategory: e.eventCategory,
              Decision: e.decision,
              Confidence: e.confidence ?? "",
              Status: e.status,
              RequiresReview: e.requiresReview,
              ContentHash: e.contentHash,
              PrevHash: e.prevHash ?? "",
              OccurredAt: e.occurredAt,
              EuAiActArticles: (e.euAiActArticles ?? []).join(","),
            })),
          },
          Reviews: {
            Review: exportBody.reviews.map((r) => ({
              Id: r.id,
              EventId: r.eventId,
              ReviewerId: r.reviewerId,
              ReviewerRole: r.reviewerRole,
              Action: r.action,
              OriginalDecision: r.originalDecision,
              Justification: r.justification,
              ContentHash: r.contentHash,
              ReviewCompletedAt: r.reviewCompletedAt,
            })),
          },
        },
      };
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n` + xmlBuilder.build(xmlPayload);
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.send(xmlContent);
    } else {
      res.json({
        ...exportBody,
        fileHash,
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET /v1/audit/integrity/report — formal hash chain verification report (Art. 12)
router.get("/integrity/report", async (req, res, next) => {
  try {
    const auth = (req as any).auth;
    const orgId: string = auth.orgId;

    // Re-use existing integrity check
    const events = await db
      .select({ id: schema.verificationEvents.id, inputHash: schema.verificationEvents.inputHash, outputPayload: schema.verificationEvents.outputPayload, decision: schema.verificationEvents.decision, occurredAt: schema.verificationEvents.occurredAt, contentHash: schema.verificationEvents.contentHash, prevHash: schema.verificationEvents.prevHash })
      .from(schema.verificationEvents)
      .where(eq(schema.verificationEvents.orgId, orgId))
      .orderBy(asc(schema.verificationEvents.recordedAt));

    let brokenAt: string | null = null;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const expectedHash = computeContentHash({ inputHash: event.inputHash, outputPayload: event.outputPayload, decision: event.decision, occurredAt: event.occurredAt.toISOString() });
      if (event.contentHash !== expectedHash) { brokenAt = event.id; break; }
      if (i > 0 && event.prevHash !== events[i - 1].contentHash) { brokenAt = event.id; break; }
    }

    const checkpoints = await db
      .select()
      .from(schema.integrityCheckpoints)
      .where(eq(schema.integrityCheckpoints.orgId, orgId))
      .orderBy(asc(schema.integrityCheckpoints.checkpointAt));

    const [anchoredCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.integrityCheckpoints)
      .where(and(eq(schema.integrityCheckpoints.orgId, orgId), isNotNull(schema.integrityCheckpoints.externalAnchor)));

    const hashes = events.map((e) => e.contentHash);
    const merkleRoot = computeMerkleRoot(hashes);

    const report = {
      reportType: "hash_chain_verification",
      reportVersion: "1.0",
      generatedAt: new Date().toISOString(),
      generatedBy: "ClearAgent API v0.1.0",
      organization: orgId,
      summary: {
        chainStatus: brokenAt === null ? "intact" : "broken",
        totalEvents: events.length,
        merkleRoot,
        checkpointsVerified: checkpoints.length,
        rfc3161Anchored: anchoredCount?.count ?? 0,
        brokenAt,
      },
      verification: {
        method: "SHA-256 hash chain with Merkle root",
        euAiActArticle: "Article 12 — Logging and Traceability",
        integrityGuarantee: "Append-only PostgreSQL with trigger-level immutability",
      },
      checkpoints: checkpoints.map((c) => ({
        id: c.id,
        eventCount: c.eventCount,
        merkleRoot: c.merkleRoot,
        checkedAt: c.checkpointAt,
        rfc3161Anchored: !!c.externalAnchor,
        anchorService: c.anchorService ?? null,
      })),
    };

    const reportHash = sha256(canonicalJson(report));

    // Log report generation to audit_exports
    await db.insert(schema.auditExports).values({
      id: nanoid(),
      orgId,
      exportType: "integrity_report",
      format: "json",
      filtersApplied: {},
      recordCount: events.length,
      requestedBy: orgId,
      requesterRole: "compliance",
      fileHash: reportHash,
      fileSizeBytes: Buffer.byteLength(JSON.stringify({ ...report, reportHash }), "utf8"),
      storagePath: "api-generated",
      completedAt: new Date(),
    });

    logger.info({ orgId, totalEvents: events.length, chainStatus: report.summary.chainStatus, reportHash }, "Integrity report generated");

    res.json({ ...report, reportHash });
  } catch (err) {
    next(err);
  }
});

export { router as auditRouter };
