import { Router } from "express";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

const router = Router();

// GET /v1/jobs/:jobId — poll verification job status
router.get("/:jobId", async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const results = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId));

    if (results.length === 0) {
      res.status(404).json({
        error: { code: "not_found", message: `Job ${jobId} not found` },
      });
      return;
    }

    const job = results[0];

    res.json({
      jobId: job.id,
      status: job.status,
      eventId: job.eventId ?? undefined,
      error: job.error ?? undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export { router as jobsRouter };
