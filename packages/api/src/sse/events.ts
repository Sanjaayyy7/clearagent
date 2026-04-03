import type { Express } from "express";
import postgres from "postgres";
import { authMiddleware } from "../middleware/auth.js";
import { logger } from "../logger.js";

/**
 * Set up SSE endpoint for real-time verification event streaming.
 *
 * Uses PostgreSQL LISTEN/NOTIFY — the trigger is already wired in migrate.ts.
 *
 * MVP NOTE: Single shared PG listener — replace with
 * per-connection listeners or Redis pub/sub pre-launch.
 */
export function setupSSE(app: Express): void {
  const connectionString = process.env.DATABASE_URL || "postgresql://clearagent:clearagent@localhost:5432/clearagent";
  // Single dedicated connection for LISTEN (does not use the main pool)
  const listenerClient = postgres(connectionString, { max: 1 });

  app.get("/v1/events/stream", authMiddleware, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders();

    logger.info("SSE client connected");

    // Send initial connection confirmation
    res.write("data: {\"type\":\"connected\"}\n\n");

    // Keepalive ping every 15s to prevent proxy timeouts
    const ping = setInterval(() => {
      res.write(": ping\n\n");
    }, 15000);

    // Subscribe to PG NOTIFY channel
    // MVP NOTE: Single shared PG listener — replace with
    // per-connection listeners or Redis pub/sub pre-launch
    const listenRequest = listenerClient.listen("verification_events", (payload) => {
      res.write(`data: ${payload}\n\n`);
    });

    req.on("close", () => {
      clearInterval(ping);
      listenRequest.then((meta) => meta.unlisten()).catch(() => {});
      logger.info("SSE client disconnected");
    });
  });
}
