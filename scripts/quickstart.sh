#!/usr/bin/env bash
# ClearAgent Quickstart — from git clone to first verified event in < 5 minutes
# Usage: bash scripts/quickstart.sh
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo -e "\n${BOLD}ClearAgent Quickstart${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "EU AI Act compliance infrastructure — Art. 12, 14, 19"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Prerequisites check ────────────────────────────────────
step "Checking prerequisites"
command -v node  >/dev/null 2>&1 || fail "Node.js >=20 is required. Install from https://nodejs.org"
command -v npm   >/dev/null 2>&1 || fail "npm is required."
command -v docker >/dev/null 2>&1 || fail "Docker is required. Install from https://docker.com"
NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)" 2>&1) \
  || fail "Node.js >=20 required. Current: $(node --version)"
ok "Node $(node --version) · npm $(npm --version) · Docker ready"

# ── 2. Install dependencies ───────────────────────────────────
step "Installing dependencies"
if [ ! -d "node_modules" ]; then
  npm install --silent
  ok "Dependencies installed"
else
  ok "node_modules already present — skipping install"
fi

# ── 3. Start PostgreSQL + Redis ───────────────────────────────
step "Starting PostgreSQL + Redis (Docker)"
docker compose up -d postgres redis >/dev/null 2>&1 || fail "docker compose up failed. Is Docker running?"

# Wait for postgres to be ready (max 30s)
echo "  Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U clearagent -q 2>/dev/null; then
    ok "PostgreSQL ready"
    break
  fi
  if [ "$i" -eq 30 ]; then fail "PostgreSQL did not start within 30s"; fi
  sleep 1
done

ok "Redis ready (assumed — redis:7-alpine starts fast)"

# ── 4. Run migrations ─────────────────────────────────────────
step "Running database migrations"
npm run db:migrate --workspace=packages/api --silent
ok "Migrations applied"

# ── 5. Seed demo data ─────────────────────────────────────────
step "Seeding demo data (80 events, 10 reviews)"
npm run seed --workspace=packages/api --silent
ok "Demo data seeded"

# ── 6. Start API server ───────────────────────────────────────
step "Starting ClearAgent API (port 3000)"
npm run dev --workspace=packages/api &
API_PID=$!

# Wait for health endpoint (max 30s)
echo "  Waiting for API..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/v1/health >/dev/null 2>&1; then
    ok "API is healthy at http://localhost:3000"
    break
  fi
  if [ "$i" -eq 30 ]; then
    kill "$API_PID" 2>/dev/null || true
    fail "API did not start within 30s"
  fi
  sleep 1
done

# ── 7. Verify an event ────────────────────────────────────────
step "Submitting a verification event"

DEMO_KEY="ca_test_demo_key_clearagent_2026"

# Submit event
JOB_RESPONSE=$(curl -sf http://localhost:3000/v1/events/verify \
  -H "Authorization: Bearer ${DEMO_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "amount": 1500,
      "currency": "EUR",
      "recipient": "DE89370400440532013000",
      "purpose": "supplier_invoice"
    },
    "eventType": "settlement_signal",
    "eventCategory": "transaction"
  }')

JOB_ID=$(echo "$JOB_RESPONSE" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).jobId)")
ok "Event queued — jobId: ${JOB_ID}"

# Poll for result (max 15s)
echo "  Polling for verification result..."
CONTENT_HASH=""
for i in $(seq 1 15); do
  JOB_STATUS=$(curl -sf "http://localhost:3000/v1/jobs/${JOB_ID}" \
    -H "Authorization: Bearer ${DEMO_KEY}")
  STATUS=$(echo "$JOB_STATUS" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).status)")
  if [ "$STATUS" = "completed" ]; then
    EVENT_ID=$(echo "$JOB_STATUS" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).eventId)")
    break
  fi
  if [ "$STATUS" = "failed" ]; then
    fail "Verification job failed"
  fi
  sleep 1
done

# Fetch event and print content hash
EVENT=$(curl -sf "http://localhost:3000/v1/events/${EVENT_ID}" \
  -H "Authorization: Bearer ${DEMO_KEY}")
CONTENT_HASH=$(echo "$EVENT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).contentHash)")
DECISION=$(echo "$EVENT"      | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).decision)")

ok "Verification complete"
echo ""
echo "  Event ID:     ${EVENT_ID}"
echo "  Decision:     ${DECISION}"
echo "  Content Hash: ${CONTENT_HASH}"

# ── 8. Audit integrity check ──────────────────────────────────
step "Verifying hash chain integrity"
INTEGRITY=$(curl -sf "http://localhost:3000/v1/audit/integrity" \
  -H "Authorization: Bearer ${DEMO_KEY}")
VALID=$(echo "$INTEGRITY" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).validChain)")
TOTAL=$(echo "$INTEGRITY" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).totalEvents)")

ok "Hash chain valid: ${VALID} · Total events: ${TOTAL}"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BOLD}${GREEN}ClearAgent is running!${NC}"
echo ""
echo "  API:          http://localhost:3000"
echo "  Health:       http://localhost:3000/v1/health"
echo "  Demo key:     ${DEMO_KEY}"
echo ""
echo "  Next steps:"
echo "  • Dashboard:  npm run dev:dashboard"
echo "  • SDK docs:   docs/api-reference.md"
echo "  • MCP config: packages/mcp-server/README.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Leave API running — user can Ctrl+C to stop
wait "$API_PID"
