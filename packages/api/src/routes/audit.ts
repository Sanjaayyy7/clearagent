import { Router } from "express";
import { db, schema } from "../db/index.js";
import { asc, and, eq, gte, lte } from "drizzle-orm";
import { computeContentHash, computeMerkleRoot, sha256 } from "../services/hashChain.js";
import { logger } from "../logger.js";

const router = Router();

// GET /v1/audit/integrity — verify hash chain integrity (EU AI Act Art. 12 + 19)
router.get("/integrity", async (req, res, next) => {
  try {
    // Fetch all events in insertion order
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
      .orderBy(asc(schema.verificationEvents.recordedAt));

    let brokenAt: string | null = null;
    let chainLength = 0;

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

      chainLength++;
    }

    const status = brokenAt ? "broken" : "intact";
    const hashes = events.map((e) => e.contentHash);
    const merkleRoot = computeMerkleRoot(hashes);

    logger.info({ status, totalEvents: events.length, brokenAt }, "Integrity check completed");

    res.json({
      status,
      totalEvents: events.length,
      chainLength,
      merkleRoot,
      checkedAt: new Date().toISOString(),
      ...(brokenAt ? { brokenAt } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/audit/export — full export with hashes, logged (EU AI Act Art. 19)
router.get("/export", async (req, res, next) => {
  try {
    const { agent_id, status, from, to } = req.query;

    const conditions = [];
    if (agent_id) conditions.push(eq(schema.verificationEvents.agentId, agent_id as string));
    if (status) conditions.push(eq(schema.verificationEvents.status, status as string));
    if (from) conditions.push(gte(schema.verificationEvents.occurredAt, new Date(from as string)));
    if (to) conditions.push(lte(schema.verificationEvents.occurredAt, new Date(to as string)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const events = await db
      .select()
      .from(schema.verificationEvents)
      .where(where)
      .orderBy(asc(schema.verificationEvents.recordedAt));

    // Build export payload
    const payload = {
      exportedAt: new Date().toISOString(),
      euAiActArticles: ["12", "14", "19"],
      filters: { agent_id, status, from, to },
      totalRecords: events.length,
      events,
    };

    const payloadJson = JSON.stringify(payload);
    const fileHash = sha256(payloadJson);
    const fileSizeBytes = Buffer.byteLength(payloadJson, "utf8");

    // Get org for audit log
    const orgs = await db.select().from(schema.organizations).limit(1);
    const orgId = orgs[0]?.id;

    if (orgId) {
      await db.insert(schema.auditExports).values({
        orgId,
        exportType: "full",
        format: "json",
        filtersApplied: { agent_id, status, from, to },
        recordCount: events.length,
        requestedBy: orgId,
        requesterRole: "api",
        fileHash,
        fileSizeBytes,
        storagePath: "inline",
        completedAt: new Date(),
      });
    }

    // EU-AI-ACT-GAP: Art. 19 — export does not support authority_name or external access tokens

    logger.info({ recordCount: events.length, fileHash }, "Audit export completed");

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export { router as auditRouter };
