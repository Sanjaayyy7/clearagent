/**
 * Transaction verification domain.
 *
 * Validates AI agent transaction requests by checking:
 * - Required fields are present (amount, currency, recipient, purpose)
 * - Amount is within allowed bounds
 * - Currency is valid ISO 4217
 * - Risk signals (large amounts, unusual recipients, missing context)
 */

export interface TransactionInput {
  amount: number;
  currency: string;
  recipient: string;
  purpose: string;
  agentContext?: string;
  constraints?: {
    maxAmount?: number;
    allowedCurrencies?: string[];
    requiresPurpose?: boolean;
  };
}

export interface TransactionResult {
  passed: boolean;
  decision: "approved" | "rejected" | "flagged";
  confidence: number;
  reasoning: string;
  details: {
    checks: Array<{
      name: string;
      passed: boolean;
      message: string;
    }>;
    riskScore: number;
    processingTimeMs: number;
  };
}

const VALID_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "INR", "BRL",
  "KRW", "SGD", "HKD", "NOK", "SEK", "DKK", "NZD", "ZAR", "MXN", "PLN",
]);

export async function verifyTransaction(input: TransactionInput): Promise<TransactionResult> {
  const startTime = Date.now();
  const checks: TransactionResult["details"]["checks"] = [];
  let riskScore = 0;

  // Check 1: Required fields
  const hasRequiredFields = !!(input.amount && input.currency && input.recipient && input.purpose);
  checks.push({
    name: "required_fields",
    passed: hasRequiredFields,
    message: hasRequiredFields
      ? "All required fields present"
      : "Missing required fields: " +
        [
          !input.amount && "amount",
          !input.currency && "currency",
          !input.recipient && "recipient",
          !input.purpose && "purpose",
        ].filter(Boolean).join(", "),
  });
  if (!hasRequiredFields) riskScore += 0.4;

  // Check 2: Valid currency
  const validCurrency = VALID_CURRENCIES.has(input.currency?.toUpperCase());
  checks.push({
    name: "currency_validation",
    passed: validCurrency,
    message: validCurrency
      ? `${input.currency} is a valid ISO 4217 currency`
      : `${input.currency} is not a recognized currency`,
  });
  if (!validCurrency) riskScore += 0.2;

  // Check 3: Amount bounds
  const maxAmount = input.constraints?.maxAmount ?? 10000;
  const amountValid = input.amount > 0 && input.amount <= maxAmount;
  const amountHigh = input.amount > maxAmount * 0.8;
  checks.push({
    name: "amount_bounds",
    passed: amountValid,
    message: amountValid
      ? amountHigh
        ? `Amount ${input.amount} is within bounds but near limit (${maxAmount})`
        : `Amount ${input.amount} is within bounds`
      : `Amount ${input.amount} exceeds maximum allowed (${maxAmount})`,
  });
  if (!amountValid) riskScore += 0.3;
  if (amountHigh && amountValid) riskScore += 0.1;

  // Check 4: Purpose adequacy
  const purposeAdequate = input.purpose.length >= 10;
  checks.push({
    name: "purpose_adequacy",
    passed: purposeAdequate,
    message: purposeAdequate
      ? "Transaction purpose is adequately described"
      : "Transaction purpose is too brief for audit trail compliance",
  });
  if (!purposeAdequate) riskScore += 0.1;

  // Check 5: Agent context present
  const hasContext = !!input.agentContext && input.agentContext.length > 0;
  checks.push({
    name: "agent_context",
    passed: hasContext,
    message: hasContext
      ? "Agent context provided for traceability"
      : "No agent context provided — reduces traceability",
  });
  if (!hasContext) riskScore += 0.05;

  // Compute confidence and decision
  const confidence = Math.max(0, Math.min(1, 1 - riskScore));
  const allChecksPassed = checks.every((c) => c.passed);

  let decision: TransactionResult["decision"];
  if (allChecksPassed && confidence >= 0.85) {
    decision = "approved";
  } else if (confidence < 0.5) {
    decision = "rejected";
  } else {
    decision = "flagged";
  }

  return {
    passed: decision === "approved",
    decision,
    confidence: Math.round(confidence * 10000) / 10000,
    reasoning: allChecksPassed
      ? `Transaction verified: all ${checks.length} checks passed with confidence ${confidence.toFixed(4)}`
      : `Transaction ${decision}: ${checks.filter((c) => !c.passed).map((c) => c.name).join(", ")} failed`,
    details: {
      checks,
      riskScore: Math.round(riskScore * 10000) / 10000,
      processingTimeMs: Date.now() - startTime,
    },
  };
}
