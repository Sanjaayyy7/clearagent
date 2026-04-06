# Changelog

All notable changes to ClearAgent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.2.0] — 2026-04-05

### Added

- **Human review workflow** — `POST /v1/reviews` implements EU AI Act Art. 14 human oversight. Reviewers can approve, reject, or override any flagged AI decision. The `justification` field is mandatory (minimum 10 characters) and logged permanently.
- **Agent suspension endpoint** — `PATCH /v1/agents/:id/status` allows compliance teams to suspend or flag agents without modifying their source code. Implements the "stop button" requirement of Art. 14.
- **Hash chain integrity endpoint** — `GET /v1/audit/integrity` recomputes the SHA-256 Merkle root over all verification events on demand. Returns per-event hash validation and the aggregate root for regulatory verification.
- **Audit export endpoint** — `GET /v1/audit/export` produces a JSON compliance package with SHA-256 file hash. Every export is logged to `audit_exports` with requester identity and file hash (Art. 19).
- **Real-time SSE stream** — `GET /v1/events/stream` delivers live verification events to the dashboard via Server-Sent Events, backed by PostgreSQL `LISTEN/NOTIFY`.
- **Enhanced seed data** — Seed script now produces 80 verification events across 30 days with 10 human reviews (5 overrides, 3 approvals, 2 rejections) covering the full compliance lifecycle.
- **`integrity_checkpoints` table** — Periodic Merkle root snapshots for long-term audit anchoring (RFC 3161 integration planned).

### Fixed

- **Genuine append-only enforcement** — Removed the `rawClient` escape hatch pattern that allowed direct database access bypassing Drizzle's query builder. The immutability PostgreSQL trigger now applies to all connection paths without exception.
- **Immutability trigger strengthened** — The `enforce_ve_immutability` trigger now blocks ALL updates to `verification_events`, not just status updates. Any attempt to modify a finalized event raises a PostgreSQL exception.
- **Canonical JSON for hash computation** — Content hashes now use sorted-key JSON serialization to survive PostgreSQL JSONB field reordering on read, ensuring hash validation is stable across restarts.

---

## [0.1.0] — 2026-04-01

### Added

- **Monorepo scaffold** — TypeScript monorepo with npm workspaces: `api`, `dashboard`, `sdk`, `mcp-server`, `landing`.
- **PostgreSQL 16 + Redis 7** — Docker Compose setup with health checks and persistent volumes.
- **9-table schema via Drizzle ORM** — `organizations`, `agents`, `api_keys`, `verification_events`, `human_reviews`, `oversight_policies`, `audit_exports`, `jobs`, `integrity_checkpoints`.
- **Append-only audit trail** — PostgreSQL trigger blocks all UPDATE operations on `verification_events`. PostgreSQL rule discards DELETE attempts. Human reviews are also fully immutable.
- **SHA-256 hash chain** — Each verification event hashes its content and the previous event's hash, creating a tamper-evident chain. Merkle root computed over all org events.
- **BullMQ async verification worker** — Verification jobs are queued in Redis and processed with concurrency 5, retry 3x with exponential backoff.
- **Transaction verification domain** — First verification domain: validates amount, currency, recipient, purpose, and agent context with configurable constraints.
- **React dashboard scaffold** — Live event feed with real-time SSE updates, event detail view, confidence scores, and review status.
- **Bearer token authentication** — API key middleware with support for `Authorization: Bearer` header and `?api_key=` query parameter (required for SSE/EventSource compatibility).
- **Pino structured logging** — JSON logs in production, pretty-printed in development.
