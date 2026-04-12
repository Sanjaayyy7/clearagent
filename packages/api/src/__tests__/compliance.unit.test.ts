/**
 * Unit tests for the compliance score calculation (EU AI Act Art. 12 / 14 / 19).
 * Self-contained — no database or running server required.
 *
 * NOTE ON SCORING: Bonuses push the uncapped sum above 100 (max = 115).
 * The global cap at 100 means comparing totals across variants is unreliable
 * when those variants still hit the cap. Tests compare article sub-scores
 * directly and construct specific inputs to produce predictable totals.
 */

import { describe, it, expect } from "vitest";
import { scoreFromInputs, type ScoringInputs } from "../routes/compliance.js";

/** Fully-compliant baseline. Uncapped sum = 115, final score = 100. */
const BASELINE: ScoringInputs = {
  hasCheckpoint: true,
  recentEventCount: 10,
  rfc3161Coverage: 0.8,   // >0.5 → RFC 3161 bonus (+5 to art12)
  overdueReviewCount: 0,
  slaBreachCount: 0,
  hasRecentExport: true,
};

// ─── Baseline: perfect score ─────────────────────────────────────────────────

describe("scoreFromInputs — baseline", () => {
  it("returns score=100 and grade=A when all inputs are compliant", () => {
    const result = scoreFromInputs(BASELINE);
    expect(result.score).toBe(100);
    expect(result.grade).toBe("A");
    expect(result.status).toBe("compliant");
  });

  it("reports no gaps when fully compliant", () => {
    const result = scoreFromInputs(BASELINE);
    expect(result.breakdown.article12.gaps).toHaveLength(0);
    expect(result.breakdown.article14.gaps).toHaveLength(0);
    expect(result.breakdown.article19.gaps).toHaveLength(0);
  });

  it("art12 reaches max of 40 with rfc3161 bonus", () => {
    // 35 base + 5 bonus (coverage > 0.5) = 40
    expect(scoreFromInputs(BASELINE).breakdown.article12.score).toBe(40);
  });

  it("art14 reaches max of 40 with oversight bonus", () => {
    // 35 base + 5 bonus (no overdue, no breach) = 40
    expect(scoreFromInputs(BASELINE).breakdown.article14.score).toBe(40);
  });

  it("art19 reaches max of 35 with xml bonus", () => {
    // 30 base + 5 xml bonus = 35
    expect(scoreFromInputs(BASELINE).breakdown.article19.score).toBe(35);
  });
});

// ─── Art. 12: hash chain integrity ───────────────────────────────────────────

describe("scoreFromInputs — Art. 12 gaps", () => {
  it("deducts 20 pts from art12 sub-score when no integrity checkpoint exists", () => {
    // No checkpoint: 35 - 20 = 15, then rfc3161 bonus +5 → art12 = 20
    const result = scoreFromInputs({ ...BASELINE, hasCheckpoint: false });
    expect(result.breakdown.article12.score).toBe(20);
    expect(result.breakdown.article12.gaps).toContain("no_integrity_checkpoints");
  });

  it("deducts 5 pts from art12 sub-score when no events logged in last 7 days", () => {
    // 35 - 5 = 30, then rfc3161 bonus +5 → art12 = 35
    const result = scoreFromInputs({ ...BASELINE, recentEventCount: 0 });
    expect(result.breakdown.article12.score).toBe(35);
    expect(result.breakdown.article12.gaps).toContain("no_events_last_7d");
  });

  it("deducts 5 pts from art12 sub-score when rfc3161 not anchored", () => {
    // 35 - 5 (penalty) = 30 (no bonus)
    const result = scoreFromInputs({ ...BASELINE, rfc3161Coverage: 0 });
    expect(result.breakdown.article12.score).toBe(30);
    expect(result.breakdown.article12.gaps).toContain("rfc3161_not_anchored");
  });

  it("partial rfc3161 coverage adds neither bonus nor penalty", () => {
    // 35 (base only, partial = no bonus/no penalty)
    const result = scoreFromInputs({ ...BASELINE, rfc3161Coverage: 0.3 });
    expect(result.breakdown.article12.score).toBe(35);
    expect(result.breakdown.article12.gaps).toContain("rfc3161_partial");
  });

  it("caps art12 score at 40", () => {
    expect(scoreFromInputs(BASELINE).breakdown.article12.score).toBeLessThanOrEqual(40);
  });
});

// ─── Art. 14: human oversight ────────────────────────────────────────────────

describe("scoreFromInputs — Art. 14 gaps", () => {
  it("deducts 10 pts from art14 sub-score when overdue reviews exist", () => {
    // 35 - 10 = 25 (no bonus since overdueCount > 0)
    const result = scoreFromInputs({ ...BASELINE, overdueReviewCount: 3 });
    expect(result.breakdown.article14.score).toBe(25);
    expect(result.breakdown.article14.gaps).toContain("overdue_reviews_3");
  });

  it("deducts 15 pts from art14 sub-score when SLA breaches occurred in last 7 days", () => {
    // 35 - 15 = 20 (no bonus since slaBreachCount > 0)
    const result = scoreFromInputs({ ...BASELINE, slaBreachCount: 2 });
    expect(result.breakdown.article14.score).toBe(20);
    expect(result.breakdown.article14.gaps).toContain("sla_breaches_last_7d");
  });

  it("deducts 25 pts from art14 when both overdue reviews and SLA breaches exist", () => {
    // 35 - 10 - 15 = 10 (no bonus)
    const result = scoreFromInputs({ ...BASELINE, overdueReviewCount: 1, slaBreachCount: 1 });
    expect(result.breakdown.article14.score).toBe(10);
  });

  it("caps art14 score at 40", () => {
    expect(scoreFromInputs(BASELINE).breakdown.article14.score).toBeLessThanOrEqual(40);
  });
});

// ─── Art. 19: record keeping ──────────────────────────────────────────────────

describe("scoreFromInputs — Art. 19 gaps", () => {
  it("deducts 10 pts from art19 sub-score when no export in last 30 days", () => {
    // 30 - 10 = 20, then xml bonus +5 → 25
    const result = scoreFromInputs({ ...BASELINE, hasRecentExport: false });
    expect(result.breakdown.article19.score).toBe(25);
    expect(result.breakdown.article19.gaps).toContain("no_export_last_30d");
  });

  it("caps art19 score at 35", () => {
    expect(scoreFromInputs(BASELINE).breakdown.article19.score).toBeLessThanOrEqual(35);
  });
});

// ─── Status thresholds ────────────────────────────────────────────────────────

describe("scoreFromInputs — status thresholds", () => {
  it("status=compliant when score >= 80", () => {
    const result = scoreFromInputs(BASELINE);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.status).toBe("compliant");
  });

  it("status=at_risk when score is 60-79", () => {
    // art12: 35 - 20 (no checkpoint) = 15 (partial rfc3161, no bonus/penalty)
    // art14: 35 - 10 (overdue)       = 25 (no bonus)
    // art19: 30 + 5 (xml bonus)      = 35
    // total = 15 + 25 + 35 = 75 → at_risk
    const result = scoreFromInputs({
      hasCheckpoint: false,
      recentEventCount: 5,
      rfc3161Coverage: 0.3,   // partial — no bonus, no penalty
      overdueReviewCount: 1,
      slaBreachCount: 0,
      hasRecentExport: true,
    });
    expect(result.score).toBe(75);
    expect(result.status).toBe("at_risk");
  });

  it("status=non_compliant when score < 60", () => {
    // art12: 35 - 20 - 5 - 5 = 5 (no checkpoint, no events, no anchor)
    // art14: 35 - 10 - 15   = 10 (overdue + sla breach)
    // art19: 30 - 10 + 5    = 25 (no export + xml bonus)
    // total = 5 + 10 + 25 = 40 → non_compliant
    const result = scoreFromInputs({
      hasCheckpoint: false,
      recentEventCount: 0,
      rfc3161Coverage: 0,
      overdueReviewCount: 2,
      slaBreachCount: 1,
      hasRecentExport: false,
    });
    expect(result.score).toBe(40);
    expect(result.status).toBe("non_compliant");
  });

  it("score never goes below 0", () => {
    const worst = scoreFromInputs({
      hasCheckpoint: false,
      recentEventCount: 0,
      rfc3161Coverage: 0,
      overdueReviewCount: 100,
      slaBreachCount: 100,
      hasRecentExport: false,
    });
    expect(worst.score).toBeGreaterThanOrEqual(0);
  });
});
