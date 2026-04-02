import "dotenv/config";
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

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(): number {
  const ranges = [
    { min: 10, max: 500, weight: 0.4 },
    { min: 500, max: 5000, weight: 0.3 },
    { min: 5000, max: 15000, weight: 0.2 },
    { min: 15000, max: 50000, weight: 0.1 },
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

async function seed() {
  console.log("Seeding ClearAgent database...\n");

  // 1. Create organization
  const [org] = await db.insert(schema.organizations).values({
    name: "ClearAgent Demo",
    euAiActRiskClass: "high",
    dataRetentionDays: 3650,
  }).returning();
  console.log(`  Organization: ${org.name} (${org.id})`);

  // 2. Create agent
  const [agent] = await db.insert(schema.agents).values({
    orgId: org.id,
    externalId: "demo-procurement-agent",
    name: "Procurement Agent v2.1",
    description: "Automated procurement and payment verification agent",
    modelProvider: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    riskClass: "high",
    status: "active",
  }).returning();
  console.log(`  Agent: ${agent.name} (${agent.id})`);

  // 3. Create oversight policy
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
  console.log(`  Policy: ${policy.name}`);

  // 4. Create 60 verification events across the last 30 days
  console.log("\n  Generating verification events...");
  let prevHash: string | null = null;
  let approved = 0;
  let flagged = 0;
  let rejected = 0;

  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const occurredAt = new Date();
    occurredAt.setDate(occurredAt.getDate() - daysAgo);
    occurredAt.setHours(Math.floor(Math.random() * 12) + 8); // 8am-8pm

    const amount = randomAmount();
    const maxAmount = 10000;
    const currency = Math.random() > 0.05 ? "USD" : randomChoice(["EUR", "GBP", "JPY", "XYZ"]);

    const input = {
      amount,
      currency,
      recipient: randomChoice(RECIPIENTS),
      purpose: randomChoice(PURPOSES),
      agentContext: Math.random() > 0.2 ? randomChoice(AGENT_CONTEXTS) : undefined,
      constraints: { maxAmount },
    };

    // Simulate verification result
    let riskScore = 0;
    if (amount > maxAmount) riskScore += 0.3;
    if (amount > maxAmount * 0.8) riskScore += 0.1;
    if (!["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"].includes(currency)) riskScore += 0.2;
    if (!input.agentContext) riskScore += 0.05;
    if (input.purpose.length < 10) riskScore += 0.1;

    const confidence = Math.max(0, Math.min(1, 1 - riskScore));
    const allPassed = riskScore === 0 || (amount <= maxAmount && riskScore < 0.15);

    let decision: string;
    if (allPassed && confidence >= 0.85) {
      decision = "approved";
      approved++;
    } else if (confidence < 0.5) {
      decision = "rejected";
      rejected++;
    } else {
      decision = "flagged";
      flagged++;
    }

    const inputHash = computeInputHash(input);
    const outputPayload = {
      passed: decision === "approved",
      decision,
      confidence: Math.round(confidence * 10000) / 10000,
      reasoning: decision === "approved"
        ? `Transaction verified: all checks passed with confidence ${confidence.toFixed(4)}`
        : `Transaction ${decision}: risk score ${riskScore.toFixed(4)}`,
      details: { riskScore: Math.round(riskScore * 10000) / 10000 },
    };

    const contentHash = computeContentHash({
      inputHash,
      outputPayload,
      decision,
      occurredAt: occurredAt.toISOString(),
    });

    const oversight = evaluateOversightPolicies({ confidence, decision });

    const retentionExpiresAt = new Date(occurredAt);
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + org.dataRetentionDays);

    const status = decision === "approved" ? "verified" : decision === "rejected" ? "failed" : "flagged";

    await db.insert(schema.verificationEvents).values({
      orgId: org.id,
      agentId: agent.id,
      eventType: "settlement_signal",
      eventCategory: "transaction",
      inputHash,
      inputPayload: input,
      outputPayload,
      decision,
      confidence: confidence.toString(),
      reasoning: outputPayload.reasoning,
      sequenceNum: i,
      euAiActArticles: ["12", "14", "19"],
      contentHash,
      prevHash,
      occurredAt,
      retentionExpiresAt,
      status,
      requiresReview: oversight.requiresReview,
    });

    prevHash = contentHash;
  }

  console.log(`    ${approved} approved, ${flagged} flagged, ${rejected} rejected`);
  console.log(`    Total: 60 events\n`);

  console.log("Seed complete.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
