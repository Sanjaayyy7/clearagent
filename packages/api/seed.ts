import "dotenv/config";
import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./src/db/schema.js";
import { computeInputHash, computeContentHash } from "./src/services/hashChain.js";
import { evaluateOversightPolicies } from "./src/services/oversight.js";

const client = postgres(process.env.DATABASE_URL || "postgresql://clearagent:clearagent@localhost:5432/clearagent");
const db = drizzle(client, { schema });

const RECIPIENTS = [
  "Acme Cloud Services", "DataStream Analytics", "SecureVault Storage",
  "QuickPay Solutions", "Bright AI Labs", "NexGen Infrastructure",
  "CloudFort Security", "Pixel Design Co", "Quantum Computing Inc",
  "Green Energy Corp",
];

const PURPOSES = [
  "Monthly cloud infrastructure subscription payment",
  "Quarterly data analytics platform license renewal",
  "Annual security audit and compliance certification",
  "One-time integration consulting fee for API setup",
  "Recurring ML model training compute allocation",
  "Enterprise SaaS subscription with priority support",
  "Vendor invoice for hardware procurement and setup",
  "Legal services retainer for regulatory compliance review",
  "Marketing platform annual subscription with analytics",
  "Database hosting and managed backup services",
];

const AGENT_CONTEXTS = [
  "Automated procurement agent handling vendor payments per approved budget",
  "Finance automation agent processing recurring subscription renewals",
  "Expense management agent clearing approved purchase orders",
  "Treasury agent executing scheduled intercompany transfers",
  "AP automation agent processing verified invoices from procurement queue",
];

const REVIEW_JUSTIFICATIONS = {
  approve: [
    "Vendor contract pre-approved by board; payment is within contracted terms",
    "Amount verified against PO-2026-0441; vendor in good standing",
    "Finance director pre-authorized this vendor tier; proceeding with approval",
    "Cross-referenced with approved budget allocation; within limits",
  ],
  reject: [
    "Unable to verify vendor legitimacy; additional due diligence required before payment",
    "Amount exceeds quarterly budget cap; requires CFO sign-off before proceeding",
  ],
  override: [
    "Board resolution 2026-Q1-7 pre-authorizes payments to this vendor up to $50k; approving",
    "Emergency procurement authorized by CTO under incident response protocol; override approved",
    "Year-end reconciliation payment; finance team has verified all supporting documents",
    "Vendor is on pre-approved list under EU framework contract; confidence threshold override",
    "Internal audit confirmed invoice validity; payment delayed by system flag, override justified",
  ],
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(max: number = 9000): number {
  const ranges = [
    { min: 10, max: 500, weight: 0.4 },
    { min: 500, max: 5000, weight: 0.3 },
    { min: 5000, max: max, weight: 0.3 },
  ];
  const r = Math.random();
  let cumWeight = 0;
  for (const range of ranges) {
    cumWeight += range.weight;
    if (r <= cumWeight) {
      return Math.round((range.min + Math.random() * (range.max - range.min)) * 100) / 100;
    }
  }
  return 100;
}

function makeEventDate(daysAgo: number, hourOffset: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(Math.floor(Math.random() * 10) + 8 + hourOffset, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function computeVerification(input: {
  amount: number; currency: string; recipient: string; purpose: string;
  agentContext?: string; constraints: { maxAmount: number };
}) {
  const maxAmount = input.constraints.maxAmount;
  let riskScore = 0;
  if (input.amount > maxAmount) riskScore += 0.3;
  if (input.amount > maxAmount * 0.8) riskScore += 0.1;
  if (!["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"].includes(input.currency)) riskScore += 0.2;
  if (!input.agentContext) riskScore += 0.05;
  if (input.purpose.length < 10) riskScore += 0.1;

  const confidence = Math.round(Math.max(0, Math.min(1, 1 - riskScore)) * 10000) / 10000;
  const allPassed = riskScore === 0 || (input.amount <= maxAmount && riskScore < 0.15);

  let decision: string;
  if (allPassed && confidence >= 0.85) decision = "approved";
  else if (confidence < 0.5) decision = "rejected";
  else decision = "flagged";

  return { confidence, decision, riskScore };
}

async function seed() {
  console.log("Seeding ClearAgent database (Week 2 enhanced)...\n");

  // 1. Organization
  const [org] = await db.insert(schema.organizations).values({
    name: "ClearAgent Demo",
    euAiActRiskClass: "high",
    dataRetentionDays: 3650,
  }).returning();
  console.log(`  Organization: ${org.name} (${org.id})`);

  // 2. Three agents: active procurement, active risk, suspended legacy
  const [procurementAgent] = await db.insert(schema.agents).values({
    orgId: org.id,
    externalId: "demo-procurement-agent",
    name: "Procurement Agent v2.1",
    description: "Automated procurement and payment verification agent",
    modelProvider: "anthropic",
    modelId: "claude-sonnet-4-6",
    riskClass: "high",
    status: "active",
  }).returning();

  const [riskAgent] = await db.insert(schema.agents).values({
    orgId: org.id,
    externalId: "demo-risk-agent",
    name: "Risk Assessment Agent v1.0",
    description: "High-value transaction risk assessment agent",
    modelProvider: "anthropic",
    modelId: "claude-opus-4-6",
    riskClass: "high",
    status: "active",
  }).returning();

  const [legacyAgent] = await db.insert(schema.agents).values({
    orgId: org.id,
    externalId: "demo-legacy-agent",
    name: "Legacy Payment Agent v0.9 (SUSPENDED)",
    description: "Decommissioned agent — suspended after audit finding",
    modelProvider: "openai",
    modelId: "gpt-4",
    riskClass: "high",
    status: "suspended",
  }).returning();

  console.log(`  Agent 1 (active):    ${procurementAgent.name}`);
  console.log(`  Agent 2 (active):    ${riskAgent.name}`);
  console.log(`  Agent 3 (suspended): ${legacyAgent.name}`);

  const demoApiKey = process.env.DEMO_API_KEY || "ca_test_demo_key_clearagent_2026";
  await db.insert(schema.apiKeys).values({
    orgId: org.id,
    agentId: null,  // org-level key — allows submitting events for any agent within the org
    keyHash: await bcrypt.hash(demoApiKey, 10),
    keyPrefix: demoApiKey.slice(0, 12),
    lastFour: demoApiKey.slice(-4),
    label: "Seeded demo API key",
    isTest: true,
  });
  console.log(`  Demo API key seeded: ${demoApiKey.slice(0, 12)}…${demoApiKey.slice(-4)}`);

  // 3. Oversight policy
  const [policy] = await db.insert(schema.oversightPolicies).values({
    orgId: org.id,
    name: "Low Confidence Review",
    description: "Require human review when confidence score is below 0.85",
    triggerConditions: { confidence_below: 0.85 },
    action: "require_review",
    reviewerRole: "compliance_officer",
    slaSeconds: 3600,
    isActive: true,
    createdBy: "system",
  }).returning();
  console.log(`  Policy: ${policy.name}\n`);

  // 4. Generate verification events (hash chain maintained across all events)
  console.log("  Generating 80 verification events...");
  let prevHash: string | null = null;
  let approved = 0, flagged = 0, rejected = 0;

  // Helper to insert a verification event and maintain hash chain
  async function insertEvent(params: {
    agentId: string;
    input: { amount: number; currency: string; recipient: string; purpose: string; agentContext?: string; constraints: { maxAmount: number } };
    occurredAt: Date;
    sequenceNum: number;
  }) {
    const { confidence, decision, riskScore } = computeVerification(params.input);
    const inputHash = computeInputHash(params.input);
    const outputPayload = {
      passed: decision === "approved",
      decision,
      confidence,
      reasoning: decision === "approved"
        ? `Transaction verified: all checks passed with confidence ${confidence}`
        : `Transaction ${decision}: risk score ${riskScore.toFixed(4)}`,
      details: { riskScore: Math.round(riskScore * 10000) / 10000 },
    };

    const contentHash = computeContentHash({
      inputHash,
      outputPayload,
      decision,
      occurredAt: params.occurredAt.toISOString(),
    });

    const oversight = evaluateOversightPolicies({ confidence, decision });
    const retentionExpiresAt = new Date(params.occurredAt);
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + org.dataRetentionDays);
    const status = decision === "approved" ? "verified" : decision === "rejected" ? "failed" : "flagged";

    if (decision === "approved") approved++;
    else if (decision === "rejected") rejected++;
    else flagged++;

    const [event] = await db.insert(schema.verificationEvents).values({
      orgId: org.id,
      agentId: params.agentId,
      eventType: "settlement_signal",
      eventCategory: "transaction",
      inputHash,
      inputPayload: params.input,
      outputPayload,
      decision,
      confidence: confidence.toString(),
      reasoning: outputPayload.reasoning,
      sequenceNum: params.sequenceNum,
      euAiActArticles: ["12", "14", "19"],
      contentHash,
      prevHash,
      occurredAt: params.occurredAt,
      retentionExpiresAt,
      status,
      requiresReview: oversight.requiresReview,
    }).returning();

    prevHash = contentHash;
    return event;
  }

  // ── 60 normal events from procurement agent (spread over last 30 days) ──
  for (let i = 0; i < 60; i++) {
    await insertEvent({
      agentId: procurementAgent.id,
      input: {
        amount: randomAmount(9000), // max 9000 so confidence stays near 1.0 for most
        currency: Math.random() > 0.05 ? "USD" : randomChoice(["EUR", "GBP", "JPY", "XYZ"]),
        recipient: randomChoice(RECIPIENTS),
        purpose: randomChoice(PURPOSES),
        agentContext: Math.random() > 0.2 ? randomChoice(AGENT_CONTEXTS) : undefined,
        constraints: { maxAmount: 10000 },
      },
      occurredAt: makeEventDate(Math.floor(Math.random() * 30)),
      sequenceNum: i,
    });
  }

  // ── 5 full compliance loop events (risk agent, low confidence → flagged → human override) ──
  // These are the showpiece demo events: day 7–14 ago
  const complianceLoopEvents = [];
  for (let i = 0; i < 5; i++) {
    const event = await insertEvent({
      agentId: riskAgent.id,
      input: {
        amount: 12000 + i * 3000, // all > 10000 → riskScore 0.4 → confidence 0.6
        currency: "USD",
        recipient: RECIPIENTS[i],
        purpose: PURPOSES[i],
        agentContext: randomChoice(AGENT_CONTEXTS),
        constraints: { maxAmount: 10000 },
      },
      occurredAt: makeEventDate(14 - i * 2), // day 14, 12, 10, 8, 6 ago
      sequenceNum: 60 + i,
    });
    complianceLoopEvents.push(event);
  }

  // ── 15 more low-confidence events from procurement agent ──
  // These have confidence < 0.85 but no human review yet (pending oversight)
  const lowConfidenceUnreviewed = [];
  for (let i = 0; i < 15; i++) {
    const event = await insertEvent({
      agentId: procurementAgent.id,
      input: {
        amount: 10500 + i * 500, // all > 10000 → low confidence
        currency: "USD",
        recipient: randomChoice(RECIPIENTS),
        purpose: randomChoice(PURPOSES),
        agentContext: randomChoice(AGENT_CONTEXTS),
        constraints: { maxAmount: 10000 },
      },
      occurredAt: makeEventDate(Math.floor(Math.random() * 7)), // last 7 days
      sequenceNum: 65 + i,
    });
    lowConfidenceUnreviewed.push(event);
  }

  console.log(`    ${approved} approved, ${flagged} flagged, ${rejected} rejected`);
  console.log(`    Total: 80 events`);
  console.log(`    Low-confidence events (requires_review): ${complianceLoopEvents.length + lowConfidenceUnreviewed.length}`);

  // 5. Human reviews
  console.log("\n  Generating human reviews...");

  // 5a. 5 compliance loop overrides (the showpiece events)
  for (let i = 0; i < 5; i++) {
    const event = complianceLoopEvents[i];
    const justification = REVIEW_JUSTIFICATIONS.override[i];
    const reviewedAt = new Date(event.occurredAt);
    reviewedAt.setHours(reviewedAt.getHours() + 2 + i); // reviewed 2-6 hours after event

    const { sha256 } = await import("./src/services/hashChain.js");
    const contentHash = sha256(
      [event.id, "override", justification, `compliance-officer-${i + 1}`, `co${i + 1}@clearagent.io`, reviewedAt.toISOString()].join("|")
    );

    await db.insert(schema.humanReviews).values({
      orgId: org.id,
      eventId: event.id,
      reviewerId: `compliance-officer-${i + 1}`,
      reviewerEmail: `co${i + 1}@clearagent.io`,
      reviewerRole: "compliance_officer",
      action: "override",
      originalDecision: event.decision,
      overrideDecision: "approved",
      justification,
      reviewRequestedAt: event.occurredAt,
      reviewCompletedAt: reviewedAt,
      reviewSlaMs: (2 + i) * 60 * 60 * 1000,
      contentHash,
    });
  }

  // 5b. 3 approve reviews on unreviewed low-confidence events
  for (let i = 0; i < 3; i++) {
    const event = lowConfidenceUnreviewed[i];
    const justification = REVIEW_JUSTIFICATIONS.approve[i];
    const reviewedAt = new Date(event.occurredAt);
    reviewedAt.setHours(reviewedAt.getHours() + 1);

    const { sha256 } = await import("./src/services/hashChain.js");
    const contentHash = sha256(
      [event.id, "approve", justification, "senior-reviewer", "sr@clearagent.io", reviewedAt.toISOString()].join("|")
    );

    await db.insert(schema.humanReviews).values({
      orgId: org.id,
      eventId: event.id,
      reviewerId: "senior-reviewer",
      reviewerEmail: "sr@clearagent.io",
      reviewerRole: "compliance_officer",
      action: "approve",
      originalDecision: event.decision,
      justification,
      reviewRequestedAt: event.occurredAt,
      reviewCompletedAt: reviewedAt,
      reviewSlaMs: 60 * 60 * 1000,
      contentHash,
    });
  }

  // 5c. 2 reject reviews on unreviewed low-confidence events
  for (let i = 0; i < 2; i++) {
    const event = lowConfidenceUnreviewed[3 + i];
    const justification = REVIEW_JUSTIFICATIONS.reject[i];
    const reviewedAt = new Date(event.occurredAt);
    reviewedAt.setHours(reviewedAt.getHours() + 3);

    const { sha256 } = await import("./src/services/hashChain.js");
    const contentHash = sha256(
      [event.id, "reject", justification, "risk-manager", "rm@clearagent.io", reviewedAt.toISOString()].join("|")
    );

    await db.insert(schema.humanReviews).values({
      orgId: org.id,
      eventId: event.id,
      reviewerId: "risk-manager",
      reviewerEmail: "rm@clearagent.io",
      reviewerRole: "risk_manager",
      action: "reject",
      originalDecision: event.decision,
      justification,
      reviewRequestedAt: event.occurredAt,
      reviewCompletedAt: reviewedAt,
      reviewSlaMs: 3 * 60 * 60 * 1000,
      contentHash,
    });
  }

  console.log("    5 override reviews (full compliance loop)");
  console.log("    3 approve reviews");
  console.log("    2 reject reviews");
  console.log("    Total: 10 human reviews");

  console.log("\nSeed complete.");
  console.log("  Demo summary:");
  console.log(`    - ${approved + flagged + rejected} verification events from 3 agents`);
  console.log(`    - 20 low-confidence events (confidence < 0.85) → requires_review: true`);
  console.log(`    - 10 human reviews logged (5 override, 3 approve, 2 reject)`);
  console.log(`    - 5 full compliance loop events ready to demo`);
  console.log(`    - 1 suspended agent (demo-legacy-agent) → 403 on verify`);

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
