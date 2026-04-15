# ClearAgent Department Status
Last updated: 2026-04-15
Total LOC: 8,781 | Files: 146 | Commits: 39 | Tests: 96 (src-only)

---

## CURRENT SPRINT
Sprint 2: April 24 – May 7, 2026
YC Deadline: May 4, 2026 (19 days)
EU AI Act: 109 days to enforcement

---

## SYSTEM STATE
- Production API: https://clearagentapi-production.up.railway.app ✅ (health OK)
- Production DB: Neon.tech — DATABASE_URL set ✅
- Production Redis: Redis Cloud (redis.io free tier, 30MB, no request cap) — REDIS_URL set ✅
- Production JWT: JWT_SECRET set ✅
- Dashboard: https://dashboard-sable-delta-88.vercel.app ✅ (deployed to Vercel)
- CORS: DASHBOARD_URL + CORS_EXTRA_ORIGIN set on Railway ✅
- Local API: HEALTHY (http://localhost:3000/v1/health)
- Hash chain: VALID (83 events, merkleRoot confirmed)
- Compliance score (local): 90/A
- Tests: 96/96 passing
- Infrastructure docs: docs/infrastructure.md ✅

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
- Agent suspend bug fixed — agent_suspended error code correct
- GET /v1/events?requires_review=true filter added

### DEPT 2 — TRUST & CRYPTOGRAPHY (Arjun, Sofia, Kai)
STATUS: Active
CURRENT: none
BLOCKED: none
COMPLETED:
- 96 tests passing (6 files, src-only)
- SLA worker contentHash fixed (raw string → sha256())
- XML export tests: 5 → 16 tests
- Reviewer non-repudiation (contentHash on humanReviews)
- Signed export manifests (prevExportHash chain)
- RFC 3161 timestamp anchoring (timestampAnchor.ts, non-blocking)
- 20 compliance unit tests (Art. 12/14/19, pure scoreFromInputs function)
- SLA breach SSE notification (pg_notify after escalation insert)

### DEPT 3 — FRONTEND & DASHBOARD (Lena, Dev, Aiko)
STATUS: Active
CURRENT: none
BLOCKED: none
COMPLETED:
- 5 pages: LiveFeed, EventDetail, IntegrityReport, AgentManagement, EscalatedReviews
- 4 components: ComplianceWidget, EventRowSkeleton, ReviewForm, ErrorBoundary
- Demo mode: useDemoMode.ts hook + demoData.ts (25 events, 3 agents)
- Demo banner in App.tsx
- ComplianceWidget: Art. 12/14/19 badges + countdown to Aug 2, 2026
- .env.production set: VITE_API_URL=https://clearagentapi-production.up.railway.app
- Dashboard deployed to Vercel: https://dashboard-sable-delta-88.vercel.app ✅
- CORS configured on Railway (DASHBOARD_URL + CORS_EXTRA_ORIGIN)
- Landing page live counter: useLiveStats hook fetches from production API

### DEPT 4 — DEVELOPER EXPERIENCE (James, Nadia, Tom)
STATUS: BLOCKED — needs npm credentials
CURRENT: npm publish blocked
BLOCKED:
- npm publish @clearagent/sdk@1.0.0 — needs `! npm login`
- npm publish @clearagent/mcp-server@0.2.0 — needs `! npm login`
COMPLETED:
- SDK ClearAgentClient v1.0.0 (7 resources)
- MCP server 4 tools confirmed working
- docs/mcp-setup.md

### DEPT 5 — COMPLIANCE (Elena, Hana, Omar)
STATUS: Active
CURRENT: none
BLOCKED: none
COMPLETED:
- GET /v1/compliance/score — 90/A with Art. 12/14/19 breakdown
- Pure scoreFromInputs() function (testable without DB)
- SLA enforcement worker (detects breaches, inserts escalation record)
- Retention auto-purge cron (daily 02:00 UTC)
- oversightPolicies table + POST/GET/DELETE /v1/policies
- XML export (fast-xml-parser, Art. 19 format)

### DEPT 6 — PRODUCT (Sara, Felix, Yuki)
STATUS: BLOCKED — needs Sanjay input
CURRENT: docs/yc/application.md drafted, needs personal answers
BLOCKED:
- YC application: needs Sanjay name + real Railway/Vercel URLs + submission by May 4
COMPLETED:
- docs/yc/application.md (full answers written)
- docs/competitive-landscape.md, docs/design-partner.md, docs/user-journeys.md

### DEPT 7 — GROWTH (Mia, Leo, Zara)
STATUS: Active
CURRENT: none
BLOCKED:
- Demo GIF recording (can now use Vercel dashboard URL)
COMPLETED:
- README: production API badges + Live section added
- README: Dashboard badge added (https://dashboard-sable-delta-88.vercel.app)
- README: API URL https://clearagentapi-production.up.railway.app documented
- docs/launch/hn-show-hn.md, docs/launch/twitter-thread.md
- CODEOWNERS + issue templates + PR template

### DEPT 8 — DEVOPS (Raj, Ana, Ben)
STATUS: Active
CURRENT: Monitoring production stability
BLOCKED: none
COMPLETED:
- DATABASE_URL set in Railway ✅
- REDIS_URL set in Railway ✅ (migrated Upstash → Redis Cloud free tier)
- JWT_SECRET set in Railway ✅
- Redis migration: Upstash → Redis Cloud (redis.io) — no request cap, 30MB free
- Build fix: removed invalid `enableAutoPipelining` ioredis option
- Added Redis error handler to prevent unhandled crash
- DASHBOARD_URL + CORS_EXTRA_ORIGIN set in Railway ✅
- railway run npm run db:migrate — ran successfully
- railway run npm run seed — ran successfully (80 events seeded)
- All 5 Railway services: ONLINE
- Dashboard deployed to Vercel ✅
- packages/api/Dockerfile universal
- Per-service Dockerfiles (dashboard, landing, sdk, mcp-server)
- CI: ci.yml (typecheck, unit tests, integration tests)
- OOM fixes (deferred workers, pool=3, concurrency=2)
- docs/infrastructure.md: comprehensive runbook for all services

---

## PENDING HUMAN ACTIONS (only Sanjay can do these)

### COMPLETED ✅
1. ~~Railway DATABASE_URL~~ ✅ Set
2. ~~Railway REDIS_URL~~ ✅ Set
3. ~~Railway JWT_SECRET~~ ✅ Set
4. ~~Deploy dashboard to Vercel~~ ✅ https://dashboard-sable-delta-88.vercel.app
5. ~~Update CORS~~ ✅ DASHBOARD_URL + CORS_EXTRA_ORIGIN set

### REMAINING — ship SDK + YC
6. **npm publish**: Run `npm login` then:
   ```bash
   npm publish --workspace=packages/sdk --access public
   npm publish --workspace=packages/mcp-server --access public
   ```

7. **YC application**: Open `docs/yc/application.md` → fill personal answers → submit by **May 4, 2026**

---

## AUTONOMOUS WORK QUEUE — NEXT SESSION

| Priority | Task | Dept | Notes |
|----------|------|------|-------|
| P1 | Per-connection SSE listener | DEPT 1 | Replace shared PG LISTEN with per-connection |
| P1 | Python SDK tests + setup.py | DEPT 4 | Nice-to-have for YC demo |
| P2 | XML export integration test | DEPT 2 | End-to-end with real data |

---

## BUG LOG

| Bug | Root cause | Fix | Commit |
|-----|-----------|-----|--------|
| compliance/score → internal_error | sql template Date param crashes postgres.js | Replace with gte() | 1f30568 |
| vitest runs dist/ + src/ tests (duplicate) | vitest.config.ts missing include/exclude | Add include: src/**/*.test.ts | 1f30568 |
| SLA worker contentHash not SHA-256 | Raw string template instead of sha256() | sha256(system-escalation\|...) | 39262d2 |
| Production 502 on all DB routes | DATABASE_URL not set in Railway API service env vars | Add DATABASE_URL in Railway dashboard | ✅ Fixed |
| Production 502 on Redis-dependent routes | Upstash free tier exhausted (500k req/month) | Migrated to Redis Cloud (redis.io) free tier — no request cap | ✅ Fixed |
| Railway build failure (enableAutoPipelining) | Invalid ioredis v5 option caused tsc error | Removed option + added error handler | d6254ef |
