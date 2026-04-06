# Architecture

## Overview

ClearAgent is a TypeScript monorepo with five packages:

| Package | Purpose |
|---------|---------|
| `packages/api` | Express API server + BullMQ verification worker |
| `packages/dashboard` | React 18 + Vite real-time compliance dashboard |
| `packages/sdk` | TypeScript client SDK (in development) |
| `packages/mcp-server` | MCP protocol server (planned) |
| `packages/landing` | Marketing landing page |

The API package is the core. It handles all verification logic, stores the audit trail, and exposes the compliance endpoints. The dashboard consumes the API via REST and SSE.

## Data Flow

```
Agent Decision → POST /v1/events/verify
      │
      ▼
API validates input (Zod schema)
API authenticates request (Bearer token)
      │
      ▼
INSERT into jobs table → 202 { jobId }
      │
      ▼
BullMQ worker picks up job (concurrency: 5)
      │
      ▼
Domain verifier runs checks
  (transaction: amount, currency, recipient, purpose)
      │
      ▼
Compute inputHash = SHA-256(JSON.stringify(input))
Fetch prevHash = last event's contentHash for this org
Compute contentHash = SHA-256(inputHash|output|decision|occurredAt)
      │
      ▼
Single INSERT → verification_events (immutable)
PG trigger: BEFORE UPDATE → RAISE EXCEPTION
PG rule:    ON DELETE → DO INSTEAD NOTHING
      │
      ▼
Evaluate oversight policies
  (confidence < 0.85 → requiresReview = true)
      │
      ▼
PG NOTIFY 'new_event' fires
      │
      ├──► SSE stream → dashboard real-time feed
      │
      └──► GET /v1/jobs/:jobId → { status: completed, contentHash, requiresReview }

If requiresReview = true:
      │
      ▼
POST /v1/reviews (mandatory justification ≥ 10 chars)
      │
      ▼
INSERT → human_reviews (also immutable)
Full EU AI Act Art. 14 compliance loop complete
```

## Database Schema

Nine tables in PostgreSQL 16, managed with Drizzle ORM.

### Core tables

**`organizations`** — Tenant root. Holds `eu_ai_act_risk_class` and `data_retention_days` (default 3,650 days / 10 years).

**`agents`** — AI agents registered under compliance oversight. Status: `active | suspended | flagged`. Agent suspension (`PATCH /v1/agents/:id/status`) implements the Art. 14 "stop button".

**`api_keys`** — API key storage. Only the bcrypt hash is stored — the raw key is never persisted after creation.

### Audit tables (append-only)

**`verification_events`** — The core audit log. One row per verification request.

Key columns:
| Column | Purpose |
|--------|---------|
| `content_hash` | SHA-256 of `(inputHash \| outputPayload \| decision \| occurredAt)` |
| `prev_hash` | Previous event's `content_hash` — forms the chain |
| `session_id` | Groups events in the same agent session |
| `parent_event_id` | Links to the triggering event in multi-step chains |
| `eu_ai_act_articles` | Array of article references satisfied by this event |
| `requires_review` | Set by oversight policies; gates the human review flow |
| `retention_expires_at` | When this record may be purged (enforcement pending) |

**`human_reviews`** — Every human oversight action is logged here. Columns: `reviewer_id`, `reviewer_email`, `reviewer_role`, `action` (approve/reject/override), `justification`, `content_hash`. Fully immutable — no UPDATE or DELETE.

### Policy and compliance tables

**`oversight_policies`** — Rules that trigger required human review. Example: `{ "confidence_below": 0.85 }` → `action: require_review`.

**`audit_exports`** — Record of every compliance export: who requested it, what filters applied, how many records, SHA-256 hash of the export file (Art. 19).

**`jobs`** — Async job tracking for verification requests. Links `jobId` → `eventId` on completion.

**`integrity_checkpoints`** — Periodic Merkle root snapshots. Intended for RFC 3161 external timestamp anchoring (roadmap).

### Immutability enforcement

Two mechanisms work together on `verification_events`:

```sql
-- Blocks all updates
CREATE TRIGGER enforce_ve_immutability
  BEFORE UPDATE ON verification_events
  FOR EACH ROW EXECUTE FUNCTION enforce_verification_immutability();
-- Function body: RAISE EXCEPTION 'verification_events is append-only'

-- Silently discards deletes
CREATE RULE no_delete_verification_events
  AS ON DELETE TO verification_events DO INSTEAD NOTHING;
```

`human_reviews` uses rules for both operations:
```sql
CREATE RULE no_update_human_reviews AS ON UPDATE TO human_reviews DO INSTEAD NOTHING;
CREATE RULE no_delete_human_reviews AS ON DELETE TO human_reviews DO INSTEAD NOTHING;
```

### Hash chain algorithm

```typescript
// 1. Hash the input payload
inputHash = SHA-256(JSON.stringify(input))

// 2. Hash event content (sorted-key JSON to survive JSONB reordering)
contentHash = SHA-256(
  inputHash + "|" +
  canonicalJson(outputPayload) + "|" +
  decision + "|" +
  occurredAt.toISOString()
)

// 3. Chain: prevHash = contentHash of the last event for this org
// First event: prevHash = null

// 4. Merkle root over all events for an org
merkleRoot = computeMerkleRoot(allContentHashes)
// Pairs are SHA-256(left + right); odd nodes are duplicated
```

The integrity endpoint re-derives every hash from stored data and flags any mismatch.

## Design Principles

**Append-only by default.** The audit trail cannot be useful for compliance if it can be altered. Immutability is enforced at the database layer — not just in application code.

**Async verification.** Verification is queued and processed out of band. Agents receive a `jobId` immediately (202) and poll or listen via SSE. This keeps the API responsive under load and isolates verification failures from the agent's critical path.

**Single atomic insert.** The worker computes the full hash chain and inserts the complete event in one database statement. There is no intermediate "pending" state in `verification_events` — partial writes cannot produce a broken chain.

**Compliance gaps are documented.** Retention enforcement and XML export are known gaps. They are listed honestly in the EU AI Act guide and on the roadmap.

## Queue System (BullMQ)

```
POST /v1/events/verify
  → queue.add('verify', jobData, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } })
  → 202 { jobId }

BullMQ worker (concurrency: 5)
  → processVerification(job)
  → updates job status: queued → processing → completed | failed
```

The queue is backed by Redis 7. Job data includes the full input payload, org/agent context, and session metadata. On failure, the job retries up to 3 times with exponential backoff before being marked failed. Failed jobs are visible via `GET /v1/jobs/:jobId` with the error message.

## Real-time Streaming (SSE + PG NOTIFY)

```typescript
// PostgreSQL trigger fires on every INSERT to verification_events
NOTIFY new_event, '{ "eventId": "...", "orgId": "..." }'

// API listens via pg LISTEN and broadcasts to SSE clients
pg.query('LISTEN new_event')
pg.on('notification', (msg) => {
  sseClients.filter(c => c.orgId === msg.orgId).forEach(c => c.write(msg))
})
```

SSE clients connect to `GET /v1/events/stream?api_key=<key>` (query param required since browser `EventSource` doesn't support custom headers). The dashboard uses this to update the live feed without polling.

## MCP Protocol Integration

The `packages/mcp-server` package is a planned extension that will expose ClearAgent's verification and audit capabilities as MCP tools. This allows AI assistants and agent frameworks that support MCP to submit events and query audit state through a standardized protocol interface.

Current status: package scaffolded, implementation planned.
