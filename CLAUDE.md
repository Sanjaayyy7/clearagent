# ClearAgent

AI agent verification and audit trail platform. Compliance infrastructure for EU AI Act Articles 12, 14, and 19.

## Stack

- **API:** TypeScript · Express · Zod · Pino
- **Queue:** BullMQ · Redis 7
- **Database:** PostgreSQL 16 · Drizzle ORM
- **Dashboard:** React 18 · Vite · Tailwind CSS
- **Infra:** Docker Compose (dev) · npm workspaces

## Project Structure

```
packages/
  api/          Express API + BullMQ worker (port 3000)
  dashboard/    React dashboard (port 5173)
  sdk/          TypeScript SDK (in development)
  mcp-server/   MCP protocol server (planned)
  landing/      Marketing landing page
```

## Dev Commands

```bash
docker compose up -d            # Start PostgreSQL + Redis
npm run db:migrate              # Run Drizzle migrations
npm run seed                    # Seed 80 events, 10 reviews
npm run dev                     # Start API server (port 3000)
npm run dev:dashboard           # Start dashboard (port 5173)
npm run build                   # Build all packages
npm run db:generate             # Regenerate migrations after schema change
```

## Database Schema (9 tables)

| Table | Purpose | Mutable? |
|-------|---------|---------|
| `organizations` | Tenant root, retention config | Yes |
| `agents` | AI agents under oversight | Yes (status only) |
| `api_keys` | API key storage (bcrypt hash) | Yes (revoke) |
| `verification_events` | Core audit log | **NO — append-only** |
| `human_reviews` | Human oversight decisions | **NO — append-only** |
| `oversight_policies` | Rules that trigger required reviews | Yes |
| `audit_exports` | Record of every compliance export | **NO — append-only** |
| `jobs` | Async job tracking | Yes (status updates) |
| `integrity_checkpoints` | Periodic Merkle root snapshots | Yes |

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/health` | — | Health check |
| POST | `/v1/events/verify` | ✓ | Submit verification event |
| GET | `/v1/events` | ✓ | List events (cursor pagination) |
| GET | `/v1/events/:id` | ✓ | Event detail + linked reviews |
| GET | `/v1/events/stream` | ✓ | Real-time SSE stream |
| GET | `/v1/jobs/:jobId` | ✓ | Poll async job |
| POST | `/v1/reviews` | ✓ | Submit human review (Art. 14) |
| GET | `/v1/audit/integrity` | ✓ | Hash chain + Merkle root |
| GET | `/v1/audit/export` | ✓ | Compliance export (Art. 19) |
| POST | `/v1/agents/register` | ✓ | Register agent |
| PATCH | `/v1/agents/:id/status` | ✓ | Suspend/flag agent |

Auth: `Authorization: Bearer <key>` or `?api_key=<key>` (SSE only supports query param).  
Demo key: `ca_test_demo_key_clearagent_2026`

## Hash Chain Algorithm

```
inputHash    = SHA-256(JSON.stringify(input))
contentHash  = SHA-256(inputHash | canonicalJson(output) | decision | occurredAt)
prevHash     = contentHash of the previous event for this org (null for first event)
merkleRoot   = binary Merkle tree over all contentHash values
```

Canonical JSON: sorted-key serialization to survive PostgreSQL JSONB field reordering.

## Immutability Rules — Never Bypass

**`verification_events` is append-only. This is non-negotiable.**

- A PostgreSQL trigger (`enforce_ve_immutability`) raises an exception on ANY UPDATE
- A PostgreSQL rule discards ALL DELETE attempts
- `human_reviews` is also fully immutable (rules block UPDATE + DELETE)
- Do not use raw SQL, `db.$client`, or migrations to bypass these protections
- Any PR that weakens immutability will be rejected

These constraints exist because the EU AI Act requires tamper-evident audit logs. Weakening immutability breaks the compliance guarantee that ClearAgent exists to provide.

## Oversight Policy Logic

Events trigger `requiresReview = true` when:
- `confidence < 0.85` (configurable via `oversight_policies`)
- `decision === "flagged"`

Human review (`POST /v1/reviews`) is then required. The `justification` field is mandatory (≥10 chars).

## Known Compliance Gaps

| Gap | Status |
|-----|--------|
| Retention enforcement | `retention_expires_at` is set but auto-purge not implemented |
| XML export | Only JSON export available; some regulators require XML |
| RFC 3161 timestamp anchoring | `integrity_checkpoints` table exists; external anchoring not implemented |

## EU AI Act Context

- **Art. 12** — Logging and traceability: hash chain, append-only events
- **Art. 14** — Human oversight: review workflow, mandatory justification, stop button
- **Art. 19** — Record keeping: audit export with file hash
- **Enforcement deadline:** August 2026
- **Penalty:** Up to 4% of global annual revenue

## SDK Usage

```typescript
import ClearAgentClient from "@clearagent/sdk";
// or during development:
import ClearAgentClient from "./packages/sdk/src/index.js";

const ca = new ClearAgentClient({ apiKey: "ca_live_..." });

// Submit + poll (full lifecycle)
const { jobId } = await ca.events.verify({ input: { amount, currency, recipient, purpose } });
const result = await ca.jobs.poll(jobId); // { eventId, contentHash, requiresReview }

// If review required (Art. 14)
await ca.reviews.submit({ eventId: result.eventId, action: "approve", justification: "...",
  reviewerId: "...", reviewerEmail: "...", reviewerRole: "compliance_officer" });

// Audit
const integrity = await ca.audit.integrity(); // { validChain, merkleRoot, totalEvents }
const exported  = await ca.audit.export({ authorityName: "BaFin", authorityRef: "INQ-2026-01" });

// Agents
const agent = await ca.agents.register({ name, externalId, modelProvider?, modelId? });
await ca.agents.suspend(agentId); // Art. 14 stop button
```

## MCP Server

Config (`~/.claude/claude_desktop_config.json` or `mcp.json`):
```json
{
  "mcpServers": {
    "clearagent": {
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"],
      "env": {
        "CLEARAGENT_API_KEY": "ca_test_demo_key_clearagent_2026",
        "CLEARAGENT_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

Tools: `clearagent_verify`, `clearagent_poll`, `clearagent_audit_integrity`, `clearagent_submit_review`  
Build: `npm run build --workspace=packages/mcp-server`

## ECC Setup

ECC (Everything Claude Code) installed: April 2026  
56 agents · 193 skills · 82 commands

Key commands for ClearAgent development:
- `/plan` — task decomposition before any build
- `/tdd` — test-driven development enforcement
- `/security-scan` — AgentShield scan before commits
- `/code-review` — automated PR review
- `/skill-create` — generate skills from git history
- `/feature-dev` — full feature development workflow
- `/checkpoint` — save session state

Always run `/plan` before starting any new feature.  
Always run `/security-scan` before committing.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
