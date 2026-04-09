#!/usr/bin/env bash
# ClearAgent — 60-second end-to-end compliance demo
# Requires: docker compose up -d && npm run db:migrate && npm run seed && npm run dev
# Usage: bash scripts/demo.sh

set -euo pipefail

BASE="${API_URL:-http://localhost:3000}"
KEY="${API_KEY:-ca_test_demo_key_clearagent_2026}"
BOLD=$'\033[1m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[31m'
CYAN=$'\033[36m'
RESET=$'\033[0m'

function step() { echo; echo "${BOLD}${CYAN}▶ $1${RESET}"; }
function ok()   { echo "  ${GREEN}✓${RESET} $1"; }
function warn() { echo "  ${YELLOW}⚠${RESET} $1"; }
function fail() { echo "  ${RED}✗${RESET} $1"; exit 1; }

function api() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sf -X "$method" "$BASE$path" \
      -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sf -X "$method" "$BASE$path" \
      -H "Authorization: Bearer $KEY"
  fi
}

echo
echo "${BOLD}ClearAgent — EU AI Act Compliance Demo${RESET}"
echo "  API: $BASE"
echo "  Key: ${KEY:0:16}…"

# ── Step 1: Health check ────────────────────────────────────────

step "1/6 — Health check"
HEALTH=$(api GET /v1/health)
VERSION=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])" 2>/dev/null || echo "unknown")
ok "API is up (version $VERSION)"

# ── Step 2: Submit verification event (Art. 12) ─────────────────

step "2/6 — Submit verification event (EU AI Act Art. 12)"
VERIFY=$(api POST /v1/events/verify '{
  "input": {
    "amount": 12500,
    "currency": "EUR",
    "recipient": "DataStream Analytics",
    "purpose": "Annual security audit and compliance certification",
    "agentContext": "Automated procurement agent per approved Q1 budget"
  }
}')

JOB_ID=$(echo "$VERIFY" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])" 2>/dev/null || fail "Failed to parse jobId")
ok "Verification queued → job: $JOB_ID"

# ── Step 3: Poll for result ─────────────────────────────────────

step "3/6 — Poll for verification result"
EVENT_ID=""
for i in $(seq 1 20); do
  JOB=$(api GET "/v1/jobs/$JOB_ID")
  JOB_STATUS=$(echo "$JOB" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "unknown")

  if [ "$JOB_STATUS" = "completed" ]; then
    EVENT_ID=$(echo "$JOB" | python3 -c "import sys,json; print(json.load(sys.stdin)['eventId'])" 2>/dev/null || fail "No eventId")
    ok "Job completed → event: $EVENT_ID"
    break
  elif [ "$JOB_STATUS" = "failed" ]; then
    JOB_ERR=$(echo "$JOB" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','unknown'))" 2>/dev/null || echo "unknown")
    fail "Job failed: $JOB_ERR"
  fi

  sleep 0.5
done

[ -z "$EVENT_ID" ] && fail "Job timed out after 10 seconds"

# ── Step 4: Check event details + content hash ──────────────────

step "4/6 — Inspect event (SHA-256 hash chain)"
EVENT=$(api GET "/v1/events/$EVENT_ID")
CONTENT_HASH=$(echo "$EVENT" | python3 -c "import sys,json; e=json.load(sys.stdin); print(e['contentHash'])" 2>/dev/null || fail "No contentHash")
DECISION=$(echo "$EVENT" | python3 -c "import sys,json; e=json.load(sys.stdin); print(e['decision'])" 2>/dev/null || echo "unknown")
CONFIDENCE=$(echo "$EVENT" | python3 -c "import sys,json; e=json.load(sys.stdin); print(e.get('confidence','N/A'))" 2>/dev/null || echo "N/A")
REQUIRES_REVIEW=$(echo "$EVENT" | python3 -c "import sys,json; e=json.load(sys.stdin); print(e['requiresReview'])" 2>/dev/null || echo "False")

ok "Decision:        $DECISION"
ok "Confidence:      $CONFIDENCE"
ok "Content hash:    ${CONTENT_HASH:0:16}…${CONTENT_HASH: -8}"
ok "Requires review: $REQUIRES_REVIEW"

# ── Step 5: Human review if required (Art. 14) ─────────────────

step "5/6 — Human oversight (EU AI Act Art. 14)"
if [ "$REQUIRES_REVIEW" = "True" ] || [ "$REQUIRES_REVIEW" = "true" ]; then
  warn "Confidence below threshold — human review required"
  REVIEW=$(api POST /v1/reviews "$(cat <<BODY
{
  "eventId": "$EVENT_ID",
  "action": "override",
  "justification": "Demo override: vendor pre-approved by board resolution 2026-Q1-7; amount within Q1 procurement authority limits.",
  "reviewerId": "demo-compliance-officer",
  "reviewerEmail": "compliance@clearagent.io",
  "reviewerRole": "compliance_officer",
  "overrideDecision": "approved"
}
BODY
)")
  REVIEW_ID=$(echo "$REVIEW" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || fail "Review failed")
  ok "Human review logged → review: $REVIEW_ID"
  ok "Review is cryptographically bound to event contentHash (non-repudiation)"
else
  ok "No review required — decision confidence above threshold"
fi

# ── Step 6: Audit integrity + export (Art. 12 + 19) ─────────────

step "6/6 — Audit integrity + export (EU AI Act Art. 12 + 19)"
INTEGRITY=$(api GET /v1/audit/integrity)
VALID=$(echo "$INTEGRITY" | python3 -c "import sys,json; print(json.load(sys.stdin)['validChain'])" 2>/dev/null || echo "False")
TOTAL=$(echo "$INTEGRITY" | python3 -c "import sys,json; print(json.load(sys.stdin)['totalEvents'])" 2>/dev/null || echo "0")
MERKLE=$(echo "$INTEGRITY" | python3 -c "import sys,json; m=json.load(sys.stdin)['merkleRoot']; print(m[:16]+'…'+m[-8:] if m else 'none')" 2>/dev/null || echo "none")

if [ "$VALID" = "True" ] || [ "$VALID" = "true" ]; then
  ok "Hash chain:   INTACT ($TOTAL events)"
else
  warn "Hash chain:   BROKEN — investigate immediately"
fi
ok "Merkle root:  $MERKLE"

EXPORT=$(api GET "/v1/audit/export?authority_name=BaFin&authority_ref=DEMO-$(date +%Y%m%d)")
FILE_HASH=$(echo "$EXPORT" | python3 -c "import sys,json; h=json.load(sys.stdin)['fileHash']; print(h[:16]+'…'+h[-8:])" 2>/dev/null || echo "unknown")
ok "Audit export: generated (fileHash: $FILE_HASH)"

# ── Summary ────────────────────────────────────────────────────

echo
echo "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo "${BOLD}  Demo complete — EU AI Act compliance lifecycle:${RESET}"
echo "  Art. 12  Append-only audit trail, SHA-256 hash chain"
echo "  Art. 14  Human oversight with mandatory justification"
echo "  Art. 19  Regulator-ready export with SHA-256 file hash"
echo
echo "  Event:   $EVENT_ID"
echo "  Chain:   ${CONTENT_HASH:0:16}…"
echo "  Merkle:  $MERKLE"
echo "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo
