import { Worker, type Job } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { db, schema } from "../db/index.js";
import { eq, desc, sql } from "drizzle-orm";
import { verifyTransaction, type TransactionInput } from "../verification/transaction.js";
import { computeContentHash, computeInputHash } from "../services/hashChain.js";
import { evaluateOversightPolicies } from "../services/oversight.js";
import { logger } from "../logger.js";

export const QUEUE_NAME = "verification";

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

    // Evaluate oversight policies
    const oversight = evaluateOversightPolicies({
      confidence: result.confidence,
      decision: result.decision,
    });

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

    log.info({ eventId: event.id, decision: result.decision, confidence: result.confidence, requiresReview: oversight.requiresReview }, "Verification complete");
  } catch (err) {
    log.error({ err }, "Verification failed");

    await db.update(schema.jobs).set({ status: "failed", error: String(err), updatedAt: new Date() }).where(eq(schema.jobs.id, data.jobId));
  }
}

export function startWorker(redisConnection: IORedis): Worker<VerificationJobData> {
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
