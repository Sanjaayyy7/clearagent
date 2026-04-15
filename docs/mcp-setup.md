# ClearAgent MCP Server Setup

Connect Claude Desktop or any MCP-compatible AI client to ClearAgent for real-time agent verification and audit trail access.

## Prerequisites

- Node.js 18+
- A ClearAgent account and API key ([get one](https://clearagent.ai))
- Claude Desktop (or another MCP host)

## Quick Start (npx — no install required)

```bash
npx @clearagent/mcp-server
```

Set env vars before running:

```bash
CLEARAGENT_API_URL=https://your-api.railway.app \
CLEARAGENT_API_KEY=ca_live_... \
npx @clearagent/mcp-server
```

## Claude Desktop Integration

Add to your Claude Desktop config at `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "clearagent": {
      "command": "npx",
      "args": ["@clearagent/mcp-server"],
      "env": {
        "CLEARAGENT_API_URL": "https://your-api.railway.app",
        "CLEARAGENT_API_KEY": "ca_live_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see "clearagent" in the tools panel.

## Claude Code Integration

Run in your terminal:

```bash
claude mcp add clearagent \
  -e CLEARAGENT_API_URL=https://your-api.railway.app \
  -e CLEARAGENT_API_KEY=ca_live_your_key_here \
  -- npx @clearagent/mcp-server
```

## Available Tools

Once connected, Claude can use these tools:

| Tool | Description |
|------|-------------|
| `clearagent_verify` | Submit an AI agent decision for verification. Creates a hash-chained audit trail entry (Art. 12). Returns a `jobId`. |
| `clearagent_poll` | Poll for the result of a verification job. Returns `eventId`, `contentHash`, and whether human review is required (Art. 14). |
| `clearagent_audit_integrity` | Verify hash chain integrity. Recomputes the SHA-256 Merkle root and reports whether any record has been tampered with (Art. 12 + 19). |
| `clearagent_submit_review` | Submit a human review for a flagged event. Justification must be at least 10 characters (Art. 14). |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLEARAGENT_API_URL` | Yes | Base URL of your ClearAgent API deployment |
| `CLEARAGENT_API_KEY` | Yes | API key (format: `ca_live_...` or `ca_test_...`) |
| `PORT` | No | Health server port (default: 3001). Railway sets this automatically. |

## Example Usage in Claude

After connecting, ask Claude:

> "Use clearagent_verify to log that our procurement agent just approved a $50,000 contract with supplier XYZ — include the full reasoning."

> "Run clearagent_audit_integrity to check whether our hash chain is intact."

> "Use clearagent_submit_review to approve event abc-123 — the decision was correct and within policy."

## Health Check

The MCP server exposes a health endpoint for Railway/deployment monitoring:

```bash
curl http://localhost:3001/v1/health
# {"status":"ok","service":"mcp-server","version":"0.2.0"}
```

## Troubleshooting

**"API key invalid"** — Check that `CLEARAGENT_API_KEY` starts with `ca_` and matches a key created in your ClearAgent dashboard.

**"Connection refused"** — Verify `CLEARAGENT_API_URL` points to your running API service (no trailing slash).

**Tools not appearing in Claude Desktop** — Restart Claude Desktop after editing the config file. Check logs at `~/Library/Logs/Claude/`.
