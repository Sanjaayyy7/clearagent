# ClearAgent — Infrastructure

Maintained by: Omar Hassan (Dept 5 — Compliance & Docs), Raj Iyer (Dept 8 — DevOps)
Last updated: 2026-04-12

---

## Architecture

```
GitHub (source) → Railway (API) → Neon.tech (PostgreSQL 16)
                                ↘ Upstash Redis (BullMQ queues)
Vercel (Dashboard) → Railway API (CORS-allowed)
Railway (Landing)  → Railway API (public endpoints)
```

---

## 1. Railway — API Hosting

**URL:** https://clearagentapi-production.up.railway.app
**Service:** `@clearagent/api`
**Build:** `packages/api/Dockerfile` (universal Docker build)
**Health check:** `GET /v1/health` — 30s timeout

**Services deployed on Railway:**

| Service | Status | Notes |
|---------|--------|-------|
| `@clearagent/api` | ✅ Online | Main API — port 3000 |
| `@clearagent/dashboard` | ✅ Online | React/Vite — port 5173 |
| `@clearagent/landing` | ✅ Online | Marketing page |
| `@clearagent/sdk` | ✅ Online | Health check only — not published to npm |
| `@clearagent/mcp-server` | ✅ Online | MCP protocol server |

**Required environment variables (`clearagent-api` service):**

| Variable | Value | Source |
|----------|-------|--------|
| `DATABASE_URL` | `postgresql://...@neon.tech/neondb?sslmode=require` | Neon.tech → Connect tab |
| `REDIS_URL` | `rediss://default:...@enabled-pug-96749.upstash.io:6379` | Upstash console |
| `JWT_SECRET` | 64-char hex string | `openssl rand -hex 32` |
| `NODE_ENV` | `production` | — |
| `PORT` | `3000` | Default |
| `DEMO_API_KEY` | `ca_test_demo_key_clearagent_2026` | Hardcoded demo |
| `DASHBOARD_URL` | `https://[vercel-url]` | Set after Vercel deploy |
| `CORS_EXTRA_ORIGIN` | `https://[vercel-url]` | Same as DASHBOARD_URL |
| `RFC3161_TSA_URL` | `http://timestamp.digicert.com` | Art. 12 timestamp anchoring |

**Runbooks:**

```bash
# Watch live logs
railway logs --tail

# Run DB migrations in production
railway run npm run db:migrate --workspace=packages/api

# Run seed (demo data — 80 events, 10 reviews, 3 agents)
railway run npm run seed --workspace=packages/api

# Emergency restart
# Railway dashboard → clearagent-api → Deployments → Redeploy
```

---

## 2. Neon.tech — PostgreSQL 16

**Provider:** Neon.tech (serverless PostgreSQL)
**Version:** PostgreSQL 16
**Database:** `neondb`
**Connection:** Pooler endpoint — `ep-twilight-firefly-*-pooler.*.aws.neon.tech`

> **Important:** Always use `?sslmode=require` in the connection string.
> Do NOT add `&channel_binding=require` — incompatible with PgBouncer pooler.

**Schema (9 tables):**

| Table | Mutable? | Purpose |
|-------|---------|---------|
| `organizations` | Yes | Tenant root, retention config |
| `agents` | Status only | AI agents under oversight |
| `api_keys` | Revoke only | bcrypt-hashed API keys |
| `verification_events` | **NO — append-only** | Core audit log (Art. 12) |
| `human_reviews` | **NO — append-only** | Human oversight decisions (Art. 14) |
| `oversight_policies` | Yes | Rules triggering required reviews |
| `audit_exports` | **NO — append-only** | Compliance export records (Art. 19) |
| `jobs` | Status updates | Async job tracking |
| `integrity_checkpoints` | Yes | Periodic Merkle root snapshots |

**Immutability enforcement (database-level, cannot be bypassed by app):**
- PG trigger `enforce_ve_immutability` raises exception on any UPDATE to `verification_events`
- PG rule discards all DELETE attempts on `verification_events`
- Same protection on `human_reviews`

**Migrations:**
```bash
# Generate after schema change
npm run db:generate --workspace=packages/api

# Apply to production
railway run npm run db:migrate --workspace=packages/api
```

---

## 3. Upstash Redis — Queue & Cache

**Provider:** Upstash (serverless Redis)
**Endpoint:** `enabled-pug-96749.upstash.io:6379`
**Connection:** TLS (`rediss://`)
**Used for:** BullMQ job queues

**Queues:**

| Queue | Worker file | Purpose | Concurrency |
|-------|------------|---------|------------|
| `verify-queue` | `workers/verify.worker.ts` | Hash chain + async event processing | 2 |
| `sla-queue` | `workers/sla.worker.ts` | Art. 14 SLA breach detection | 1 |
| `retention-queue` | `workers/retention.worker.ts` | Art. 19 daily purge cron (02:00 UTC) | 1 |

---

## 4. Vercel — Dashboard

**Service:** `packages/dashboard` (React 18 / Vite)
**Deploy command:** `vercel --prod` (run from `packages/dashboard/`)
**Build:** `npm run build` → `dist/`

**Environment variables (set in Vercel project settings):**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://clearagentapi-production.up.railway.app` |

**After deploy:** Update Railway `clearagent-api` with:
```bash
railway variables set DASHBOARD_URL=https://[vercel-url] CORS_EXTRA_ORIGIN=https://[vercel-url]
```

---

## 5. GitHub — Source & CI/CD

**Repo:** https://github.com/Sanjaayyy7/clearagent
**Main branch:** `main`
**CI config:** `.github/workflows/ci.yml`

**CI jobs on every push:**

| Job | Command |
|-----|---------|
| Type check | `npx tsc --noEmit` |
| Lint | `eslint` |
| Unit tests | `vitest` (96 tests) |
| Integration tests | `vitest` with postgres:16 + redis:7 services |

Railway auto-deploys on push to `main`.

---

## 6. npm — Package Registry

Packages pending publish:

| Package | Version | Command |
|---------|---------|---------|
| `@clearagent/sdk` | 1.0.0 | `npm publish --workspace=packages/sdk --access public` |
| `@clearagent/mcp-server` | 0.2.0 | `npm publish --workspace=packages/mcp-server --access public` |

Requires: `npm login` with npm account that owns the `@clearagent` scope.

---

## Smoke Test

Run after any deployment:

```bash
BASE=https://clearagentapi-production.up.railway.app
KEY=ca_test_demo_key_clearagent_2026

curl -s $BASE/v1/health                                          # {"status":"ok"}
curl -s -H "Authorization: Bearer $KEY" "$BASE/v1/events?limit=3"  # real events
curl -s -H "Authorization: Bearer $KEY" $BASE/v1/audit/integrity    # {"status":"intact"}
curl -s -H "Authorization: Bearer $KEY" $BASE/v1/compliance/score   # score 0-100
curl -s $BASE/v1/metrics                                         # {"events_total":80,...}
```
