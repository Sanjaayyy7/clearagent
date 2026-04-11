/**
 * Retention Auto-Purge Worker — EU AI Act Art. 19 / GDPR Art. 17
 *
 * Runs daily at 2:00 AM UTC via BullMQ repeat jobs.
 * Anonymises verification_events where retentionExpiresAt < NOW() by
 * replacing inputPayload and outputPayload with { "anonymized": true }.
 *
 * The hash chain structure (contentHash, prevHash) is preserved so
 * audit integrity checks remain valid. Only personal/sensitive payload
 * data is removed.
 *
 * The immutability trigger in migrate.ts allows this specific update pattern.
 */
import { Queue, Worker, type Job } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { db, schema } from "../db/index.js";
import { and, eq, lt, sql } from "drizzle-orm";
import { logger } from "../logger.js";

export const RETENTION_QUEUE_NAME = "retention-purge";

export interface RetentionJobData {
  triggeredAt: string;
}

const ANONYMIZED_PAYLOAD = { anonymized: true };

async function processRetentionPurge(job: Job<RetentionJobData>): Promise<void> {
  const log = logger.child({ queue: RETENTION_QUEUE_NAME, triggeredAt: job.data.triggeredAt });
  log.info("Starting retention purge");

  const now = new Date();

  // Find expired events (retentionExpiresAt < now AND not already anonymized)
  const expired = await db
    .select({ id: schema.verificationEvents.id, orgId: schema.verificationEvents.orgId })
    .from(schema.verificationEvents)
    .where(
      and(
        lt(schema.verificationEvents.retentionExpiresAt, now),
        // Skip already-anonymized events
        sql`${schema.verificationEvents.inputPayload}::text != '{"anonymized":true}'`
      )
    );

  if (expired.length === 0) {
    log.info("No expired events to anonymize");
    return;
  }

  log.info({ count: expired.length }, "Anonymizing expired events");

  // Process in batches of 100 to avoid long-running transactions
  const BATCH_SIZE = 100;
  let processed = 0;

  for (let i = 0; i < expired.length; i += BATCH_SIZE) {
    const batch = expired.slice(i, i + BATCH_SIZE);

    for (const event of batch) {
      try {
        // The immutability trigger allows this specific update when retentionExpiresAt < NOW()
        await db
          .update(schema.verificationEvents)
          .set({
            inputPayload: ANONYMIZED_PAYLOAD,
            outputPayload: ANONYMIZED_PAYLOAD,
          })
          .where(eq(schema.verificationEvents.id, event.id));
        processed++;
      } catch (err) {
        // Log but continue — don't fail the whole batch over one event
        log.error({ eventId: event.id, err }, "Failed to anonymize event");
      }
    }

    log.debug({ processed, total: expired.length }, "Batch anonymized");
  }

  // Log purge run to audit_exports for compliance evidence
  await db.insert(schema.auditExports).values({
    orgId: "system",
    exportType: "retention_purge",
    format: "json",
    filtersApplied: { type: "retention_purge", runAt: now.toISOString() },
    recordCount: processed,
    requestedBy: "system",
    requesterRole: "retention_worker",
    fileHash: `retention-purge-${now.toISOString()}`,
    fileSizeBytes: 0,
    storagePath: "system",
    completedAt: now,
  }).catch((err) => log.warn({ err }, "Failed to log purge to audit_exports — non-critical"));

  log.info({ processed, total: expired.length }, "Retention purge complete");
}

export function startRetentionWorker(redisConnection: IORedis): Worker<RetentionJobData> {
  const worker = new Worker<RetentionJobData>(RETENTION_QUEUE_NAME, processRetentionPurge, {
    connection: redisConnection,
    concurrency: 1, // Single-threaded — retention is a batch operation, not time-critical
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Retention purge job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Retention purge job failed");
  });

  return worker;
}

export function createRetentionQueue(redisConnection: IORedis): Queue<RetentionJobData> {
  return new Queue<RetentionJobData>(RETENTION_QUEUE_NAME, { connection: redisConnection });
}

/**
 * Schedule the daily 2:00 AM UTC retention purge job.
 * Call once at server startup.
 */
export async function scheduleRetentionPurge(redisConnection: IORedis): Promise<void> {
  const queue = createRetentionQueue(redisConnection);

  await queue.add(
    "daily-purge",
    { triggeredAt: new Date().toISOString() },
    {
      repeat: { pattern: "0 2 * * *" }, // 2:00 AM UTC daily (cron)
      attempts: 3,
      backoff: { type: "exponential", delay: 60000 }, // Retry after 1 min if failed
    }
  );

  logger.info("Retention purge scheduled: daily at 02:00 UTC");
}
