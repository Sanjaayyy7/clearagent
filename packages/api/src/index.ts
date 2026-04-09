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
import { startWorker, QUEUE_NAME } from "./workers/verify.worker.js";
import { logger } from "./logger.js";

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
const _corsOrigins = process.env.CORS_ORIGINS;
app.use(cors({
  origin: _corsOrigins === "*" || !_corsOrigins
    ? "*"
    : _corsOrigins.split(",").map((o) => o.trim()),
  credentials: false,
}));
app.use(express.json());

// Request ID tracking
app.use((req, _res, next) => {
  (req as any).requestId = req.headers["x-request-id"] || crypto.randomUUID();
  next();
});

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
const worker = startWorker(redisConnection);

app.listen(PORT, () => {
  logger.info({ port: PORT }, "ClearAgent API server running");
  logger.info("Verification worker started (concurrency: 5)");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await worker.close();
  await verificationQueue.close();
  await redisConnection.quit();
  process.exit(0);
});
