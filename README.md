# ClearAgent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)]()
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg)]()
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)]()
[![EU AI Act](https://img.shields.io/badge/EU_AI_Act-Art.12%20%C2%B7%2014%20%C2%B7%2019-green.svg)]()

> Append-only audit trail and human oversight protocol for AI agents. EU AI Act compliant by design.

## What is ClearAgent?

ClearAgent is a verification infrastructure layer that sits between AI agents and their decisions. Every agent action is logged to an append-only PostgreSQL audit trail with SHA-256 hash chaining — producing a tamper-evident record that satisfies EU AI Act Articles 12, 14, and 19. Human reviewers can inspect, approve, override, or escalate any flagged decision, with every review action itself immutably logged.

The design is intentionally narrow: ClearAgent verifies and records. It does not move money, execute transactions, or replace existing business logic. This separation means compliance infrastructure can be added to any AI agent stack without architectural changes to the agents themselves.

## Architecture

```
  AI Agent                  ClearAgent API
     │                           │
     │  POST /v1/events/verify   │
     │──────────────────────────►│
     │  202 { jobId }            │
     │◄──────────────────────────│
     │                           │   BullMQ
     │                           │──────────► Verify worker
     │                           │             │ SHA-256 hash
     │                           │             │ prevHash chain
     │                           │             │ INSERT (append-only)
     │                           │◄────────────│
     │  GET /v1/jobs/:jobId      │   PG NOTIFY → SSE stream
     │──────────────────────────►│
     │  { status, contentHash }  │
     │◄──────────────────────────│

  Dashboard ──── SSE ─────────────► Real-time event feed
  Compliance tool ── GET /v1/audit/integrity ──► Merkle root
```

**Key properties:**
- Verification events are **inserted once, never updated or deleted** (PostgreSQL trigger enforces this)
- Every event hashes the previous event's `contentHash` — breaking the chain is detectable
- Human reviews are also append-only — no override can be silently undone
- The `GET /v1/audit/integrity` endpoint recomputes the Merkle root on demand

## Quick Start

```bash
git clone https://github.com/clearagent/clearagent
cd clearagent
cp .env.example .env
docker compose up -d
npm install && npm run db:migrate && npm run seed && npm run dev
```

API live: http://localhost:3000/v1/health  
Dashboard live: http://localhost:5173

```bash
# Verify it works — submit a test event
curl -X POST http://localhost:3000/v1/events/verify \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "amount": 1500,
      "currency": "USD",
      "recipient": "Vendor Corp",
      "purpose": "Q2 software license renewal"
    }
  }'
# → { "jobId": "...", "status": "queued" }
```

## EU AI Act Compliance

| Article | Requirement | Implementation | Status |
|---------|-------------|----------------|--------|
| Art. 12 | Automatic logging | Append-only PostgreSQL + SHA-256 hash chain | ✅ |
| Art. 12 | Traceability | `session_id` + `parent_event_id` chain | ✅ |
| Art. 12 | Tamper evidence | PG trigger blocks UPDATE on finalized events | ✅ |
| Art. 14 | Human oversight | Review workflow with mandatory justification | ✅ |
| Art. 14 | Override logging | Every override logged with reviewer identity | ✅ |
| Art. 14 | Agent suspension | `PATCH /v1/agents/:id/status → suspended` | ✅ |
| Art. 19 | Record keeping | JSON export endpoint with SHA-256 file hash | ✅ |
| Art. 19 | Export audit | Every export logged to `audit_exports` table | ✅ |
| Art. 19 | Retention | `retention_expires_at` field on all events | ⚠️ Enforcement deferred |

Enforcement deadline: **August 2026**. See [docs/eu-ai-act-guide.md](docs/eu-ai-act-guide.md) for the full compliance guide including known gaps.

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/v1/health` | — | Health check |
| POST | `/v1/events/verify` | ✓ | Submit verification event (async) |
| GET | `/v1/events` | ✓ | List events with filters + cursor pagination |
| GET | `/v1/events/:id` | ✓ | Get event detail + linked reviews |
| GET | `/v1/events/stream` | ✓ | Real-time SSE stream |
| GET | `/v1/jobs/:jobId` | ✓ | Poll async job status |
| POST | `/v1/reviews` | ✓ | Submit human review (Art. 14) |
| GET | `/v1/audit/integrity` | ✓ | Hash chain status + Merkle root |
| GET | `/v1/audit/export` | ✓ | Export compliance package (Art. 19) |
| POST | `/v1/agents/register` | ✓ | Register agent under oversight |
| PATCH | `/v1/agents/:id/status` | ✓ | Suspend or flag agent |

Full request/response schemas and curl examples: [docs/api-reference.md](docs/api-reference.md)

## SDK

```typescript
import ClearAgentClient from "@clearagent/sdk";

const ca = new ClearAgentClient({
  apiKey: "ca_live_...",
  baseUrl: "https://your-clearagent-instance.com",
});

// Submit a verification event
const { jobId } = await ca.events.verify({
  input: { amount: 1500, currency: "USD", recipient: "Acme Corp", purpose: "License renewal" },
});

// Poll until complete
const result = await ca.jobs.poll(jobId);
console.log(result.contentHash);   // SHA-256 hash of this event
console.log(result.requiresReview); // true if human review needed (Art. 14)

// Check audit integrity
const integrity = await ca.audit.integrity();
console.log(integrity.validChain); // true if hash chain is intact
console.log(integrity.merkleRoot); // Merkle root over all events
```

See [`examples/quickstart.ts`](examples/quickstart.ts) for a complete walkthrough.

## MCP Server

Connect ClearAgent to any Claude-compatible agent or MCP client:

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

Available tools:

| Tool | Description |
|------|-------------|
| `clearagent_verify` | Submit a decision for verification, get a `jobId` |
| `clearagent_poll` | Retrieve the verification result and `contentHash` |
| `clearagent_audit_integrity` | Verify hash chain integrity and get Merkle root |
| `clearagent_submit_review` | Submit human review for flagged decisions (Art. 14) |

## Stack

| Layer | Technology |
|-------|------------|
| API | TypeScript · Express · Zod |
| Queue | BullMQ · Redis 7 |
| Database | PostgreSQL 16 · Drizzle ORM |
| Dashboard | React 18 · Vite · Tailwind |
| SDK | TypeScript · fetch |
| Protocol | MCP server · stdio transport |
| Infra | Docker Compose |

## Roadmap

- [x] TypeScript SDK (`ClearAgentClient`)
- [x] MCP server (4 tools)
- [ ] Identity verification domain
- [ ] Authorization verification domain
- [ ] Webhook delivery with HMAC signing
- [ ] Multi-tenant RBAC
- [ ] XML export (regulatory format)
- [ ] Retention enforcement cron
- [ ] RFC 3161 timestamp anchoring
- [ ] Dockerfile + production deployment guide
- [ ] `npm` package: `@clearagent/sdk`

## Contributing

Contributions are welcome. Before opening a PR, read [CONTRIBUTING.md](CONTRIBUTING.md) — especially the compliance section. The immutability guarantee on `verification_events` is sacred: no PR that adds UPDATE or DELETE to that table will be merged.

Good first issues are labeled [`good first issue`](https://github.com/clearagent/clearagent/issues?q=label%3A%22good+first+issue%22) in the issue tracker. See [docs/good-first-issues.md](docs/good-first-issues.md) for descriptions.

## Community

- **Questions / ideas:** [GitHub Discussions](https://github.com/clearagent/clearagent/discussions)
- **Bug reports:** [GitHub Issues](https://github.com/clearagent/clearagent/issues) using the bug report template
- **Compliance gaps:** Use the compliance gap issue template — we treat these as high priority
- **Security vulnerabilities:** Email security@clearagent.io (do not open a public issue)

If ClearAgent is useful for your compliance work, a star helps others find it. ⭐

## License

MIT — see [LICENSE](LICENSE)
