# API Reference

Base URL: `http://localhost:3000` (development)

## Authentication

All endpoints except `GET /v1/health` require authentication.

**Option 1 — Authorization header (recommended):**
```
Authorization: Bearer <api_key>
```

**Option 2 — Query parameter (required for SSE/EventSource):**
```
?api_key=<api_key>
```

The query parameter form is necessary for browser `EventSource` connections, which cannot set custom headers.

**Demo key (local development only):**
```
ca_test_demo_key_clearagent_2026
```

---

## GET /v1/health

Health check. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-05T10:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/v1/health
```

---

## POST /v1/events/verify

Submit an AI agent decision for verification. Returns immediately with a `jobId`. Poll `GET /v1/jobs/:jobId` for the result, or listen via `GET /v1/events/stream`.

**Authentication:** Required

**Request body:**
```typescript
{
  eventType?: string           // default: "settlement_signal"
  eventCategory?: string       // default: "transaction"
  input: {
    amount: number             // positive number
    currency: string           // 3-character ISO code (e.g. "USD")
    recipient: string          // non-empty string
    purpose: string            // non-empty string (≥10 chars recommended)
    agentContext?: string
    constraints?: {
      maxAmount?: number
      allowedCurrencies?: string[]
      requiresPurpose?: boolean
    }
  }
  sessionId?: string           // UUID — groups events in a session
  parentEventId?: string       // UUID — links to parent event in chain
  sequenceNum?: number         // default: 0
}
```

**Response: 202 Accepted**
```json
{
  "jobId": "V1StGXR8_Z5jdHi6B-myT",
  "status": "queued"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/events/verify \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "amount": 4500,
      "currency": "USD",
      "recipient": "Acme Supplier Ltd",
      "purpose": "Monthly software license invoice INV-2026-0312"
    }
  }'
```

**Example response:**
```json
{
  "jobId": "V1StGXR8_Z5jdHi6B-myT",
  "status": "queued"
}
```

---

## GET /v1/jobs/:jobId

Poll the status of an async verification job.

**Authentication:** Required

**Path parameter:** `jobId` — the ID returned by `POST /v1/events/verify`

**Response: 200 OK**
```json
{
  "jobId": "V1StGXR8_Z5jdHi6B-myT",
  "status": "completed",
  "eventId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "contentHash": "a1b2c3d4e5f6...",
  "requiresReview": false,
  "createdAt": "2026-04-05T10:00:00.000Z",
  "updatedAt": "2026-04-05T10:00:00.234Z"
}
```

`status` values: `queued | processing | completed | failed`

**Example:**
```bash
curl http://localhost:3000/v1/jobs/V1StGXR8_Z5jdHi6B-myT \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026"
```

---

## GET /v1/events

List verification events with filtering and cursor pagination.

**Authentication:** Required

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent_id` | UUID | Filter by agent |
| `status` | string | `pending \| verified \| failed \| flagged` |
| `decision` | string | `approved \| rejected \| flagged` |
| `from` | ISO 8601 | Events after this timestamp |
| `to` | ISO 8601 | Events before this timestamp |
| `cursor` | string | Pagination cursor from previous response |
| `limit` | number | Page size (default: 20, max: 100) |

**Response: 200 OK**
```json
{
  "events": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "agentId": "agent-uuid",
      "eventType": "settlement_signal",
      "eventCategory": "transaction",
      "decision": "approved",
      "confidence": 0.9234,
      "requiresReview": false,
      "contentHash": "a1b2c3d4...",
      "prevHash": "f6e5d4c3...",
      "occurredAt": "2026-04-05T10:00:00.000Z",
      "recordedAt": "2026-04-05T10:00:00.156Z"
    }
  ],
  "nextCursor": "eyJpZCI6Ii4uLiJ9",
  "hasMore": true
}
```

**Example:**
```bash
curl "http://localhost:3000/v1/events?decision=flagged&limit=10" \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026"
```

---

## GET /v1/events/:id

Get a single verification event with its linked human reviews.

**Authentication:** Required

**Path parameter:** `id` — event UUID

**Response: 200 OK**
```json
{
  "event": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "agentId": "agent-uuid",
    "eventType": "settlement_signal",
    "decision": "flagged",
    "confidence": 0.7123,
    "reasoning": "Amount approaches policy limit. Purpose description borderline.",
    "requiresReview": true,
    "contentHash": "a1b2c3d4...",
    "inputPayload": { "amount": 9800, "currency": "USD", ... },
    "euAiActArticles": ["art-12", "art-14"],
    "riskIndicators": { "highAmount": true, "borderlinePurpose": true },
    "occurredAt": "2026-04-05T10:00:00.000Z"
  },
  "reviews": [
    {
      "id": "review-uuid",
      "action": "override",
      "reviewerEmail": "compliance@example.com",
      "reviewerRole": "compliance_officer",
      "originalDecision": "flagged",
      "overrideDecision": "rejected",
      "justification": "Vendor not on approved list. Amount requires CFO approval.",
      "reviewCompletedAt": "2026-04-05T10:15:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/v1/events/3fa85f64-5717-4562-b3fc-2c963f66afa6 \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026"
```

---

## GET /v1/events/stream

Real-time Server-Sent Events stream. Delivers new verification events as they are created.

**Authentication:** Required (query parameter only — `EventSource` cannot set headers)

**Response:** `text/event-stream`

Each event:
```
event: verification
data: {"id":"...","decision":"approved","confidence":0.95,"requiresReview":false,"contentHash":"...","recordedAt":"..."}
```

**Browser example (JavaScript):**
```javascript
const source = new EventSource(
  'http://localhost:3000/v1/events/stream?api_key=ca_test_demo_key_clearagent_2026'
);

source.addEventListener('verification', (e) => {
  const event = JSON.parse(e.data);
  console.log('New event:', event.decision, event.contentHash);
});

source.onerror = () => {
  console.log('SSE connection error — will reconnect');
};
```

**curl example:**
```bash
curl -N "http://localhost:3000/v1/events/stream?api_key=ca_test_demo_key_clearagent_2026"
```

---

## POST /v1/reviews

Submit a human review of a verification event. Required when `requiresReview = true` (EU AI Act Art. 14).

**Authentication:** Required

**Request body:**
```typescript
{
  eventId: string            // UUID of the event to review
  action: "approve" | "reject" | "override"
  justification: string      // Minimum 10 characters. Required by EU AI Act Art. 14.
  reviewerId: string         // Your identifier for the reviewer
  reviewerEmail: string      // Valid email address
  reviewerRole: string       // e.g. "compliance_officer", "risk_manager"
  overrideDecision?: string  // Required if action = "override": the new decision
}
```

**Response: 201 Created**
```json
{
  "reviewId": "review-uuid",
  "eventId": "event-uuid",
  "action": "override",
  "contentHash": "b2c3d4e5...",
  "reviewCompletedAt": "2026-04-05T10:15:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/reviews \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "action": "override",
    "justification": "Vendor not on approved supplier list per policy FP-2026-Q1. Requires CFO sign-off.",
    "reviewerId": "jane.smith-001",
    "reviewerEmail": "jane.smith@example.com",
    "reviewerRole": "compliance_officer",
    "overrideDecision": "rejected"
  }'
```

---

## GET /v1/audit/integrity

Verify the hash chain integrity and compute the current Merkle root. Use this to demonstrate EU AI Act Art. 12 tamper evidence to regulators.

**Authentication:** Required

**Response: 200 OK**
```json
{
  "totalEvents": 80,
  "validChain": true,
  "merkleRoot": "a3f1c2d4e5b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
  "checkedAt": "2026-04-05T10:00:00.000Z",
  "brokenAt": null
}
```

If the chain is broken:
```json
{
  "totalEvents": 80,
  "validChain": false,
  "merkleRoot": "...",
  "checkedAt": "2026-04-05T10:00:00.000Z",
  "brokenAt": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

**Example:**
```bash
curl http://localhost:3000/v1/audit/integrity \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026"
```

---

## GET /v1/audit/export

Export a compliance package as JSON with SHA-256 file hash. Logged permanently to `audit_exports` (EU AI Act Art. 19).

**Authentication:** Required

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | ISO 8601 | Export events after this timestamp |
| `to` | ISO 8601 | Export events before this timestamp |
| `agent_id` | UUID | Filter by agent |
| `authority_name` | string | Regulatory authority name (logged) |
| `authority_ref` | string | Authority's reference number (logged) |

**Response: 200 OK**

Returns a JSON object with the full compliance export plus metadata:
```json
{
  "exportId": "export-uuid",
  "generatedAt": "2026-04-05T10:00:00.000Z",
  "fileHash": "sha256:a1b2c3d4...",
  "recordCount": 80,
  "filters": { "from": "2026-01-01T00:00:00Z" },
  "events": [ ... ],
  "reviews": [ ... ]
}
```

**Example:**
```bash
curl "http://localhost:3000/v1/audit/export?from=2026-01-01T00:00:00Z&authority_name=BaFin&authority_ref=INQ-2026-4421" \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026" \
  -o compliance_export.json

# Verify the file hash matches what was recorded
sha256sum compliance_export.json
```

---

## POST /v1/agents/register

Register an AI agent under compliance oversight.

**Authentication:** Required

**Request body:**
```typescript
{
  name: string               // Display name
  externalId: string         // Your internal identifier for this agent
  modelProvider?: string     // e.g. "anthropic", "openai"
  modelId?: string           // e.g. "claude-sonnet-4-6"
  description?: string
}
```

**Response: 201 Created**
```json
{
  "agentId": "agent-uuid",
  "name": "Procurement Agent",
  "externalId": "procurement-v2",
  "status": "active",
  "registeredAt": "2026-04-05T10:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/agents/register \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Procurement Agent",
    "externalId": "procurement-v2",
    "modelProvider": "anthropic",
    "modelId": "claude-sonnet-4-6",
    "description": "Handles vendor payment approvals up to $10,000"
  }'
```

---

## PATCH /v1/agents/:id/status

Update an agent's operational status. Use `suspended` to immediately stop an agent from processing (EU AI Act Art. 14 "stop button").

**Authentication:** Required

**Path parameter:** `id` — agent UUID

**Request body:**
```typescript
{
  status: "active" | "suspended" | "flagged"
}
```

**Response: 200 OK**
```json
{
  "agentId": "agent-uuid",
  "status": "suspended",
  "updatedAt": "2026-04-05T10:00:00.000Z"
}
```

**Example:**
```bash
# Suspend an agent immediately
curl -X PATCH http://localhost:3000/v1/agents/AGENT_UUID/status \
  -H "Authorization: Bearer ca_test_demo_key_clearagent_2026" \
  -H "Content-Type: application/json" \
  -d '{ "status": "suspended" }'
```
