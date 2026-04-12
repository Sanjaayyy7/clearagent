/**
 * Compliance Score API (EU AI Act Art. 12 / 14 / 19)
 * GET /v1/compliance/score — returns a 0-100 compliance score for the org
 */
import { Router } from "express";
import { db, schema } from "../db/index.js";
import { eq, and, gte, isNotNull, desc, sql, count } from "drizzle-orm";
import { logger } from "../logger.js";

const router = Router();

const ENFORCEMENT_DATE = new Date("2026-08-02T00:00:00.000Z");

function daysUntilEnforcement(): number {
  return Math.max(0, Math.ceil((ENFORCEMENT_DATE.getTime() - Date.now()) / 86_400_000));
}

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// Module-level cache: orgId → { result, cachedAt }
const scoreCache = new Map<string, { result: ComplianceScore; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface ComplianceScore {
  score: number;
  grade: string;
  status: "compliant" | "at_risk" | "non_compliant";
  breakdown: {
    article12: { score: number; max: number; gaps: string[] };
    article14: { score: number; max: number; gaps: string[] };
    article19: { score: number; max: number; gaps: string[] };
  };
  lastCalculated: string;
  daysToEnforcement: number;
}

async function computeScore(orgId: string): Promise<ComplianceScore> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  let art12Score = 35;
  let art14Score = 35;
  let art19Score = 30;
  const art12Gaps: string[] = [];
  const art14Gaps: string[] = [];
  const art19Gaps: string[] = [];

  // ─── Art. 12: Logging & Traceability ──────────────────────────

  // Check hash chain integrity (most recent checkpoint)
  const [latestCheckpoint] = await db
    .select()
    .from(schema.integrityCheckpoints)
    .where(eq(schema.integrityCheckpoints.orgId, orgId))
    .orderBy(desc(schema.integrityCheckpoints.checkpointAt))
    .limit(1);

  // No events in last 7 days — may indicate logging gap
  const [recentEventCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.verificationEvents)
    .where(
      and(
        eq(schema.verificationEvents.orgId, orgId),
        gte(schema.verificationEvents.recordedAt, sevenDaysAgo)
      )
    );

  if (!latestCheckpoint) {
    art12Score -= 20;
    art12Gaps.push("no_integrity_checkpoints");
  }

  if ((recentEventCount?.count ?? 0) === 0) {
    art12Score -= 5;
    art12Gaps.push("no_events_last_7d");
  }

  // RFC 3161 anchoring coverage
  const [anchoredCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.integrityCheckpoints)
    .where(
      and(
        eq(schema.integrityCheckpoints.orgId, orgId),
        isNotNull(schema.integrityCheckpoints.externalAnchor)
      )
    );

  const totalCheckpoints = latestCheckpoint ? 1 : 0; // simplified
  const [allCheckpointsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.integrityCheckpoints)
    .where(eq(schema.integrityCheckpoints.orgId, orgId));

  const rfc3161Coverage =
    (allCheckpointsCount?.count ?? 0) > 0
      ? (anchoredCount?.count ?? 0) / (allCheckpointsCount?.count ?? 1)
      : 0;

  if (rfc3161Coverage === 0) {
    art12Score -= 5;
    art12Gaps.push("rfc3161_not_anchored");
  } else if (rfc3161Coverage > 0.5) {
    art12Score += 5; // bonus
    // cap at max
    art12Score = Math.min(art12Score, 40);
  } else {
    art12Gaps.push("rfc3161_partial");
  }

  // ─── Art. 14: Human Oversight ────────────────────────────────

  // Count overdue reviews (requiresReview=true, no completed review)
  const overdueEvents = await db
    .select({ id: schema.verificationEvents.id })
    .from(schema.verificationEvents)
    .where(
      and(
        eq(schema.verificationEvents.orgId, orgId),
        eq(schema.verificationEvents.requiresReview, true),
        eq(schema.verificationEvents.status, "flagged")
      )
    )
    .limit(100);

  // Check which have no completed reviews (non-system)
  let overdueCount = 0;
  for (const ev of overdueEvents) {
    const [review] = await db
      .select({ id: schema.humanReviews.id })
      .from(schema.humanReviews)
      .where(
        and(
          eq(schema.humanReviews.eventId, ev.id),
          eq(schema.humanReviews.orgId, orgId)
        )
      )
      .limit(1);
    if (!review) overdueCount++;
  }

  if (overdueCount > 0) {
    art14Score -= 10;
    art14Gaps.push(`overdue_reviews_${overdueCount}`);
  }

  // SLA breaches in last 7 days (system-escalated reviews)
  const [slaBreach] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.humanReviews)
    .where(
      and(
        eq(schema.humanReviews.orgId, orgId),
        eq(schema.humanReviews.reviewerRole, "system"),
        gte(schema.humanReviews.reviewCompletedAt, sevenDaysAgo)
      )
    );

  if ((slaBreach?.count ?? 0) > 0) {
    art14Score -= 15;
    art14Gaps.push("sla_breaches_last_7d");
  }

  // Bonus: all reviews within SLA
  if (overdueCount === 0 && (slaBreach?.count ?? 0) === 0) {
    art14Score += 5;
    art14Score = Math.min(art14Score, 40);
  }

  // ─── Art. 19: Record Keeping ──────────────────────────────────

  // Last export within 30 days
  const [lastExport] = await db
    .select({ completedAt: schema.auditExports.completedAt })
    .from(schema.auditExports)
    .where(eq(schema.auditExports.orgId, orgId))
    .orderBy(desc(schema.auditExports.completedAt))
    .limit(1);

  if (!lastExport || !lastExport.completedAt || lastExport.completedAt < thirtyDaysAgo) {
    art19Score -= 10;
    art19Gaps.push("no_export_last_30d");
  }

  // XML export available (always true if implemented)
  art19Score += 5; // bonus — XML support exists
  art19Score = Math.min(art19Score, 35);

  // ─── Final score ──────────────────────────────────────────────

  const art12Final = Math.max(0, art12Score);
  const art14Final = Math.max(0, art14Score);
  const art19Final = Math.max(0, art19Score);

  const total = art12Final + art14Final + art19Final;
  const score = Math.min(100, Math.max(0, total));

  const status: ComplianceScore["status"] =
    score >= 80 ? "compliant" : score >= 60 ? "at_risk" : "non_compliant";

  logger.debug({ orgId, score, art12: art12Final, art14: art14Final, art19: art19Final }, "Compliance score calculated");

  return {
    score,
    grade: gradeFromScore(score),
    status,
    breakdown: {
      article12: { score: art12Final, max: 40, gaps: art12Gaps },
      article14: { score: art14Final, max: 40, gaps: art14Gaps },
      article19: { score: art19Final, max: 35, gaps: art19Gaps },
    },
    lastCalculated: now.toISOString(),
    daysToEnforcement: daysUntilEnforcement(),
  };
}

// GET /v1/compliance/score
router.get("/score", async (req, res, next) => {
  try {
    const auth = (req as any).auth;
    const orgId: string = auth.orgId;

    const cached = scoreCache.get(orgId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return res.json(cached.result);
    }

    const result = await computeScore(orgId);
    scoreCache.set(orgId, { result, cachedAt: Date.now() });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as complianceRouter };
