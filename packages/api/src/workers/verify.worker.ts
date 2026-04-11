import { Queue, Worker, type Job } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { SLA_QUEUE_NAME, type SlaJobData } from "./sla.worker.js";
import { db, schema } from "../db/index.js";
import { eq, desc, sql, and, asc } from "drizzle-orm";
import { verifyTransaction, type TransactionInput } from "../verification/transaction.js";
import { computeContentHash, computeInputHash, computeMerkleRoot } from "../services/hashChain.js";
import { evaluateOversightPolicies, type OversightPolicy } from "../services/oversight.js";
import { requestRFC3161Timestamp } from "../services/timestampAnchor.js";
import { logger } from "../logger.js";

export const QUEUE_NAME = "verification";

// Module-level SLA queue — initialised in startWorker before any job runs
let slaQueue: Queue<SlaJobData> | null = null;

export interface VerificationJobData {
  jobId: string;
  orgId: string;
  agentId: string;
  eventType: string;
  eventCategory: string;
  inputPayload: Record<string, unknown>;
  sessionId?: string;
  parentEventId?: string;
  sequenceNum: number;
  retentionDays: number;
}

async function writeIntegrityCheckpoint(orgId: string, jobId: string): Promise<void> {
  // Fetch all contentHashes for this org in insertion order
  const rows = await db
    .select({ contentHash: schema.verificationEvents.contentHash })
    .from(schema.verificationEvents)
    .where(eq(schema.verificationEvents.orgId, orgId))
    .orderBy(asc(schema.verificationEvents.recordedAt));

  const hashes = rows.map((r) => r.contentHash);
  const merkleRoot = computeMerkleRoot(hashes);

  // Get the previous checkpoint ID to link the checkpoint chain
  const prevCheckpoints = await db
    .select({ id: schema.integrityCheckpoints.id })
    .from(schema.integrityCheckpoints)
    .where(eq(schema.integrityCheckpoints.orgId, orgId))
    .orderBy(desc(schema.integrityCheckpoints.checkpointAt))
    .limit(1);
  const prevCheckpointId = prevCheckpoints[0]?.id ?? null;

  await db.insert(schema.integrityCheckpoints).values({
    orgId,
    eventCount: hashes.length,
    merkleRoot,
    prevCheckpointId,
  });

  logger.debug({ jobId, eventCount: hashes.length, merkleRoot }, "Integrity checkpoint written");
}

async function processVerification(job: Job<VerificationJobData>): Promise<void> {
  const data = job.data;
  const log = logger.child({ jobId: data.jobId, bullJobId: job.id });
  log.info("Processing verification");

  // Mark job as processing
  await db.update(schema.jobs).set({ status: "processing", updatedAt: new Date() }).where(eq(schema.jobs.id, data.jobId));

  try {
    // Run verification outside the transaction — pure computation + external I/O
    const result = await verifyTransaction(data.inputPayload as unknown as TransactionInput);

    const occurredAt = new Date();
    const inputHash = computeInputHash(data.inputPayload);

    // Load active oversight policies from DB (Art. 14 — configurable review triggers)
    const activePolicies = await db
      .select({ id: schema.oversightPolicies.id, name: schema.oversightPolicies.name, triggerConditions: schema.oversightPolicies.triggerConditions, reviewerRole: schema.oversightPolicies.reviewerRole })
      .from(schema.oversightPolicies)
      .where(and(eq(schema.oversightPolicies.orgId, data.orgId), eq(schema.oversightPolicies.isActive, true)));

    // Evaluate oversight policies
    const oversight = evaluateOversightPolicies(
      { confidence: result.confidence, decision: result.decision },
      activePolicies as OversightPolicy[]
    );

    const finalStatus = result.decision === "approved" ? "verified" : result.decision === "rejected" ? "failed" : "flagged";

    // Calculate retention expiry
    const retentionExpiresAt = new Date();
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + data.retentionDays);

    // Atomic: advisory lock → read prevHash → insert event
    // pg_advisory_xact_lock serializes concurrent workers for the same org, preventing forked hash chains
    // EU-AI-ACT-GAP: Art. 12 — reasoning field is free text; no structured schema for machine-readable audit
    const event = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${data.orgId}))`);

      const prevRows = await tx
        .select({ contentHash: schema.verificationEvents.contentHash })
        .from(schema.verificationEvents)
        .where(eq(schema.verificationEvents.orgId, data.orgId))
        .orderBy(desc(schema.verificationEvents.recordedAt))
        .limit(1);
      const prevHash = prevRows[0]?.contentHash ?? null;

      const contentHash = computeContentHash({
        inputHash,
        outputPayload: result,
        decision: result.decision,
        occurredAt: occurredAt.toISOString(),
      });

      const [inserted] = await tx
        .insert(schema.verificationEvents)
        .values({
          orgId: data.orgId,
          agentId: data.agentId,
          eventType: data.eventType,
          eventCategory: data.eventCategory,
          inputHash,
          inputPayload: data.inputPayload,
          outputPayload: result,
          decision: result.decision,
          confidence: result.confidence.toString(),
          reasoning: result.reasoning,
          sessionId: data.sessionId,
          parentEventId: data.parentEventId,
          sequenceNum: data.sequenceNum,
          euAiActArticles: ["12", "14", "19"],
          contentHash,
          prevHash,
          occurredAt,
          retentionExpiresAt,
          status: finalStatus,
          requiresReview: oversight.requiresReview,
        })
        .returning();

      return inserted;
    });

    // Mark job completed
    await db.update(schema.jobs).set({ status: "completed", eventId: event.id, updatedAt: new Date() }).where(eq(schema.jobs.id, data.jobId));

    // Enqueue SLA enforcement job if review required (Art. 14)
    if (oversight.requiresReview && slaQueue) {
      const slaSeconds = oversight.slaSeconds ?? 3600;
      const policyId = oversight.policyId ?? null;
      const policyName = oversight.policyName ?? "default";
      void slaQueue.add(
        "escalate",
        { eventId: event.id, orgId: data.orgId, policyId, policyName, slaSeconds },
        { delay: slaSeconds * 1000, attempts: 3, backoff: { type: "exponential", delay: 5000 } }
      ).catch((err) => log.warn({ err }, "Failed to enqueue SLA job — non-critical"));
    }

    // Write Merkle checkpoint (Art. 12 + 19 — integrity snapshot after each event)
    // Best-effort: failure here does not fail the verification job
    void writeIntegrityCheckpoint(data.orgId, data.jobId).catch((err) => {
      log.warn({ err }, "Failed to write integrity checkpoint — non-critical");
    });

    // RFC 3161 external timestamp anchoring (Art. 12 enhancement) — fire and forget
    setImmediate(async () => {
      try {
        const anchor = await requestRFC3161Timestamp(event.contentHash);
        if (anchor) {
          await db
            .update(schema.integrityCheckpoints)
            .set({ externalAnchor: anchor.token, anchorService: anchor.anchorService })
            .where(eq(schema.integrityCheckpoints.orgId, data.orgId));
          log.info({ eventId: event.id }, "RFC 3161 timestamp anchored");
        }
      } catch (err) {
        log.warn({ err }, "RFC 3161 anchoring failed (non-critical)");
      }
    });

    log.info({ eventId: event.id, decision: result.decision, confidence: result.confidence, requiresReview: oversight.requiresReview }, "Verification complete");
  } catch (err) {
    log.error({ err }, "Verification failed");

    await db.update(schema.jobs).set({ status: "failed", error: String(err), updatedAt: new Date() }).where(eq(schema.jobs.id, data.jobId));
  }
}

export function startWorker(redisConnection: IORedis): Worker<VerificationJobData> {
  // Initialise SLA queue so processVerification can enqueue delayed escalation jobs
  slaQueue = new Queue<SlaJobData>(SLA_QUEUE_NAME, { connection: redisConnection });

  const worker = new Worker<VerificationJobData>(QUEUE_NAME, processVerification, {
    connection: redisConnection,
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Job failed");
  });

  return worker;
}
