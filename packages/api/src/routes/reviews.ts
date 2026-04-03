import { Router } from "express";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { sha256 } from "../services/hashChain.js";
import { logger } from "../logger.js";

const router = Router();

const reviewSchema = z.object({
  eventId: z.string().uuid(),
  action: z.enum(["approve", "reject", "override"]),
  // EU AI Act Art. 14: justification is mandatory — cannot be empty or whitespace
  justification: z
    .string()
    .min(1, "Justification is required (EU AI Act Art. 14)")
    .refine((v) => v.trim().length >= 10, {
      message: "Justification must be at least 10 characters (EU AI Act Art. 14)",
    }),
  reviewerId: z.string().min(1),
  reviewerEmail: z.string().email(),
  reviewerRole: z.string().min(1),
  overrideDecision: z.string().optional(),
});

// POST /v1/reviews — log a human review of an AI decision (Art. 14)
router.post("/", validate(reviewSchema), async (req, res, next) => {
  try {
    const body = req.body;

    // Look up the event
    const events = await db
      .select()
      .from(schema.verificationEvents)
      .where(eq(schema.verificationEvents.id, body.eventId));

    if (events.length === 0) {
      res.status(404).json({
        error: { code: "not_found", message: `Event ${body.eventId} not found` },
      });
      return;
    }

    const event = events[0];
    const now = new Date();

    // Compute content hash for immutability (hash of all review fields)
    const contentHash = sha256(
      [body.eventId, body.action, body.justification, body.reviewerId, body.reviewerEmail, now.toISOString()].join("|")
    );

    const [review] = await db
      .insert(schema.humanReviews)
      .values({
        orgId: event.orgId,
        eventId: body.eventId,
        reviewerId: body.reviewerId,
        reviewerEmail: body.reviewerEmail,
        reviewerRole: body.reviewerRole,
        action: body.action,
        originalDecision: event.decision,
        overrideDecision: body.overrideDecision ?? null,
        justification: body.justification,
        reviewRequestedAt: event.occurredAt,
        reviewCompletedAt: now,
        contentHash,
      })
      .returning();

    // EU-AI-ACT-GAP: Art. 14 — SLA timer is stored (reviewSlaMs) but not enforced; no escalation trigger on overdue reviews
    logger.info({ reviewId: review.id, eventId: body.eventId, action: body.action }, "Human review logged");

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

export { router as reviewsRouter };
