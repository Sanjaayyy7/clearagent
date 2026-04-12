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
| `verify_agent_action` | Submit an agent action for cryptographic verification and audit logging |
| `get_audit_trail` | Retrieve the tamper-evident event chain for an agent |
| `check_compliance_score` | Get real-time EU AI Act compliance score (Art. 12/14/19) |
| `list_pending_reviews` | List agent decisions awaiting human review |
| `approve_review` | Approve or reject a flagged agent decision |
| `get_agent_status` | Check registration and suspension status of an agent |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLEARAGENT_API_URL` | Yes | Base URL of your ClearAgent API deployment |
| `CLEARAGENT_API_KEY` | Yes | API key (format: `ca_live_...` or `ca_test_...`) |
| `PORT` | No | Health server port (default: 3001). Railway sets this automatically. |

## Example Usage in Claude

After connecting, ask Claude:

> "Use ClearAgent to verify that our procurement agent just approved a $50,000 contract with supplier XYZ — log the decision with full reasoning."

> "Show me the compliance score for our AI systems and what gaps need fixing before the August 2026 EU AI Act deadline."

> "List all agent decisions flagged for human review in the last 24 hours."

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
