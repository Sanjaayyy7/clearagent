/**
 * SLA Enforcement Worker — EU AI Act Art. 14
 *
 * When a verification event requires human review, a delayed BullMQ job is
 * enqueued at the policy's slaSeconds deadline. If no completed review exists
 * by that time, this worker inserts an escalation record in human_reviews with
 * reviewer="system" so the event appears in the /escalated dashboard view.
 */
import { Queue, Worker, type Job } from "bullmq";
import { Redis as IORedis } from "ioredis";
import postgres from "postgres";
import { db, schema } from "../db/index.js";
import { and, eq } from "drizzle-orm";
import { logger } from "../logger.js";
import { sha256 } from "../services/hashChain.js";

export const SLA_QUEUE_NAME = "sla-enforcement";

export interface SlaJobData {
  eventId: string;
  orgId: string;
  policyId: string | null;
  policyName: string;
  slaSeconds: number;
}

async function processSlaEscalation(job: Job<SlaJobData>): Promise<void> {
  const { eventId, orgId, policyName, slaSeconds } = job.data;
  const log = logger.child({ eventId, queue: SLA_QUEUE_NAME });

  log.info({ policyName, slaSeconds }, "SLA deadline reached, checking for completed review");

  // Check if a completed (non-system) review already exists for this event
  const completed = await db
    .select({ id: schema.humanReviews.id })
    .from(schema.humanReviews)
    .where(
      and(
        eq(schema.humanReviews.eventId, eventId),
        eq(schema.humanReviews.orgId, orgId)
      )
    )
    .limit(1);

  if (completed.length > 0) {
    // Review was completed within SLA — nothing to do
    log.info("Review already completed within SLA window — no escalation needed");
    return;
  }

  // No review found — insert an escalation record (Art. 14 SLA breach)
  const now = new Date();
  await db.insert(schema.humanReviews).values({
    orgId,
    eventId,
    reviewerId: "system",
    reviewerEmail: "system@clearagent.internal",
    reviewerRole: "system",
    action: "escalate",
    originalDecision: "unknown",
    overrideDecision: null,
    justification: `SLA breach: no human review completed within ${slaSeconds}s (policy: ${policyName}). Auto-escalated by ClearAgent. EU AI Act Art. 14.`,
    reviewRequestedAt: new Date(now.getTime() - slaSeconds * 1000),
    reviewCompletedAt: now,
    reviewSlaMs: slaSeconds * 1000,
    // contentHash binding: SHA-256 of the escalation record inputs (Art. 14 non-repudiation)
    contentHash: sha256(`system-escalation|${eventId}|${policyName}|${slaSeconds}|${now.toISOString()}`),
  });

  log.warn({ policyName, slaSeconds }, "SLA breach — escalation record inserted (Art. 14)");

  // Notify SSE subscribers of the SLA breach so the dashboard updates in real time
  try {
    const connectionString = process.env.DATABASE_URL ?? "postgresql://clearagent:clearagent@localhost:5432/clearagent";
    const notifyClient = postgres(connectionString, { max: 1 });
    await notifyClient.notify(
      "verification_events",
      JSON.stringify({ type: "sla_breach", eventId, orgId, policyName, slaSeconds })
    );
    await notifyClient.end();
  } catch (notifyErr) {
    // Non-critical — log but never let this block or fail the escalation record
    log.warn({ err: (notifyErr as Error).message }, "SLA breach pg_notify failed (non-critical)");
  }
}

export function startSlaWorker(redisConnection: IORedis): Worker<SlaJobData> {
  const isProd = process.env.NODE_ENV === "production";
  const worker = new Worker<SlaJobData>(SLA_QUEUE_NAME, processSlaEscalation, {
    connection: redisConnection,
    // SLA jobs are delayed — no benefit from high concurrency. 1 is sufficient.
    concurrency: isProd ? 1 : 3,
    // Poll every 5s when empty. SLA jobs are time-delayed so latency here is irrelevant.
    drainDelay: isProd ? 5000 : 300,
    stalledInterval: isProd ? 60_000 : 30_000,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "SLA job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "SLA job failed");
  });

  return worker;
}

export function createSlaQueue(redisConnection: IORedis): Queue<SlaJobData> {
  return new Queue<SlaJobData>(SLA_QUEUE_NAME, { connection: redisConnection });
}
