#!/usr/bin/env node

import { createServer } from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// HTTP health server — satisfies Railway healthcheck at /v1/health
// Runs alongside the stdio MCP transport (non-blocking)
const healthPort = parseInt(process.env.PORT ?? "3001", 10);
createServer((req, res) => {
  if (req.url === "/v1/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", service: "mcp-server", version: "0.2.0" }));
  }
  res.writeHead(404);
  res.end();
}).listen(healthPort, () => {
  process.stderr.write(`ClearAgent MCP health server on port ${healthPort}\n`);
});

const API_URL = (process.env["CLEARAGENT_API_URL"] ?? "http://localhost:3000").replace(/\/$/, "");
const API_KEY = process.env["CLEARAGENT_API_KEY"] ?? "";

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiCall(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({})) as Record<string, unknown>;
    const errObj = payload["error"] as Record<string, unknown> | undefined;
    throw new Error(
      (errObj?.["message"] as string | undefined) ?? `API error ${res.status}: ${res.statusText}`
    );
  }

  return res.json();
}

async function pollJob(
  jobId: string,
  maxAttempts = 30,
  intervalMs = 500
): Promise<{ eventId: string; requiresReview: boolean; contentHash: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await apiCall("GET", `/v1/jobs/${jobId}`) as Record<string, unknown>;

    if (job["status"] === "completed" && job["eventId"]) {
      const event = await apiCall("GET", `/v1/events/${job["eventId"]}`) as Record<string, unknown>;
      return {
        eventId: job["eventId"] as string,
        requiresReview: event["requiresReview"] as boolean,
        contentHash: event["contentHash"] as string,
      };
    }

    if (job["status"] === "failed") {
      throw new Error((job["error"] as string | undefined) ?? "Verification job failed");
    }

    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Job ${jobId} did not complete after ${maxAttempts} attempts`);
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "clearagent_verify",
    description:
      "Submit an AI agent decision for verification. Creates a tamper-evident, hash-chained audit trail entry (EU AI Act Art. 12). Returns a jobId — call clearagent_poll to retrieve the result.",
    inputSchema: {
      type: "object" as const,
      properties: {
        input: {
          type: "object",
          description: "The input the agent received (e.g. transaction details, request data)",
        },
        eventType: {
          type: "string",
          description: "Type of event (default: settlement_signal)",
          default: "settlement_signal",
        },
        eventCategory: {
          type: "string",
          description: "Category of decision (default: transaction)",
          default: "transaction",
        },
        sessionId: {
          type: "string",
          description: "UUID to group related events in a session",
        },
        parentEventId: {
          type: "string",
          description: "UUID of parent event for multi-step chains",
        },
      },
      required: ["input"],
    },
  },
  {
    name: "clearagent_poll",
    description:
      "Poll for the result of a verification job submitted via clearagent_verify. Returns the event ID, content hash, and whether human review is required (EU AI Act Art. 14).",
    inputSchema: {
      type: "object" as const,
      properties: {
        jobId: {
          type: "string",
          description: "The job ID returned by clearagent_verify",
        },
        maxAttempts: {
          type: "number",
          description: "Maximum polling attempts before timeout (default: 30)",
          default: 30,
        },
        intervalMs: {
          type: "number",
          description: "Milliseconds between poll attempts (default: 500)",
          default: 500,
        },
      },
      required: ["jobId"],
    },
  },
  {
    name: "clearagent_audit_integrity",
    description:
      "Verify the integrity of the ClearAgent hash chain. Recomputes the SHA-256 Merkle root over all events and reports whether any record has been tampered with (EU AI Act Art. 12 + 19).",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "clearagent_submit_review",
    description:
      "Submit a human review for a flagged verification event. Required when clearagent_poll returns requiresReview: true. Justification must be at least 10 characters (EU AI Act Art. 14 mandatory justification).",
    inputSchema: {
      type: "object" as const,
      properties: {
        eventId: {
          type: "string",
          description: "The event ID to review",
        },
        action: {
          type: "string",
          enum: ["approve", "reject", "override"],
          description: "The review decision",
        },
        justification: {
          type: "string",
          description:
            "Mandatory justification for the decision (minimum 10 characters — EU AI Act Art. 14)",
          minLength: 10,
        },
        reviewerId: {
          type: "string",
          description: "Identifier of the human reviewer",
        },
        reviewerEmail: {
          type: "string",
          description: "Email address of the human reviewer",
        },
        reviewerRole: {
          type: "string",
          description: "Role of the reviewer (e.g. compliance_officer, risk_manager)",
        },
        overrideDecision: {
          type: "string",
          description: "Required when action = override: the replacement decision",
        },
      },
      required: ["eventId", "action", "justification", "reviewerId", "reviewerEmail", "reviewerRole"],
    },
  },
];

// ─── Server setup ─────────────────────────────────────────────────────────────

const server = new Server(
  { name: "clearagent", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const toolArgs = args as Record<string, unknown>;

  try {
    switch (name) {
      case "clearagent_verify": {
        const result = await apiCall("POST", "/v1/events/verify", toolArgs) as Record<string, unknown>;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                jobId: result["jobId"],
                message: "Verification queued. Call clearagent_poll with this jobId to get the result.",
              }),
            },
          ],
        };
      }

      case "clearagent_poll": {
        const jobId = toolArgs["jobId"] as string;
        const maxAttempts = (toolArgs["maxAttempts"] as number | undefined) ?? 30;
        const intervalMs = (toolArgs["intervalMs"] as number | undefined) ?? 500;
        const result = await pollJob(jobId, maxAttempts, intervalMs);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                eventId: result.eventId,
                contentHash: result.contentHash,
                requiresReview: result.requiresReview,
                message: result.requiresReview
                  ? "Human review required (EU AI Act Art. 14). Call clearagent_submit_review with the eventId."
                  : "Verification complete. Decision is hash-chained in the immutable audit trail.",
              }),
            },
          ],
        };
      }

      case "clearagent_audit_integrity": {
        const result = await apiCall("GET", "/v1/audit/integrity") as Record<string, unknown>;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                validChain: result["validChain"],
                totalEvents: result["totalEvents"],
                merkleRoot: result["merkleRoot"],
                checkedAt: result["checkedAt"],
                brokenAt: result["brokenAt"] ?? null,
                message:
                  result["validChain"] === true
                    ? `Hash chain intact across ${result["totalEvents"]} events. Merkle root: ${result["merkleRoot"]}`
                    : `ALERT: Hash chain integrity violation detected at event ${result["brokenAt"]}`,
              }),
            },
          ],
        };
      }

      case "clearagent_submit_review": {
        const result = await apiCall("POST", "/v1/reviews", toolArgs) as Record<string, unknown>;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                reviewId: result["id"],
                action: result["action"],
                contentHash: result["contentHash"],
                message: `Human review logged (EU AI Act Art. 14). Review ID: ${result["id"]}. This decision is permanently recorded in the immutable audit trail.`,
              }),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        },
      ],
      isError: true,
    };
  }
});

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("ClearAgent MCP server v0.2.0 running on stdio\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
