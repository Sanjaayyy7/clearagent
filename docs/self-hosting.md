# Self-Hosting Guide

## Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 1 GB | 4 GB |
| Disk | 10 GB | 50 GB (audit logs grow) |
| Node.js | 20.0.0 | 22 LTS |
| Docker | 24+ | Latest |
| Docker Compose | v2.0+ | Latest |

PostgreSQL and Redis run in Docker by default. For production, replace them with managed services.

## Quick Start

Five commands to a running instance:

```bash
git clone https://github.com/clearagent/clearagent
cd clearagent
cp .env.example .env
docker compose up -d
npm install && npm run db:migrate && npm run seed && npm run dev
```

Verify:
```bash
curl http://localhost:3000/v1/health
# → { "status": "ok", "timestamp": "..." }
```

Dashboard: http://localhost:5173  
API: http://localhost:3000

## Environment Variables

Edit `.env` before running migrations. All variables with defaults are optional for local development.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://clearagent:clearagent@localhost:5432/clearagent` | PostgreSQL connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection string |
| `PORT` | No | `3000` | API server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `DEMO_API_KEY` | No | `ca_test_demo_key_clearagent_2026` | API key for local testing |
| `LOG_LEVEL` | No | `info` | Pino log level: `trace`, `debug`, `info`, `warn`, `error` |
| `VITE_API_URL` | No | `http://localhost:3000` | API URL used by the dashboard build |

**Production note:** `DEMO_API_KEY` is a placeholder. Production deployments should implement proper API key issuance via the `api_keys` table — the current auth middleware is demo-grade only.

## Database Setup

After starting PostgreSQL with `docker compose up -d`:

```bash
# Run Drizzle migrations (creates all 9 tables + immutability triggers)
npm run db:migrate

# Seed demo data (optional — 80 events, 3 agents, 10 human reviews)
npm run seed

# Regenerate migration files after schema changes (development only)
npm run db:generate
```

Migrations are idempotent — safe to run multiple times. The immutability triggers and rules are created with `CREATE OR REPLACE` and `IF NOT EXISTS` guards.

### Connecting directly to the database

```bash
# Using Docker
docker exec -it clearagent-postgres psql -U clearagent -d clearagent

# Verify immutability trigger exists
\d+ verification_events
# Should show: enforce_ve_immutability trigger

# Check event count
SELECT COUNT(*) FROM verification_events;
```

## Production Considerations

### Use a managed PostgreSQL instance

Docker-in-production is convenient but risky for an audit trail. Use a managed service (RDS, Cloud SQL, Supabase, Neon) with:
- Automated daily backups
- Point-in-time recovery enabled
- At-rest encryption
- Connection pooling (PgBouncer or managed equivalent)

The audit trail is only as durable as the database storing it.

### Redis persistence

BullMQ uses Redis for the job queue. If Redis restarts without persistence, in-flight verification jobs will be lost. Configure Redis with AOF persistence for production:

```bash
# Add to docker-compose.yml redis service command:
redis-server --appendonly yes --appendfsync everysec
```

Or use a managed Redis service with persistence enabled.

### API key rotation

The `DEMO_API_KEY` must not be used in production. The `api_keys` table supports full API key lifecycle management — generate, label, revoke. Implement key issuance before exposing the API externally.

```sql
-- Revoke a key
UPDATE api_keys SET revoked = true WHERE key_prefix = 'ca_live_abc123';
```

### Backup strategy for audit exports

Compliance exports produced by `GET /v1/audit/export` are ephemeral — the API serves them in-memory and logs the SHA-256 hash, but does not persist the file. For regulatory audit requests, you should:
1. Export to a file: `curl ... -o export_2026-04-05.json`
2. Compute and verify the hash: `sha256sum export_2026-04-05.json`
3. Cross-check with the `file_hash` stored in `audit_exports`
4. Store the file in tamper-evident cold storage (S3 with Object Lock, for example)

### Monitoring

Key metrics to watch:
- PostgreSQL disk usage (audit logs grow indefinitely until retention enforcement is added)
- Redis memory usage (BullMQ job queue)
- API error rate on `POST /v1/events/verify` (failed verifications may indicate broken input validation)
- Worker queue depth (Redis: `LLEN bull:verify:waiting`) — backlog indicates worker saturation

### Running in production mode

```bash
# Build all packages
npm run build

# Start API (production mode — JSON logs, no pretty-printing)
NODE_ENV=production npm start --workspace=packages/api

# Build dashboard for serving as static files
npm run build --workspace=packages/dashboard
# Serve packages/dashboard/dist with nginx or any static host
```
