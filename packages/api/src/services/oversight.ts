export type PolicyTriggerConditions = {
  confidence_below?: number;
  decision?: string;
};

export type OversightPolicy = {
  id: string;
  name: string;
  triggerConditions: PolicyTriggerConditions | Record<string, unknown>;
  reviewerRole: string;
};

/**
 * Evaluate oversight policies against a verification event.
 * When DB policies are provided (from the oversight_policies table), they are
 * evaluated first. Falls back to hardcoded defaults when no policies are supplied.
 */
export function evaluateOversightPolicies(
  params: { confidence: number | null; decision: string },
  policies?: OversightPolicy[]
): { requiresReview: boolean; reason?: string } {
  if (policies && policies.length > 0) {
    for (const policy of policies) {
      const cond = policy.triggerConditions as PolicyTriggerConditions;

      if (
        typeof cond.confidence_below === "number" &&
        params.confidence !== null &&
        params.confidence < cond.confidence_below
      ) {
        return {
          requiresReview: true,
          reason: `Policy "${policy.name}": confidence ${params.confidence} below threshold ${cond.confidence_below}`,
        };
      }

      if (typeof cond.decision === "string" && params.decision === cond.decision) {
        return {
          requiresReview: true,
          reason: `Policy "${policy.name}": decision "${params.decision}" matches trigger`,
        };
      }
    }

    // Safety net: flagged decisions always require review regardless of configured policies
    if (params.decision === "flagged") {
      return { requiresReview: true, reason: "Decision was flagged for review" };
    }

    return { requiresReview: false };
  }

  // Fallback: hardcoded defaults when no DB policies are available
  if (params.confidence !== null && params.confidence < 0.85) {
    return {
      requiresReview: true,
      reason: `Confidence score ${params.confidence} is below threshold 0.85`,
    };
  }

  if (params.decision === "flagged") {
    return {
      requiresReview: true,
      reason: "Decision was flagged for review",
    };
  }

  return { requiresReview: false };
}
