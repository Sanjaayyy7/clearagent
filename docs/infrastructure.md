# ClearAgent — Infrastructure Documentation

Maintained by: Omar Hassan (Compliance & Docs), Raj Iyer (DevOps)
Last updated: April 2026

---

## Production Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 CLEARAGENT PRODUCTION                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐     │
│  │   Vercel     │─▶│   Railway    │─▶│   Neon    │     │
│  │  Dashboard   │  │     API      │  │ PostgreSQL│     │
│  │  React/Vite  │  │  Express/TS  │  │    16     │     │
│  └──────────────┘  └──────┬───────┘  └───────────┘     │
│                           │                             │
│                    ┌──────▼───────┐                     │
│                    │   Upstash    │                     │
│                    │    Redis     │                     │
│                    │   (BullMQ)   │                     │
│                    └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## Services

### 1. Railway — API Hosting

- **URL**: https://clearagentapi-production.up.railway.app
- **Service**: @clearagent/api
- **Plan**: Starter ($5/month credit)
- **Region**: us-east4
- **Deploy trigger**: Push to main branch via GitHub
- **Health check**: GET /v1/health (30s interval)
- **Build**: Docker multi-stage (packages/api/Dockerfile)

**Environment variables set:**

| Variable | Description |
|---|---|
| DATABASE_URL | Neon.tech PostgreSQL connection string |
| REDIS_URL | Upstash Redis TLS connection string |
| JWT_SECRET | 32-byte hex secret for agent attestation |
| NODE_ENV | production |
| PORT | 3000 |
| NODE_OPTIONS | --max-old-space-size=400 |
| DEMO_API_KEY | ca_test_demo_key_clearagent_2026 |
| DASHBOARD_URL | Vercel dashboard URL (for CORS) |
| CORS_EXTRA_ORIGIN | Vercel dashboard URL (for CORS) |
| RFC3161_TSA_URL | http://timestamp.digicert.com |

**Railway services deployed:**

| Service | Status | Notes |
|---------|--------|-------|
| @clearagent/api | ✅ Online | Main API — port 3000 |
| @clearagent/dashboard | ✅ Online | React/Vite — port 5173 (also on Vercel) |
| @clearagent/landing | ✅ Online | Marketing page |
| @clearagent/sdk | ✅ Online | Health check only — not published to npm |
| @clearagent/mcp-server | ✅ Online | MCP protocol server |

---

### 2. Neon.tech — PostgreSQL Database

- **Provider**: Neon.tech (serverless PostgreSQL)
- **Version**: PostgreSQL 16
- **Database**: neondb
- **Connection**: Pooled via DATABASE_URL env var (sslmode=require)
- **Migrations**: Drizzle ORM (packages/api/src/db/migrations/)
- **Schema**: 9 tables (see docs/architecture.md)

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

**Backup strategy:**

- Neon provides automatic daily backups
- Point-in-time recovery available on paid plan

**Run migrations:**

```bash
cd clearagent-mvp
railway run npm run db:migrate --workspace=packages/api
```

**Run seed (dev/demo data):**

```bash
railway run npm run seed --workspace=packages/api
# Seeds: 80 events, 10 reviews, 3 agents, 1 org
```

---

### 3. Upstash Redis — Queue & Cache

- **Provider**: Upstash (serverless Redis)
- **Endpoint**: enabled-pug-96749.upstash.io:6379
- **Connection**: TLS via REDIS_URL env var (`rediss://`)
- **Used for**: BullMQ job queues

**Queues:**

| Queue | Worker file | Purpose | Concurrency |
|-------|------------|---------|------------|
| verify-queue | workers/verify.worker.ts | Hash chain + async event processing | 2 |
| sla-queue | workers/sla.worker.ts | Art. 14 SLA breach detection | 1 |
| retention-queue | workers/retention.worker.ts | Art. 19 daily purge cron (02:00 UTC) | 1 |

---

### 4. Vercel — Dashboard Hosting

- **URL**: https://dashboard-sable-delta-88.vercel.app
- **Service**: packages/dashboard (React/Vite)
- **Deploy trigger**: Manual (`vercel --prod`) or GitHub integration
- **Build command**: npm run build
- **Output**: dist/

**Environment variables:**

| Variable | Value |
|----------|-------|
| VITE_API_URL | https://clearagentapi-production.up.railway.app |
| VITE_API_KEY | ca_test_demo_key_clearagent_2026 |

**Connect to API**: Dashboard calls Railway API via VITE_API_URL. CORS is configured on API to allow the Vercel domain.

---

### 5. GitHub — Source Control & CI/CD

- **Repo**: https://github.com/Sanjaayyy7/clearagent
- **Main branch**: main (protected)
- **CI**: GitHub Actions (.github/workflows/ci.yml)

**CI jobs on every push:**

| Job | What it runs |
|-----|---------|
| Type Check | `npx tsc --noEmit` |
| Lint | `eslint` |
| Unit Tests | `vitest` (96 tests) |
| Integration Tests | `vitest` with postgres:16 + redis:7 services |

**CODEOWNERS**: .github/CODEOWNERS maps paths to departments.

Railway auto-deploys on push to `main`.

---

### 6. npm — Package Registry

Packages pending publish:

| Package | Version | Command |
|---------|---------|---------|
| @clearagent/sdk | 1.0.0 | `npm publish --workspace=packages/sdk --access public` |
| @clearagent/mcp-server | 0.2.0 | `npm publish --workspace=packages/mcp-server --access public` |

Requires: `npm login` with npm account that owns the `@clearagent` scope.

---

## Runbooks

### Deploy a new version

```bash
git push origin main
# Railway auto-deploys on push to main
# Watch: railway logs --tail
```

### Run production migrations

```bash
cd clearagent-mvp
railway link    # if not linked
railway run npm run db:migrate --workspace=packages/api
```

### Check production health

```bash
curl -s https://clearagentapi-production.up.railway.app/v1/health
```

### Check production compliance score

```bash
curl -s -H "Authorization: Bearer ca_test_demo_key_clearagent_2026" \
  https://clearagentapi-production.up.railway.app/v1/compliance/score
```

### Emergency: restart API

Go to Railway dashboard → clearagent-api → Deployments → Redeploy

### Emergency: check logs

```bash
railway logs --tail
```

---

## Smoke Test

Run after any deployment:

```bash
BASE=https://clearagentapi-production.up.railway.app
KEY=ca_test_demo_key_clearagent_2026

# 1. Health
curl -s $BASE/v1/health

# 2. Events
curl -s -H "Authorization: Bearer $KEY" "$BASE/v1/events?limit=3"

# 3. Audit integrity
curl -s -H "Authorization: Bearer $KEY" $BASE/v1/audit/integrity

# 4. Compliance score
curl -s -H "Authorization: Bearer $KEY" $BASE/v1/compliance/score

# 5. Public metrics
curl -s $BASE/v1/metrics
```
