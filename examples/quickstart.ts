/**
 * ClearAgent Quickstart
 *
 * Demonstrates the full verification lifecycle:
 * register agent → verify decision → poll result → check integrity
 *
 * Prerequisites:
 *   docker compose up -d
 *   npm run db:migrate && npm run seed
 *   npm run dev          (in a separate terminal)
 *
 * Run:
 *   npx tsx examples/quickstart.ts
 */

import ClearAgentClient from "../packages/sdk/src/index.js";

const ca = new ClearAgentClient({
  apiKey: process.env["CLEARAGENT_API_KEY"] ?? "ca_test_demo_key_clearagent_2026",
  baseUrl: process.env["CLEARAGENT_API_URL"] ?? "http://localhost:3000",
});

async function main(): Promise<void> {
  console.log("ClearAgent Quickstart\n");

  // 1. Register an agent
  console.log("1. Registering agent...");
  const agent = await ca.agents.register({
    name: "Quickstart Demo Agent",
    externalId: `quickstart-${Date.now()}`,
    modelProvider: "anthropic",
    modelId: "claude-sonnet-4-6",
    description: "Demo agent for quickstart example",
  });
  console.log(`   ✓ Agent registered: ${agent.agentId}`);
  console.log(`   Status: ${agent.status}\n`);

  // 2. Submit a verification event
  console.log("2. Submitting verification event...");
  const { jobId } = await ca.events.verify({
    input: {
      amount: 1500,
      currency: "USD",
      recipient: "Acme Supplier Ltd",
      purpose: "Q2 software license renewal invoice INV-2026-0312",
    },
  });
  console.log(`   ✓ Job queued: ${jobId}\n`);

  // 3. Poll for the result
  console.log("3. Polling for result...");
  const result = await ca.jobs.poll(jobId, { maxAttempts: 30, intervalMs: 500 });
  console.log(`   ✓ Verification complete`);
  console.log(`   Event ID:       ${result.eventId}`);
  console.log(`   Content hash:   ${result.contentHash}`);
  console.log(`   Requires review: ${result.requiresReview}\n`);

  // 4. If review required, submit one
  if (result.requiresReview) {
    console.log("4. Human review required — submitting review...");
    const review = await ca.reviews.submit({
      eventId: result.eventId,
      action: "approve",
      justification: "Vendor is on approved supplier list. Amount within Q2 budget allocation.",
      reviewerId: "quickstart-reviewer",
      reviewerEmail: "reviewer@example.com",
      reviewerRole: "compliance_officer",
    });
    console.log(`   ✓ Review submitted: ${review.id}`);
    console.log(`   Action: ${review.action}\n`);
  } else {
    console.log("4. No human review required — decision auto-approved\n");
  }

  // 5. Check audit integrity
  console.log("5. Checking hash chain integrity...");
  const integrity = await ca.audit.integrity();
  console.log(`   ✓ Chain valid: ${integrity.validChain}`);
  console.log(`   Total events: ${integrity.totalEvents}`);
  console.log(`   Merkle root:  ${integrity.merkleRoot}\n`);

  // 6. List recent events
  console.log("6. Listing recent events...");
  const { events } = await ca.events.list({ limit: 5 });
  for (const event of events) {
    const conf = event.confidence !== null ? (Number(event.confidence) * 100).toFixed(1) + "%" : "n/a";
    console.log(`   [${event.decision.padEnd(8)}] conf=${conf.padStart(6)} hash=${event.contentHash.slice(0, 16)}...`);
  }

  console.log("\n✅ ClearAgent quickstart complete");
}

main().catch((err: unknown) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
