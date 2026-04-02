import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import postgres from "postgres";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";
import { verifyTransaction, type TransactionInput } from "../verification/transaction.js";
import { computeContentHash, computeInputHash } from "../services/hashChain.js";
import { evaluateOversightPolicies } from "../services/oversight.js";
import { logger } from "../logger.js";

export const QUEUE_NAME = "verification";

// Separate raw SQL client for updates (bypasses Drizzle's abstraction)
const rawClient = postgres(process.env.DATABASE_URL || "postgresql://clearagent:clearagent@localhost:5432/clearagent");

export interface VerificationJobData {
  eventId: string;
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

async function getLastHash(orgId: string): Promise<string | null> {
  const events = await db
    .select({ contentHash: schema.verificationEvents.contentHash })
    .from(schema.verificationEvents)
    .where(eq(schema.verificationEvents.orgId, orgId))
    .orderBy(desc(schema.verificationEvents.recordedAt))
    .limit(1);

  return events.length > 0 ? events[0].contentHash : null;
}

async function processVerification(job: Job<VerificationJobData>): Promise<void> {
  const data = job.data;
  const log = logger.child({ eventId: data.eventId, jobId: job.id });
  log.info("Processing verification");

  try {
    // Run verification
    const result = await verifyTransaction(data.inputPayload as unknown as TransactionInput);

    // Compute hashes
    const occurredAt = new Date().toISOString();
    const inputHash = computeInputHash(data.inputPayload);
    const prevHash = await getLastHash(data.orgId);
    const contentHash = computeContentHash({
      inputHash,
      outputPayload: result,
      decision: result.decision,
      occurredAt,
    });

    // Evaluate oversight policies
    const oversight = evaluateOversightPolicies({
      confidence: result.confidence,
      decision: result.decision,
    });

    const finalStatus = result.decision === "approved" ? "verified" : result.decision === "rejected" ? "failed" : "flagged";

    // Update event via raw SQL (trigger allows pending → final transition)
    await rawClient`
      UPDATE verification_events
      SET
        status = ${finalStatus},
        output_payload = ${JSON.stringify(result)}::jsonb,
        decision = ${result.decision},
        confidence = ${result.confidence.toString()},
        reasoning = ${result.reasoning},
        input_hash = ${inputHash},
        content_hash = ${contentHash},
        prev_hash = ${prevHash},
        occurred_at = ${occurredAt},
        requires_review = ${oversight.requiresReview},
        eu_ai_act_articles = ${"{{12,14,19}}"}::text[]
      WHERE id = ${data.eventId}
    `;

    log.info({ decision: result.decision, confidence: result.confidence, requiresReview: oversight.requiresReview }, "Verification complete");
  } catch (err) {
    log.error({ err }, "Verification failed");

    // Mark as failed
    await rawClient`
      UPDATE verification_events
      SET status = 'failed', decision = 'rejected', reasoning = ${String(err)}
      WHERE id = ${data.eventId}
    `;
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
