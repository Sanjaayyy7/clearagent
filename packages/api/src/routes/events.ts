import { Router } from "express";
import { z } from "zod";
import { Queue } from "bullmq";
import { db, schema } from "../db/index.js";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { computeInputHash } from "../services/hashChain.js";
import { QUEUE_NAME, type VerificationJobData } from "../workers/verify.worker.js";
import { logger } from "../logger.js";

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
  sessionId: z.string().uuid().optional(),
  parentEventId: z.string().uuid().optional(),
  sequenceNum: z.number().int().nonnegative().default(0),
});

// POST /v1/events/verify — submit a verification event
router.post("/verify", validate(verifySchema), async (req, res, next) => {
  try {
    const body = req.body;
    const auth = (req as any).auth;

    // Get demo org/agent from DB
    const org = await db.select().from(schema.organizations).limit(1);
    const agent = await db.select().from(schema.agents).limit(1);

    if (org.length === 0 || agent.length === 0) {
      res.status(500).json({
        error: { code: "not_seeded", message: "Database not seeded. Run: npm run seed" },
      });
      return;
    }

    const orgId = org[0].id;
    const agentId = agent[0].id;
    const retentionDays = org[0].dataRetentionDays;

    // Compute input hash
    const inputHash = computeInputHash(body.input);

    // Calculate retention expiry
    const retentionExpiresAt = new Date();
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + retentionDays);

    // Insert pending event
    const [event] = await db
      .insert(schema.verificationEvents)
      .values({
        orgId,
        agentId,
        eventType: body.eventType,
        eventCategory: body.eventCategory,
        inputHash,
        inputPayload: body.input,
        decision: "pending",
        confidence: null,
        sessionId: body.sessionId || undefined,
        parentEventId: body.parentEventId || undefined,
        sequenceNum: body.sequenceNum,
        contentHash: "pending",
        occurredAt: new Date(),
        retentionExpiresAt,
        status: "pending",
      })
      .returning();

    // Enqueue for async verification
    const queue = (req.app.get("verificationQueue") as Queue);
    const jobData: VerificationJobData = {
      eventId: event.id,
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

    logger.info({ eventId: event.id }, "Verification event created and queued");

    res.status(202).json({
      id: event.id,
      status: "pending",
      message: "Verification queued. Poll GET /v1/events/:id for result.",
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/events/:id — get event details
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const events = await db
      .select()
      .from(schema.verificationEvents)
      .where(eq(schema.verificationEvents.id, id));

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
      .where(eq(schema.humanReviews.eventId, id));

    res.json({
      ...event,
      humanReviews: reviews,
    });
  } catch (err) {
    next(err);
  }
});

// GET /v1/events — list events with filters
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
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
      .orderBy(desc(schema.verificationEvents.recordedAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.verificationEvents)
      .where(where);

    res.json({
      data: events,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as eventsRouter };
