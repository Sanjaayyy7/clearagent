/**
 * Oversight Policies API — EU AI Act Art. 14
 *
 * GET  /v1/policies     — list active oversight policies for the org
 * POST /v1/policies     — create a new oversight policy
 */
import { Router } from "express";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { and, eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { logger } from "../logger.js";

const router = Router();

const createPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  triggerConditions: z.object({
    confidence_below: z.number().min(0).max(1).optional(),
    decision: z.string().optional(),
  }),
  action: z.string().default("require_review"),
  reviewerRole: z.string().default("compliance_officer"),
  slaSeconds: z.number().int().min(60).max(86400).default(3600),
});

// GET /v1/policies — list active policies for org
router.get("/", async (req, res, next) => {
  try {
    const auth = (req as any).auth;

    const policies = await db
      .select()
      .from(schema.oversightPolicies)
      .where(
        and(
          eq(schema.oversightPolicies.orgId, auth.orgId),
          eq(schema.oversightPolicies.isActive, true)
        )
      )
      .orderBy(schema.oversightPolicies.createdAt);

    res.json({ policies });
  } catch (err) {
    next(err);
  }
});

// POST /v1/policies — create a new oversight policy
router.post("/", validate(createPolicySchema), async (req, res, next) => {
  try {
    const auth = (req as any).auth;
    const body = req.body;

    const [policy] = await db
      .insert(schema.oversightPolicies)
      .values({
        orgId: auth.orgId,
        name: body.name,
        description: body.description ?? null,
        triggerConditions: body.triggerConditions,
        action: body.action,
        reviewerRole: body.reviewerRole,
        slaSeconds: body.slaSeconds,
        isActive: true,
        createdBy: auth.orgId,
      })
      .returning();

    logger.info({ policyId: policy.id, name: policy.name, orgId: auth.orgId }, "Oversight policy created");

    res.status(201).json(policy);
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/policies/:policyId — deactivate a policy (soft delete)
router.delete("/:policyId", async (req, res, next) => {
  try {
    const auth = (req as any).auth;
    const { policyId } = req.params;

    const existing = await db
      .select({ id: schema.oversightPolicies.id })
      .from(schema.oversightPolicies)
      .where(
        and(
          eq(schema.oversightPolicies.id, policyId as string),
          eq(schema.oversightPolicies.orgId, auth.orgId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: { code: "not_found", message: `Policy ${policyId} not found` } });
      return;
    }

    await db
      .update(schema.oversightPolicies)
      .set({ isActive: false })
      .where(eq(schema.oversightPolicies.id, policyId as string));

    logger.info({ policyId, orgId: auth.orgId }, "Oversight policy deactivated");

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as policiesRouter };
