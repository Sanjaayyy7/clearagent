/**
 * Agent suspension tests (EU AI Act Art. 14 stop button)
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

async function pollJob(jobId: string): Promise<{ status: number; body: Record<string, unknown> }> {
  for (let i = 0; i < 30; i++) {
    const result = await api("GET", `/v1/jobs/${jobId}`);
    if (result.body["status"] === "completed" || result.body["status"] === "failed") return result;
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

describe("Agent suspension (Art. 14)", () => {
  let agentId: string;
  const externalId = `test-agent-${Date.now()}`;

  it("registers a new agent and returns status=active", async () => {
    const { status, body } = await api("POST", "/v1/agents/register", {
      name: "Suspension Test Agent",
      externalId,
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-6",
    });
    expect(status).toBe(201);
    expect(body["agentId"]).toBeDefined();
    expect(body["status"]).toBe("active");
    agentId = body["agentId"] as string;
  });

  it("suspends the agent and returns status=suspended", async () => {
    const { status, body } = await api("PATCH", `/v1/agents/${agentId}/status`, {
      status: "suspended",
    });
    expect(status).toBe(200);
    expect(body["status"]).toBe("suspended");
  });

  it("verify with suspended agentId returns 403 with code=agent_suspended", async () => {
    const { status, body } = await api("POST", "/v1/events/verify", {
      agentId,
      input: {
        amount: 500,
        currency: "USD",
        recipient: "Blocked Vendor",
        purpose: "This should be blocked by suspension",
      },
    });
    expect(status).toBe(403);
    const error = body["error"] as Record<string, unknown>;
    expect(error["code"]).toBe("agent_suspended");
  });

  it("reactivates the agent and returns status=active", async () => {
    const { status, body } = await api("PATCH", `/v1/agents/${agentId}/status`, {
      status: "active",
    });
    expect(status).toBe(200);
    expect(body["status"]).toBe("active");
  });

  it("verify after reactivation returns 202 and job completes", async () => {
    const { status, body } = await api("POST", "/v1/events/verify", {
      agentId,
      input: {
        amount: 300,
        currency: "USD",
        recipient: "Reactivated Vendor",
        purpose: "Verify after agent reactivation",
      },
    });
    expect(status).toBe(202);
    expect(body["jobId"]).toBeDefined();

    const jobResult = await pollJob(body["jobId"] as string);
    expect(jobResult.body["status"]).toBe("completed");
    expect(jobResult.body["eventId"]).toBeDefined();
  });
});
