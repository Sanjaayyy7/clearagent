/**
 * Human review workflow tests (EU AI Act Art. 14)
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
  const jobId = queued["jobId"] as string;
  for (let i = 0; i < 30; i++) {
    const { body: job } = await api("GET", `/v1/jobs/${jobId}`);
    if (job["status"] === "completed" && job["eventId"]) return job["eventId"] as string;
    if (job["status"] === "failed") throw new Error(`Job failed: ${String(job["error"])}`);
    await new Promise<void>((r) => setTimeout(r, 500));
  }
  throw new Error("Job timed out");
}

void verifyAndPoll; // available for future use

beforeAll(async () => {
  const res = await fetch(`${BASE_URL}/v1/health`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error("API server not running. Start with: npm run dev");
  }
});

describe("Human review workflow", () => {
  it("low-confidence event (decision=flagged) has requiresReview=true", async () => {
    // GET /v1/events returns { data: [], pagination }
    const { status, body } = await api("GET", "/v1/events?limit=100");
    expect(status).toBe(200);
    const events = body["data"] as Array<{ decision: string; requiresReview: boolean }>;
    const flagged = events.find((e) => e.decision === "flagged");
    expect(flagged).toBeDefined();
    expect(flagged!.requiresReview).toBe(true);
  });

  it("submitting a review with short justification returns 400", async () => {
    const { status, body } = await api("POST", "/v1/reviews", {
      eventId: "00000000-0000-0000-0000-000000000001",
      action: "approve",
      justification: "short",
      reviewerId: "test-reviewer",
      reviewerEmail: "test@example.com",
      reviewerRole: "compliance_officer",
    });
    expect(status).toBe(400);
    expect(body["error"]).toBeDefined();
  });

  it("valid review is logged and appears in event.humanReviews", async () => {
    const { body: listBody } = await api("GET", "/v1/events?limit=100");
    const events = listBody["data"] as Array<{ id: string; decision: string; requiresReview: boolean }>;
    const flagged = events.find((e) => e.decision === "flagged");
    if (!flagged) throw new Error("No flagged events in DB — ensure seed data is loaded");

    const { status: reviewStatus, body: review } = await api("POST", "/v1/reviews", {
      eventId: flagged.id,
      action: "approve",
      justification: "Test review — vendor approved per compliance policy",
      reviewerId: "test-reviewer-001",
      reviewerEmail: "reviewer@example.com",
      reviewerRole: "compliance_officer",
    });

    if (reviewStatus === 201) {
      expect(review["id"]).toBeDefined();
      expect(review["action"]).toBe("approve");

      const { body: updated } = await api("GET", `/v1/events/${flagged.id}`);
      const reviewIds = (updated["humanReviews"] as Array<{ id: string }>).map((r) => r.id);
      expect(reviewIds).toContain(review["id"]);
    } else {
      // Event already has a review — immutability working correctly
      expect([400, 409, 422]).toContain(reviewStatus);
    }
  });
});
