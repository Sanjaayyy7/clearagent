# Changelog

All notable changes to ClearAgent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.1.0] — 2026-04-08

### Added

- **Rate limiting** — `express-rate-limit` applied globally (200 req/min). Protects against abuse without disrupting normal compliance workflows.
- **Reviewer non-repudiation (Art. 14)** — Human review `contentHash` now includes the reviewed event's `contentHash`. Each review is cryptographically bound to the exact event state it reviewed, making it provable that the reviewer saw the specific audit record.
- **Signed export chain (Art. 19)** — Each `GET /v1/audit/export` response includes `prevExportHash`, linking it to the previous export. Creates a tamper-evident chain of audit packages submitted to regulators.

### Fixed

- **Multi-tenant isolation** — All API endpoints now scope queries to `auth.orgId` (the organization bound to the authenticated API key). Previously, events and audit data were fetched globally across all organizations.
- `GET /v1/events` — scoped to authenticated org.
- `GET /v1/events/:id` — validates event belongs to authenticated org.
- `POST /v1/events/verify` — uses `auth.orgId` instead of first-org table scan.
- `GET /v1/audit/integrity` — hash chain check scoped to authenticated org.
- `GET /v1/audit/export` — export scoped to authenticated org.

---

## [1.0.0] — 2026-04-08

### Added

- **CI integration tests** — GitHub Actions workflow now includes a `unit-tests` job (self-contained, no services) and an `integration-tests` job with `postgres:16` and `redis:7` services. The integration job runs migrations, seeds the database, boots the API server, and runs all three integration test files.
- **30 hash chain unit tests** — `hashchain.unit.test.ts` covers all exported functions in `hashChain.ts`: `sha256` (known SHA-256 vector), `computeInputHash` (determinism, payload sensitivity), `computeContentHash` (canonical JSON JSONB reorder stability, nested objects, null payloads), `verifyContentHash` (tamper detection), `computeMerkleRoot` (empty array, single element, even/odd lengths, order sensitivity, two-level tree correctness).
- **Integrity checkpoints (Art. 12 + 19)** — `verify.worker.ts` now writes a row to `integrity_checkpoints` after each successful verification event. Each checkpoint stores the current Merkle root, event count, and a `prevCheckpointId` link — building an auditable checkpoint chain. The write is best-effort and does not fail the verification job if it errors.
- **DB-wired oversight policies (Art. 14)** — `evaluateOversightPolicies()` now accepts an optional `policies` array queried from the `oversight_policies` table. The worker fetches active policies for the authenticating org before evaluation, replacing the hardcoded confidence threshold. Falls back to hardcoded defaults (confidence < 0.85, decision == "flagged") when no DB policies are found.

---

## [0.9.1] — 2026-04-08

### Added

- **MIT License** — `LICENSE` file added to repository root. Required for open-source publication.

### Fixed

- **Hash chain race condition (CRITICAL)** — Under `concurrency: 5`, two BullMQ workers for the same org could read the same `prevHash` simultaneously, forking the hash chain. Fixed by wrapping the `prevHash` read + `INSERT INTO verification_events` in a `db.transaction()` with `SELECT pg_advisory_xact_lock(hashtext(orgId))` at the start. The lock serializes all workers for the same org without blocking workers for different orgs.
- **Hardcoded API key in production bundle** — The dashboard shipped `ca_test_demo_key_clearagent_2026` as a fallback in compiled JavaScript. Fixed with a production guard: if `VITE_API_KEY` is unset in a production build, the app throws at boot rather than silently using the demo key.

---

## [0.9.0] — 2026-04-08

### Added

- **Graphify knowledge graph** — AST + semantic extraction of all 51 source files (79 total, 5,331 LOC) into a 203-node, 217-edge knowledge graph. Outputs: `graphify-out/GRAPH_REPORT.md` (human-readable), `graphify-out/graph.json` (queryable), `graphify-out/graph.html` (interactive). 49 communities detected; top god nodes: `apiFetch()` (9 edges), `Append-Only Audit Trail` (7 edges), `SHA-256 Hash Chain` (7 edges). CLAUDE.md instrumented to read graph before architecture questions.

---

## [0.8.0] — 2026-04-05

### Added

- **React dashboard** — Full compliance dashboard with Live Feed (real-time SSE), Event Detail (hash display, review form), Integrity Report (Merkle root, compliance checklist, export), and Agent Management (register, suspend, flag).
- **Integration test suite** — Three integration test files: `hashchain.test.ts` (hash chain integrity), `humanreview.test.ts` (Art. 14 review lifecycle), `agentsuspend.test.ts` (Art. 14 stop button).
- **Railway deployment config** — `railway.json` with Dockerfile builder, health check at `/v1/health`, restart on failure.

---

## [0.7.0] — 2026-04-05

### Added

- **TypeScript SDK (`@clearagent/sdk`)** — Full API client with five resource classes: `AgentsResource` (register/suspend/activate/flag), `EventsResource` (verify/get/list), `JobsResource` (get/poll with exponential backoff), `ReviewsResource` (submit), `AuditResource` (integrity/export). SDK version `0.2.0`, TSC clean.
- **MCP server (`@clearagent/mcp-server`)** — Model Context Protocol server exposing four tools: `clearagent_verify`, `clearagent_poll`, `clearagent_audit_integrity`, `clearagent_submit_review`. Enables Claude and other MCP-compatible AI agents to self-log their decisions for EU AI Act compliance.

---

## [0.6.0] — 2026-04-04

### Added

- **Open source repository structure** — `CONTRIBUTING.md`, `SECURITY.md`, `docs/architecture.md`, `docs/eu-ai-act-guide.md`, `docs/api-reference.md`, `docs/good-first-issues.md`, `docs/self-hosting.md`. Complete OSS project with issue templates and contributing guidelines.

---

## [0.5.x] — 2026-04-02 to 2026-04-04

### Added

- **Marketing landing page** — Full `packages/landing` with Spline 3D scene, cream light theme, globe animation, dual marquee, hash chain tamper demo, numbered capabilities section, and integration tiles.

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
