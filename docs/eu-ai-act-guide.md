# EU AI Act Compliance Guide

## Why This Matters

The EU AI Act is the first comprehensive legal framework regulating AI systems. For organizations operating high-risk AI systems — including AI agents that make decisions about financial transactions, credit, hiring, or critical infrastructure — compliance is not optional.

Non-compliance with the provisions below carries fines of **up to 4% of global annual revenue or €20 million**, whichever is higher. The compliance deadline for Articles 12, 14, and 19 is **August 2026**.

ClearAgent addresses the audit trail and human oversight requirements. It does not address all EU AI Act obligations (e.g., conformity assessment, risk management documentation, or prohibited practice prohibitions). ClearAgent is infrastructure for one part of a broader compliance program.

## Enforcement Timeline

| Date | Milestone |
|------|-----------|
| August 2024 | EU AI Act enters into force |
| August 2025 | Prohibited AI practices (Art. 5) banned |
| August 2026 | High-risk AI system obligations in force (Art. 12, 14, 19) |
| August 2027 | General purpose AI model obligations |

High-risk AI systems (Annex III) include: biometric identification, critical infrastructure management, education and vocational training, employment and worker management, access to essential services, law enforcement, migration and border control, administration of justice.

## Article 12: Logging and Traceability

### What the regulation requires

> "High-risk AI systems shall be designed and developed with capabilities enabling the automatic recording of events ('logs') throughout the lifetime of the system... The logging capabilities shall ensure a level of traceability of the AI system's functioning throughout its lifecycle..."

Key requirements:
- Automatic logging of events during operation
- Logs sufficient to identify the period of operation
- Logs sufficient to identify inputs that led to outputs
- Tamper-evident records

### How ClearAgent implements Article 12

**Automatic logging** — Every call to `POST /v1/events/verify` creates a permanent record in `verification_events` regardless of the verification outcome. Logging is not optional per-request.

**Input traceability** — The `input_hash` field stores SHA-256 of the full input payload. The `input_payload` field stores the payload itself (JSONB). Regulators can verify that a logged input hash matches a specific payload.

**Chain traceability** — `session_id` groups events within a single agent session. `parent_event_id` links events in multi-step decision chains. `sequence_num` orders events within a session.

**Tamper evidence** — The hash chain makes tampering detectable:
```
event[n].prevHash == event[n-1].contentHash
```
Breaking or modifying any event in the chain will cause the Merkle root to diverge from the stored checkpoint. The integrity endpoint checks this on demand.

**Immutability at the database layer** — A PostgreSQL trigger raises an exception on any UPDATE attempt against `verification_events`. A PostgreSQL rule discards DELETE attempts. These cannot be bypassed through the application — they operate at the database level.

### Verifying Article 12 compliance

```bash
# Check hash chain integrity
curl http://localhost:3000/v1/audit/integrity \
  -H "Authorization: Bearer $API_KEY"

# Response includes:
# - totalEvents: number of events checked
# - validChain: true if all prevHash links are valid
# - merkleRoot: current Merkle root
# - brokenAt: event ID where chain breaks (if any)
```

## Article 14: Human Oversight

### What the regulation requires

> "High-risk AI systems shall be designed and developed in such a way, including with appropriate human-machine interface tools, that they can be effectively overseen by natural persons during the period in which the AI systems are in use..."

Key requirements:
- Humans must be able to understand and monitor the system's operation
- Humans must be able to intervene and correct outputs
- Humans must be able to suspend or stop the system
- Human oversight decisions must be documented

### How ClearAgent implements Article 14

**Oversight policy triggers** — `oversight_policies` defines conditions that require human review before an agent decision takes effect. Example: confidence below 0.85 automatically sets `requires_review = true` on the event.

**Human review workflow** — When `requires_review = true`, the compliance team must submit a review via `POST /v1/reviews`. Three actions are supported:
- `approve` — Accept the AI's original decision
- `reject` — Block the AI's decision
- `override` — Replace the AI's decision with the reviewer's decision

**Mandatory justification** — The `justification` field is required and must be at least 10 characters. This is enforced in the Zod schema. Empty or generic justifications are rejected at the API layer.

**Reviewer identity logging** — Every review records `reviewer_id`, `reviewer_email`, and `reviewer_role`. This creates an auditable chain of who reviewed what, when, and why.

**Agent suspension (the stop button)** — Compliance teams can immediately suspend any agent:
```bash
curl -X PATCH http://localhost:3000/v1/agents/AGENT_ID/status \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "suspended" }'
```
Suspended agents can still be verified (their history is preserved), but the status change is visible in all subsequent queries.

**Review immutability** — Human reviews are stored in `human_reviews` with the same append-only guarantee as verification events. No review can be silently deleted or modified. Override decisions cannot be quietly reverted.

### Submitting a human review

```bash
curl -X POST http://localhost:3000/v1/reviews \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_UUID",
    "action": "override",
    "justification": "Amount exceeds quarterly vendor limit per finance policy FP-2026-Q1. Reducing to approved threshold.",
    "reviewerId": "compliance-officer-001",
    "reviewerEmail": "compliance@example.com",
    "reviewerRole": "compliance_officer",
    "overrideDecision": "rejected"
  }'
```

## Article 19: Record Keeping

### What the regulation requires

> "Providers of high-risk AI systems shall keep the logs... for a period appropriate to the intended purpose of the high-risk AI system, for at least 6 months..."

Key requirements:
- Logs must be retained for minimum 6 months (longer for many use cases)
- Logs must be accessible to national competent authorities upon request
- Export of logs must be possible in a structured format

### How ClearAgent implements Article 19

**Retention field** — Every `verification_event` has a `retention_expires_at` field set at insert time based on the organization's `data_retention_days` setting (default: 3,650 days / 10 years). This exceeds the minimum by a wide margin for most use cases.

**Structured export** — `GET /v1/audit/export` produces a JSON export of all events matching the requested filters, including:
- Full event payloads
- Hash values
- Human reviews linked to events
- SHA-256 hash of the export file itself

**Export audit trail** — Every export request is logged to `audit_exports` with:
- Who requested it (`requested_by`, `requester_role`)
- What filters were applied (`filters_applied`)
- How many records were included (`record_count`)
- The SHA-256 hash of the export file (`file_hash`)
- Optional regulatory authority reference (`authority_name`, `authority_ref`)

**Export for a regulatory authority**:
```bash
curl "http://localhost:3000/v1/audit/export?authority_name=BaFin&authority_ref=INQ-2026-4421" \
  -H "Authorization: Bearer $API_KEY" \
  -o compliance_export.json

# Verify export integrity
sha256sum compliance_export.json
# Cross-check this hash with the file_hash stored in audit_exports
```

## Compliance Gaps

ClearAgent is honest about what is not yet implemented:

| Gap | Impact | Status |
|-----|--------|--------|
| Retention enforcement | `retention_expires_at` is set but records are not automatically purged when they expire | On roadmap |
| XML export | Regulatory authorities may require XML format; only JSON is currently supported | On roadmap |
| RFC 3161 timestamp anchoring | Cryptographic proof of when events were recorded via trusted timestamp authority | On roadmap |

These gaps are tracked as issues. If your regulatory context requires one of these urgently, open a compliance gap issue — those are treated as high priority.

## Using the Compliance Endpoints

### Check hash chain integrity

```bash
GET /v1/audit/integrity
Authorization: Bearer $API_KEY
```

Response:
```json
{
  "totalEvents": 80,
  "validChain": true,
  "merkleRoot": "a3f1c2d4...",
  "checkedAt": "2026-04-05T10:00:00Z",
  "brokenAt": null
}
```

### Export compliance package

```bash
GET /v1/audit/export
Authorization: Bearer $API_KEY

# Optional query params:
# ?from=2026-01-01T00:00:00Z
# ?to=2026-04-05T00:00:00Z
# ?agent_id=AGENT_UUID
# ?authority_name=BaFin
# ?authority_ref=INQ-2026-4421
```

### Submit human review

```bash
POST /v1/reviews
Authorization: Bearer $API_KEY
Content-Type: application/json

{
  "eventId": "EVENT_UUID",
  "action": "approve" | "reject" | "override",
  "justification": "Minimum 10 characters. Be specific.",
  "reviewerId": "your-reviewer-id",
  "reviewerEmail": "reviewer@example.com",
  "reviewerRole": "compliance_officer",
  "overrideDecision": "rejected"  // required if action = override
}
```
