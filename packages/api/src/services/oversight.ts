/**
 * Evaluate oversight policies against a verification event.
 * For MVP: single hardcoded policy — confidence < 0.85 triggers review.
 */
export function evaluateOversightPolicies(params: {
  confidence: number | null;
  decision: string;
}): { requiresReview: boolean; reason?: string } {
  // Policy 1: Low confidence → requires human review
  if (params.confidence !== null && params.confidence < 0.85) {
    return {
      requiresReview: true,
      reason: `Confidence score ${params.confidence} is below threshold 0.85`,
    };
  }

  // Policy 2: Flagged decisions always require review
  if (params.decision === "flagged") {
    return {
      requiresReview: true,
      reason: "Decision was flagged for review",
    };
  }

  return { requiresReview: false };
}
