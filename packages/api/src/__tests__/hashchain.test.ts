/**
 * Hash chain integrity tests
 * Requires: docker compose up -d && npm run db:migrate && npm run seed && npm run dev
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env["API_URL"] || "http://localhost:3000";
const API_KEY = process.env["API_KEY"] || "ca_test_demo_key_clearagent_2026";

async function api(method: string, path: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function verifyAndPoll(input: Record<string, unknown>): Promise<string> {
  const { body: queued } = await api("POST", "/v1/events/verify", { input });
  expect(queued["jobId"]).toBeDefined();

  const jobId = queued["jobId"] as string;
  for (let i = 0; i < 30; i++) {
    const { body: job } = await api("GET", `/v1/jobs/${jobId}`);
    if (job["status"] === "completed" && job["eventId"]) return job["eventId"] as string;
    if (job["status"] === "failed") throw new Error(`Job failed: ${String(job["error"])}`);
    await new Promise<void>((r) => setTimeout(r, 500));
  }
  throw new Error("Job timed out");
}

beforeAll(async () => {
  const res = await fetch(`${BASE_URL}/v1/health`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error("API server not running. Start with: npm run dev");
  }
});

describe("Hash chain integrity", () => {
  it("integrity endpoint returns valid chain with at least one event", async () => {
    const { status, body } = await api("GET", "/v1/audit/integrity");
    expect(status).toBe(200);
    expect(body["validChain"]).toBe(true);
    expect(typeof body["totalEvents"]).toBe("number");
    expect(body["totalEvents"] as number).toBeGreaterThan(0);
    expect(body["merkleRoot"]).toBeTruthy();
  });

  it("new verification event has a valid 64-char SHA-256 contentHash", async () => {
    const eventId = await verifyAndPoll({
      amount: 100,
      currency: "EUR",
      recipient: "Hash Test Vendor",
      purpose: "Hash chain test event",
    });

    const { status, body } = await api("GET", `/v1/events/${eventId}`);
    expect(status).toBe(200);
    expect(body["contentHash"] as string).toMatch(/^[0-9a-f]{64}$/);
  });

  it("chain remains intact after submitting a second event", async () => {
    await verifyAndPoll({
      amount: 200,
      currency: "USD",
      recipient: "Chain Continuity Test",
      purpose: "Second event for chain continuity check",
    });

    const { status, body } = await api("GET", "/v1/audit/integrity");
    expect(status).toBe(200);
    expect(body["validChain"]).toBe(true);
  });
});
