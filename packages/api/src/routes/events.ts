import { Router } from "express";
import { z } from "zod";
import { Queue } from "bullmq";
import postgres from "postgres";
import { db, schema } from "../db/index.js";
import { eq, desc, and, gte, lte, sql, lt, or, asc } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { QUEUE_NAME, type VerificationJobData } from "../workers/verify.worker.js";
import { logger } from "../logger.js";
import { nanoid } from "nanoid";

// Shared PG LISTEN connection for SSE
// MVP NOTE: Single shared PG listener — replace with per-connection listeners or Redis pub/sub pre-launch
const sseListenerClient = postgres(
  process.env.DATABASE_URL || "postgresql://clearagent:clearagent@localhost:5432/clearagent",
  { max: 1 }
);

const router = Router();

// Zod schema for verification request
const verifySchema = z.object({
  eventType: z.string().default("settlement_signal"),
  eventCategory: z.string().default("transaction"),
  input: z.object({
    amount: z.number().positive(),
    currency: z.string().min(3).max(3),
    recipient: z.string().min(1),
    purpose: z.string().min(1),
    agentContext: z.string().optional(),
    constraints: z
      .object({
        maxAmount: z.number().positive().optional(),
        allowedCurrencies: z.array(z.string()).optional(),
        requiresPurpose: z.boolean().optional(),
      })
      .optional(),
  }),
  agentId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  parentEventId: z.string().uuid().optional(),
  sequenceNum: z.number().int().nonnegative().default(0),
});

// POST /v1/events/verify — submit a verification event
router.post("/verify", validate(verifySchema), async (req, res, next) => {
  try {
    const body = req.body;
    const auth = (req as any).auth;
    const orgId: string = auth.orgId;

    // Fetch org for retention config
    const org = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
    if (org.length === 0) {
      res.status(500).json({
        error: { code: "org_not_found", message: "Organization not found for this API key" },
      });
      return;
    }
    const retentionDays = org[0].dataRetentionDays;

    // Resolve agent: org-level keys may target any org agent; agent-bound keys may only target themselves.
    const authenticatedAgentId = auth?.agentId as string | undefined;

    let agentId: string;
    if (body.agentId) {
      const specificAgent = await db.select().from(schema.agents).where(eq(schema.agents.id, body.agentId)).limit(1);
      if (specificAgent.length === 0) {
        res.status(404).json({ error: { code: "not_found", message: `Agent ${body.agentId} not found` } });
        return;
      }
      if (specificAgent[0].orgId !== orgId) {
        res.status(404).json({ error: { code: "not_found", message: `Agent ${body.agentId} not found` } });
        return;
      }
      if (specificAgent[0].status === "suspended") {
        res.status(403).json({
          error: { code: "agent_suspended", message: "Agent is suspended and cannot submit verification events" },
        });
        return;
      }
      if (authenticatedAgentId && body.agentId !== authenticatedAgentId) {
        res.status(403).json({
          error: {
            code: "agent_mismatch",
            message: "Authenticated API key cannot submit events for a different agent",
          },
        });
        return;
      }
      agentId = specificAgent[0].id;
    } else if (authenticatedAgentId) {
      const boundAgent = await db.select().from(schema.agents).where(eq(schema.agents.id, authenticatedAgentId)).limit(1);
      if (boundAgent.length === 0) {
        res.status(401).json({
          error: { code: "invalid_api_key", message: "Authenticated API key is not linked to a valid agent" },
        });
        return;
      }
      if (boundAgent[0].status === "suspended") {
        res.status(403).json({
          error: { code: "agent_suspended", message: "Agent is suspended and cannot submit verification events" },
        });
        return;
      }
      agentId = boundAgent[0].id;
    } else {
      const defaultAgent = await db.select().from(schema.agents).orderBy(schema.agents.registeredAt).limit(1);
      if (defaultAgent.length === 0) {
        res.status(500).json({
          error: { code: "not_seeded", message: "Database not seeded. Run: npm run seed" },
        });
        return;
      }
      // Check agent is not suspended (Art. 14 stop button)
      if (defaultAgent[0].status === "suspended") {
        res.status(403).json({
          error: { code: "agent_suspended", message: "Agent is suspended and cannot submit verification events" },
        });
        return;
      }
      agentId = defaultAgent[0].id;
    }

    // Create job record
    const jobId = nanoid();
    await db.insert(schema.jobs).values({ id: jobId, orgId, status: "queued" });

    // Enqueue for async verification
    const queue = (req.app.get("verificationQueue") as Queue);
    const jobData: VerificationJobData = {
      jobId,
      orgId,
      agentId,
      eventType: body.eventType,
      eventCategory: body.eventCategory,
      inputPayload: body.input,
      sessionId: body.sessionId,
      parentEventId: body.parentEventId,
      sequenceNum: body.sequenceNum,
      retentionDays,
    };

    await queue.add("verify", jobData, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    });

    logger.info({ jobId }, "Verification job created and queued");

    res.status(202).json({
      jobId,
      message: "Verification queued. Poll GET /v1/jobs/:jobId for result.",
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/events/stream — real-time SSE stream of verified events
// MUST be defined before /:id to avoid "stream" being caught as an ID
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  logger.info("SSE client connected");
  res.write("data: {\"type\":\"connected\"}\n\n");

  const ping = setInterval(() => res.write(": ping\n\n"), 15000);

  const listenRequest = sseListenerClient.listen("verification_events", (payload) => {
    res.write(`data: ${payload}\n\n`);
  });

  req.on("close", () => {
    clearInterval(ping);
    listenRequest.then((meta) => meta.unlisten()).catch(() => {});
    logger.info("SSE client disconnected");
  });
});

// GET /v1/events/:id — get event details
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const auth = (req as any).auth;

    const events = await db
      .select()
      .from(schema.verificationEvents)
      .where(and(eq(schema.verificationEvents.id, id), eq(schema.verificationEvents.orgId, auth.orgId)));

    if (events.length === 0) {
      res.status(404).json({
        error: { code: "not_found", message: `Event ${id} not found` },
      });
      return;
    }

    const event = events[0];

    // Also fetch linked human reviews
    const reviews = await db
      .select()
      .from(schema.humanReviews)
      .where(eq(schema.humanReviews.eventId, id))
      .orderBy(asc(schema.humanReviews.reviewCompletedAt));

    res.json({
      ...event,
      humanReviews: reviews,
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/events — list events with filters and optional cursor pagination
router.get("/", async (req, res, next) => {
  try {
    const auth = (req as any).auth;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const { agent_id, status, from, to, cursor } = req.query;

    const conditions = [eq(schema.verificationEvents.orgId, auth.orgId)];
    if (agent_id) conditions.push(eq(schema.verificationEvents.agentId, agent_id as string));
    if (status) conditions.push(eq(schema.verificationEvents.status, status as string));
    if (from) conditions.push(gte(schema.verificationEvents.occurredAt, new Date(from as string)));
    if (to) conditions.push(lte(schema.verificationEvents.occurredAt, new Date(to as string)));

    // Cursor pagination: cursor is base64-encoded JSON { recordedAt, id }
    if (cursor) {
      const decoded = JSON.parse(Buffer.from(cursor as string, "base64").toString("utf8"));
      conditions.push(
        or(
          lt(schema.verificationEvents.recordedAt, new Date(decoded.recordedAt)),
          and(
            eq(schema.verificationEvents.recordedAt, new Date(decoded.recordedAt)),
            lt(schema.verificationEvents.id, decoded.id)
          )
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const events = await db
      .select()
      .from(schema.verificationEvents)
      .where(where)
      .orderBy(desc(schema.verificationEvents.recordedAt), desc(schema.verificationEvents.id))
      .limit(limit)
      .offset(cursor ? 0 : offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.verificationEvents)
      .where(where);

    // Build next cursor from last result
    const nextCursor =
      events.length === limit
        ? Buffer.from(
            JSON.stringify({ recordedAt: events[events.length - 1].recordedAt, id: events[events.length - 1].id })
          ).toString("base64")
        : null;

    res.json({
      data: events,
      pagination: {
        total: count,
        limit,
        offset: cursor ? undefined : offset,
        hasMore: cursor ? nextCursor !== null : offset + limit < count,
        nextCursor,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as eventsRouter };
