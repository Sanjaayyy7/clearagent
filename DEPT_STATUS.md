# ClearAgent Department Status
Last updated: 2026-04-12
Total LOC: 8,781 | Files: 142 | Commits: 37 | Tests: 76 (src-only, no duplication)

---

## CURRENT SPRINT
Sprint 2: April 24 – May 7, 2026
YC Deadline: May 4, 2026 (22 days)
EU AI Act: 112 days to enforcement

---

## SYSTEM STATE
- Local API: HEALTHY (http://localhost:3000/v1/health)
- Hash chain: VALID (83 events, merkleRoot confirmed)
- Compliance score: 90/A (Art.12 perfect, Art.14 13 overdue reviews, Art.19 no export yet)
- All 5 Railway services: ONLINE
- Redis (Upstash): REDIS_URL provided, not yet set in Railway
- DB migrations: Run locally. NOT RUN in Railway production yet.

---

## DEPARTMENT QUEUES

### DEPT 1 — CORE PLATFORM (Riya, Marcus, Priya)
STATUS: Active
CURRENT: none
BLOCKED: none
COMPLETED:
- Hash chain race condition fix (pg_advisory_xact_lock)
- Rate limiting on all endpoints
- Multi-tenant isolation
- Agents cursor pagination
- CORS config (DASHBOARD_URL / LANDING_URL / CORS_EXTRA_ORIGIN)
- Agent suspend bug fixed (7bc4724) — agent_suspended error code correct

### DEPT 2 — TRUST & CRYPTOGRAPHY (Arjun, Sofia, Kai)
STATUS: Active
CURRENT: none
BLOCKED: none
COMPLETED:
- 76 tests passing (5 files, src-only, no dist duplication)
- SLA worker contentHash fixed (raw string → sha256())
- XML export tests: 5 → 16 tests (full XML format coverage)
- Reviewer non-repudiation (contentHash on humanReviews)
- Signed export manifests (prevExportHash chain)
- RFC 3161 timestamp anchoring (timestampAnchor.ts, non-blocking)
- Vitest config fixed (exclude dist/, no more duplicate runs)

### DEPT 3 — FRONTEND & DASHBOARD (Lena, Dev, Aiko)
STATUS: Active
CURRENT: none
BLOCKED: none
COMPLETED:
- 5 pages: LiveFeed, EventDetail, IntegrityReport, AgentManagement, EscalatedReviews
- 4 components: ComplianceWidget, EventRowSkeleton, ReviewForm, ErrorBoundary
- Demo mode: useDemoMode.ts hook + demoData.ts (25 events, 3 agents)
- Demo banner in App.tsx
- Toast notifications (react-hot-toast, bottom-right)
- ComplianceWidget: Art. 12/14/19 badges + countdown to Aug 2, 2026
- SSE live feed (EventSource to /v1/events/stream)

### DEPT 4 — DEVELOPER EXPERIENCE (James, Nadia, Tom)
STATUS: BLOCKED — needs npm credentials
CURRENT: npm publish blocked
BLOCKED:
- npm publish @clearagent/sdk@1.0.0 — needs Sanjay `npm login`
- npm publish @clearagent/mcp-server@0.2.0 — needs Sanjay `npm login`
COMPLETED:
- SDK ClearAgentClient v1.0.0 (7 resources: events, jobs, reviews, agents, audit, policies, attestation)
- MCP server 4 tools confirmed working
- Python SDK alpha (packages/sdk-python — skeleton only, not published)
- docs/mcp-setup.md (Claude Desktop + Claude Code integration guide)
- scripts/quickstart.sh

### DEPT 5 — COMPLIANCE (Elena, Hana, Omar)
STATUS: Active
CURRENT: none
BLOCKED: none
COMPLETED:
- GET /v1/compliance/score — FIXED (was crashing with Date serialization error)
- Score: 90/A with Art. 12/14/19 breakdown, 5-min cache
- SLA enforcement worker (detects breaches, inserts escalation record)
- Retention auto-purge cron (daily 02:00 UTC)
- oversightPolicies table + POST/GET/DELETE /v1/policies
- XML export (fast-xml-parser, Art. 19 format)
- integrity report endpoint (GET /v1/audit/integrity/report)
- Agent attestation JWT (POST /v1/agents/:id/attest)

### DEPT 6 — PRODUCT (Sara, Felix, Yuki)
STATUS: BLOCKED — needs Sanjay input
CURRENT: docs/yc/application.md drafted, needs personal answers
BLOCKED:
- YC application: needs Sanjay name + real Railway URLs + submission by May 4
COMPLETED:
- docs/yc/application.md (full answers written, placeholders for Sanjay to fill)
- docs/category.md (AI agent trust infrastructure thesis)
- docs/competitive-landscape.md (Skyfire, Nevermined, Sponge, Stripe ACP, Google AP2)
- docs/design-partner.md
- docs/user-journeys.md (3 ICPs)
- docs/design-partners-tracker.md (10 slots, outreach template, call script)

### DEPT 7 — GROWTH (Mia, Leo, Zara)
STATUS: BLOCKED — needs Railway URLs
CURRENT: README production URL section needs real Railway service URLs
BLOCKED:
- README production URLs (needs confirmed Railway public URLs from Sanjay)
- Demo GIF recording (needs Railway prod up + stable)
COMPLETED:
- docs/launch/hn-show-hn.md (Show HN post draft)
- docs/launch/twitter-thread.md (thread draft)
- CODEOWNERS + issue templates + PR template
- docs/good-first-issues.md

### DEPT 8 — DEVOPS (Raj, Ana, Ben)
STATUS: BLOCKED — needs Railway credentials
CURRENT: Production not fully configured
BLOCKED:
- REDIS_URL not set in Railway api service (URL provided: rediss://default:gQAA...@enabled-pug-96749.upstash.io:6379)
- JWT_SECRET not set in Railway api service
- DASHBOARD_URL + LANDING_URL not set in Railway api service
- DB migrations NOT run in Railway production
COMPLETED:
- packages/api/Dockerfile universal (builds all 5 packages)
- Per-service Dockerfiles (dashboard, landing, sdk, mcp-server)
- All 5 Railway services: ONLINE
- CI: ci.yml (typecheck, unit tests, integration tests, 6h health check)
- docker.yml (compose validation)
- OOM fixes (deferred workers, pool=3, concurrency=2)
- NODE_OPTIONS memory caps in Dockerfiles

---

## PENDING HUMAN ACTIONS (only Sanjay can do these)

1. **Railway REDIS_URL**: In Railway → @clearagent/api → Variables → add:
   `REDIS_URL=rediss://default:gQAAAAAAAXntAAIncDJlNWQwMmVmMGJlZTQ0YWY2YTUxMTZmYzY3MmQxZGZkMnAyOTY3NDk@enabled-pug-96749.upstash.io:6379`

2. **Railway JWT_SECRET**: Run `! openssl rand -hex 32` → paste as JWT_SECRET env var

3. **Railway DB migrations**: Run `! railway run npm run db:migrate --workspace=packages/api`

4. **npm publish**: Run `! npm login` then:
   - `! npm publish --workspace=packages/sdk --access public`
   - `! npm publish --workspace=packages/mcp-server --access public`

5. **YC application**: Open `docs/yc/application.md` → fill in:
   - Founder name + background (bottom section)
   - Real Railway API URL (replace `[railway-api-url]`)
   - Real Railway Dashboard URL
   - Submit at ycombinator.com/apply by **May 4, 2026**

6. **README production URLs**: Share actual Railway public URLs so Dept 7 can update README

---

## AUTONOMOUS WORK QUEUE — NEXT SESSION

All items below can execute without Sanjay:

| Priority | Task | Dept | Effort | Notes |
|----------|------|------|--------|-------|
| P0 | Add compliance/score unit tests | DEPT 2 | 1h | 3 tests: score=100, broken chain=-20, overdue=-10 |
| P1 | Python SDK tests + setup.py | DEPT 4 | 2h | Nice-to-have for YC |
| P1 | SLA auto-escalation SSE notify | DEPT 1 | 1h | Emit PG NOTIFY when SLA breached |
| P2 | Per-connection SSE listener | DEPT 1 | 3h | Replace shared PG LISTEN with per-connection |
| P2 | XML export integration test | DEPT 2 | 1h | End-to-end XML export test with real data |

---

## BUG LOG (this session)

| Bug | Root cause | Fix | Commit |
|-----|-----------|-----|--------|
| compliance/score → internal_error | sql template Date param crashes postgres.js | Replace sql template with gte() | 1f30568 |
| vitest runs dist/ + src/ tests (duplicate) | vitest.config.ts missing include/exclude | Add include: src/**/*.test.ts, exclude: dist/ | 1f30568 |
| Hash chain validChain=false | Accumulated events from multiple test runs | docker compose down -v → fresh seed | local only |
| SLA worker contentHash not SHA-256 | Raw string template instead of sha256() | sha256(system-escalation\|...) | 39262d2 |
