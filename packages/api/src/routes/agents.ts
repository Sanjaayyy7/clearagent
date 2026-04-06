import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { logger } from "../logger.js";
import { nanoid } from "nanoid";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  externalId: z.string().min(1),
  modelProvider: z.string().optional(),
  modelId: z.string().optional(),
  description: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["active", "suspended", "flagged"]),
});

// GET /v1/agents — list all registered agents
router.get("/", async (_req, res, next) => {
  try {
    const agents = await db.select().from(schema.agents).orderBy(schema.agents.registeredAt);
    res.json({ agents });
  } catch (err) {
    next(err);
  }
});

// POST /v1/agents/register — register a new AI agent under compliance oversight
router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const body = req.body;

    // For MVP: use the single demo org
    const orgs = await db.select().from(schema.organizations).limit(1);
    if (orgs.length === 0) {
      res.status(500).json({ error: { code: "not_seeded", message: "Database not seeded. Run: npm run seed" } });
      return;
    }

    const orgId = orgs[0].id;

    // Create agent
    const [agent] = await db
      .insert(schema.agents)
      .values({
        orgId,
        externalId: body.externalId,
        name: body.name,
        description: body.description ?? null,
        modelProvider: body.modelProvider ?? null,
        modelId: body.modelId ?? null,
        status: "active",
      })
      .returning();

    // Generate API key (show raw once, store hash)
    const rawKey = `ca_live_${nanoid(32)}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.slice(0, 12); // "ca_live_xxxx"
    const lastFour = rawKey.slice(-4);

    await db.insert(schema.apiKeys).values({
      orgId,
      agentId: agent.id,
      keyHash,
      keyPrefix,
      lastFour,
      label: `${body.name} key`,
      isTest: false,
    });

    logger.info({ agentId: agent.id, externalId: body.externalId }, "Agent registered");

    res.status(201).json({
      agentId: agent.id,
      apiKey: rawKey, // Shown once — not stored in plaintext
      status: agent.status,
      registeredAt: agent.registeredAt,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/agents/:agentId/status — update agent status (EU AI Act Art. 14 stop button)
router.patch("/:agentId/status", validate(updateStatusSchema), async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;

    const agents = await db.select().from(schema.agents).where(eq(schema.agents.id, agentId as string));

    if (agents.length === 0) {
      res.status(404).json({ error: { code: "not_found", message: `Agent ${agentId} not found` } });
      return;
    }

    const [updated] = await db
      .update(schema.agents)
      .set({ status })
      .where(eq(schema.agents.id, agentId as string))
      .returning();

    logger.info({ agentId, status }, "Agent status updated");

    res.json({
      agentId: updated.id,
      status: updated.status,
      name: updated.name,
    });
  } catch (err) {
    next(err);
  }
});

export { router as agentsRouter };
