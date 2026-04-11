import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { Queue } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { eventsRouter } from "./routes/events.js";
import { jobsRouter } from "./routes/jobs.js";
import { reviewsRouter } from "./routes/reviews.js";
import { agentsRouter } from "./routes/agents.js";
import { auditRouter } from "./routes/audit.js";
import { authMiddleware } from "./middleware/auth.js";
import { db } from "./db/index.js";
import { schema } from "./db/index.js";
import { sql as sqlExpr, desc as descExpr } from "drizzle-orm";
import { startWorker, QUEUE_NAME } from "./workers/verify.worker.js";
import { startSlaWorker } from "./workers/sla.worker.js";
import { startRetentionWorker, scheduleRetentionPurge } from "./workers/retention.worker.js";
import { policiesRouter } from "./routes/policies.js";
import { complianceRouter } from "./routes/compliance.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { logger } from "./logger.js";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set — agent attestation endpoint will return 500");
}

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ─── Infrastructure ──────────────────────────────────────────
const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const verificationQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
});

app.set("verificationQueue", verificationQueue);

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limit_exceeded", message: "Too many requests, please retry after a minute" } },
});
app.use(limiter);

// Per-route rate limits (Story 1.2 — tighter caps on write endpoints)
const isTest = process.env.NODE_ENV === "test";
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limit_exceeded", message: "Too many verify requests, please retry after a minute" } },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limit_exceeded", message: "Too many register requests, please retry after a minute" } },
});
app.use("/v1/events/verify", verifyLimiter);
app.use("/v1/agents/register", registerLimiter);

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3001",
  process.env.DASHBOARD_URL,
  process.env.LANDING_URL,
  process.env.CORS_EXTRA_ORIGIN,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // curl / Railway health checks
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Request-ID"],
}));
app.use(express.json());
app.use(requestIdMiddleware);

// ─── Public routes ───────────────────────────────────────────
app.get("/v1/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "0.1.0",
    service: "clearagent-api",
    timestamp: new Date().toISOString(),
  });
});

// ─── Protected routes ────────────────────────────────────────
app.use("/v1/events", authMiddleware, eventsRouter);
app.use("/v1/jobs", authMiddleware, jobsRouter);
app.use("/v1/reviews", authMiddleware, reviewsRouter);
app.use("/v1/agents", authMiddleware, agentsRouter);
app.use("/v1/audit", authMiddleware, auditRouter);
app.use("/v1/policies", authMiddleware, policiesRouter);
app.use("/v1/compliance", authMiddleware, complianceRouter);

// ─── Public metrics (no auth) ────────────────────────────────
app.get("/v1/metrics", async (_req, res, next) => {
  try {
    const [eventRow] = await db.select({ count: sqlExpr<number>`count(*)::int` }).from(schema.verificationEvents);
    const [checkpoint] = await db.select({ merkleRoot: schema.integrityCheckpoints.merkleRoot }).from(schema.integrityCheckpoints).orderBy(descExpr(schema.integrityCheckpoints.checkpointAt)).limit(1);
    res.json({
      events: eventRow?.count ?? 0,
      chain: { merkleRoot: checkpoint?.merkleRoot ?? null },
      uptime: process.uptime(),
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Error handler ───────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "internal_error",
      message: "An unexpected error occurred",
    },
  });
});

// ─── Start ───────────────────────────────────────────────────
// Verify worker starts immediately — handles inbound requests
const worker = startWorker(redisConnection);

// SLA + retention workers deferred in production to reduce memory spike on boot
let slaWorker: ReturnType<typeof startSlaWorker>;
let retentionWorker: ReturnType<typeof startRetentionWorker>;

const SLA_DELAY = process.env.NODE_ENV === "production" ? 10_000 : 0;
const RETENTION_DELAY = process.env.NODE_ENV === "production" ? 20_000 : 0;

setTimeout(() => {
  slaWorker = startSlaWorker(redisConnection);
  logger.info("SLA enforcement worker started (Art. 14)");
}, SLA_DELAY);

setTimeout(() => {
  retentionWorker = startRetentionWorker(redisConnection);
  scheduleRetentionPurge(redisConnection).catch((err) => logger.warn({ err }, "Failed to schedule retention purge"));
  logger.info("Retention purge worker started (daily 02:00 UTC)");
}, RETENTION_DELAY);

app.listen(PORT, () => {
  logger.info({ port: PORT }, "ClearAgent API server running");
  logger.info(`Verification worker started (concurrency: ${process.env.NODE_ENV === "production" ? 2 : 5})`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await worker.close();
  if (slaWorker) await slaWorker.close();
  if (retentionWorker) await retentionWorker.close();
  await verificationQueue.close();
  await redisConnection.quit();
  process.exit(0);
});
