# Graph Report - /Users/sanjaym/Downloads/ClearAgent/clearagent-mvp  (2026-04-08)

## Corpus Check
- Corpus is ~31,168 words - fits in a single context window. You may not need a graph.

## Summary
- 203 nodes · 217 edges · 49 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 9 edges
2. `Append-Only Audit Trail` - 7 edges
3. `SHA-256 Hash Chain` - 7 edges
4. `HttpClient` - 6 edges
5. `AgentsResource` - 6 edges
6. `Release v0.1.0 (2026-04-01)` - 6 edges
7. `Release v0.2.0 (2026-04-05)` - 6 edges
8. `EventsResource` - 5 edges
9. `ClearAgent README` - 5 edges
10. `Human Review Workflow` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Append-Only Audit Trail` --conceptually_related_to--> `human_reviews Table`  [INFERRED]
  README.md → docs/architecture.md
- `Transaction Verification Domain` --conceptually_related_to--> `BullMQ Async Verification Worker`  [INFERRED]
  CHANGELOG.md → docs/architecture.md
- `packages/mcp-server (MCP Protocol Server)` --implements--> `MCP Tool: clearagent_submit_review`  [EXTRACTED]
  docs/architecture.md → README.md
- `ClearAgent README` --references--> `EU AI Act Compliance Guide`  [EXTRACTED]
  README.md → docs/eu-ai-act-guide.md
- `Rationale: Append-Only Immutability at DB Layer` --rationale_for--> `Append-Only Audit Trail`  [EXTRACTED]
  docs/architecture.md → README.md

## Hyperedges (group relationships)
- **EU AI Act Compliance Core (Art 12/14/19 + Implementation)** — regulation_eu_ai_act_art12, regulation_eu_ai_act_art14, regulation_eu_ai_act_art19, concept_appendonly_audittrail, concept_human_review_workflow, concept_agent_suspension, endpoint_get_audit_export [EXTRACTED 0.95]
- **Hash Chain Integrity System** — concept_sha256_hashchain, concept_canonical_json, concept_merkle_root, concept_pg_immutability_trigger, concept_verification_events_table, endpoint_get_audit_integrity [EXTRACTED 0.95]
- **Async Verification Pipeline** — endpoint_post_events_verify, concept_bullmq_worker, concept_transaction_verifier, concept_verification_events_table, concept_pg_notify_listen, concept_sse_stream, endpoint_get_jobs_jobid [EXTRACTED 0.93]

## Communities

### Community 0 - "EU AI Act Compliance & Audit Core"
Cohesion: 0.1
Nodes (29): Agent Suspension (Stop Button), agents Table, Append-Only Audit Trail, audit_exports Table, Canonical JSON Serialization, Compliance Gap: Retention Enforcement, Compliance Gap: RFC 3161 Timestamp Anchoring, Compliance Gap: XML Export (+21 more)

### Community 1 - "SDK API Client & Audit Resources"
Cohesion: 0.11
Nodes (8): apiCall(), AuditResource, ClearAgentClient, ClearAgentError, EventsResource, JobsResource, pollJob(), ReviewsResource

### Community 2 - "Infrastructure: Auth, Queue & MCP Tools"
Cohesion: 0.12
Nodes (21): api_keys Table, Bearer Token Authentication, BullMQ Async Verification Worker, Drizzle ORM, MCP Tool: clearagent_audit_integrity, MCP Tool: clearagent_poll, MCP Tool: clearagent_verify, PostgreSQL LISTEN/NOTIFY (+13 more)

### Community 3 - "Agent Lifecycle Management API"
Cohesion: 0.26
Nodes (2): AgentsResource, HttpClient

### Community 4 - "Dashboard API Layer"
Cohesion: 0.33
Nodes (9): apiFetch(), getAgents(), getAuditExport(), getAuditIntegrity(), getEvent(), listEvents(), registerAgent(), submitReview() (+1 more)

### Community 5 - "Landing Page UI Components"
Cohesion: 0.2
Nodes (0): 

### Community 6 - "Project Documentation Hub"
Cohesion: 0.36
Nodes (8): ClearAgent Contributing Guide, API Reference, Architecture Document, EU AI Act Compliance Guide, Good First Issues, Self-Hosting Guide, Rationale: Narrow Scope (Verify & Record Only), ClearAgent README

### Community 7 - "Hash Chain Integrity Engine"
Cohesion: 0.52
Nodes (6): canonicalJson(), computeContentHash(), computeInputHash(), computeMerkleRoot(), sha256(), verifyContentHash()

### Community 8 - "Agent Management Dashboard UI"
Cohesion: 0.4
Nodes (2): handleRegisterSuccess(), loadAgents()

### Community 9 - "Database Seeding & Test Data"
Cohesion: 0.53
Nodes (4): makeEventDate(), randomAmount(), randomChoice(), seed()

### Community 10 - "Landing Page Theme & Layout"
Cohesion: 0.4
Nodes (0): 

### Community 11 - "3D Animation Error Handling"
Cohesion: 0.5
Nodes (1): SplineErrorBoundary

### Community 12 - "Async Verification Worker"
Cohesion: 0.67
Nodes (2): getLastHash(), processVerification()

### Community 13 - "Real-Time Event Feed UI"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "Audit Integrity Report UI"
Cohesion: 0.67
Nodes (0): 

### Community 15 - "Event Detail View UI"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "Human Review Integration Test"
Cohesion: 1.0
Nodes (2): api(), verifyAndPoll()

### Community 17 - "Agent Suspension Integration Test"
Cohesion: 1.0
Nodes (2): api(), pollJob()

### Community 18 - "Hash Chain Integration Test"
Cohesion: 1.0
Nodes (2): api(), verifyAndPoll()

### Community 19 - "SDK Quickstart Example"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Review Form UI"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Request Validation Middleware"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Auth Middleware"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "SSE Events Handler"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Transaction Verifier"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "DB Migration Runner"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Oversight Policy Evaluator"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Dashboard Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Vite Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Drizzle Config"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Vitest Config"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Seed Type Declarations"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Pino Logger"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Drizzle Schema"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Jobs Router"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Agents Router"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Audit Router"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Reviews Router"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Project Changelog"
Cohesion: 1.0
Nodes (1): ClearAgent Changelog

### Community 42 - "CLAUDE.md Instructions"
Cohesion: 1.0
Nodes (1): ClearAgent CLAUDE.md

### Community 43 - "Organizations Table"
Cohesion: 1.0
Nodes (1): organizations Table

### Community 44 - "Jobs Table"
Cohesion: 1.0
Nodes (1): jobs Table

### Community 45 - "Landing Package"
Cohesion: 1.0
Nodes (1): packages/landing (Marketing Landing Page)

### Community 46 - "GET Events Endpoint"
Cohesion: 1.0
Nodes (1): GET /v1/events

### Community 47 - "GET Event by ID Endpoint"
Cohesion: 1.0
Nodes (1): GET /v1/events/:id

### Community 48 - "POST Agent Register Endpoint"
Cohesion: 1.0
Nodes (1): POST /v1/agents/register

## Knowledge Gaps
- **25 isolated node(s):** `ClearAgent Changelog`, `ClearAgent CLAUDE.md`, `Architecture Document`, `Drizzle ORM`, `PostgreSQL LISTEN/NOTIFY` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `SDK Quickstart Example`** (2 nodes): `quickstart.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Review Form UI`** (2 nodes): `ReviewForm.tsx`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Request Validation Middleware`** (2 nodes): `validate.ts`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Middleware`** (2 nodes): `auth.ts`, `authMiddleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SSE Events Handler`** (2 nodes): `events.ts`, `setupSSE()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Transaction Verifier`** (2 nodes): `transaction.ts`, `verifyTransaction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DB Migration Runner`** (2 nodes): `migrate.ts`, `runMigrations()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Oversight Policy Evaluator`** (2 nodes): `oversight.ts`, `evaluateOversightPolicies()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Entry Point`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Env Types`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Drizzle Config`** (1 nodes): `drizzle.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vitest Config`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Seed Type Declarations`** (1 nodes): `seed.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pino Logger`** (1 nodes): `logger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Drizzle Schema`** (1 nodes): `schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Jobs Router`** (1 nodes): `jobs.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Agents Router`** (1 nodes): `agents.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit Router`** (1 nodes): `audit.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Reviews Router`** (1 nodes): `reviews.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Changelog`** (1 nodes): `ClearAgent Changelog`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLAUDE.md Instructions`** (1 nodes): `ClearAgent CLAUDE.md`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Organizations Table`** (1 nodes): `organizations Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Jobs Table`** (1 nodes): `jobs Table`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Landing Package`** (1 nodes): `packages/landing (Marketing Landing Page)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `GET Events Endpoint`** (1 nodes): `GET /v1/events`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `GET Event by ID Endpoint`** (1 nodes): `GET /v1/events/:id`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `POST Agent Register Endpoint`** (1 nodes): `POST /v1/agents/register`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Release v0.1.0 (2026-04-01)` connect `Infrastructure: Auth, Queue & MCP Tools` to `EU AI Act Compliance & Audit Core`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `Release v0.2.0 (2026-04-05)` connect `EU AI Act Compliance & Audit Core` to `Infrastructure: Auth, Queue & MCP Tools`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `SHA-256 Hash Chain` connect `EU AI Act Compliance & Audit Core` to `Infrastructure: Auth, Queue & MCP Tools`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `apiFetch()` (e.g. with `listEvents()` and `getEvent()`) actually correct?**
  _`apiFetch()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Append-Only Audit Trail` (e.g. with `human_reviews Table` and `audit_exports Table`) actually correct?**
  _`Append-Only Audit Trail` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ClearAgent Changelog`, `ClearAgent CLAUDE.md`, `Architecture Document` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `EU AI Act Compliance & Audit Core` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._