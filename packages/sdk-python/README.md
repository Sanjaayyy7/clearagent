# ClearAgent Python SDK (alpha)

EU AI Act compliance infrastructure — Articles 12, 14, 19.

> **Alpha release.** Not yet published to PyPI. Install from source.

## Installation

```bash
pip install httpx
pip install -e ./packages/sdk-python   # from repo root
```

## Quick Start

```python
from clearagent import ClearAgentClient

ca = ClearAgentClient(
    api_key="ca_live_...",
    base_url="http://localhost:3000",   # or your production URL
)

# Submit a verification event (EU AI Act Art. 12)
job = ca.events.verify(
    input={"amount": 1500, "currency": "EUR", "recipient": "DE89370400440532013000"},
    event_type="settlement_signal",
    event_category="transaction",
)

# Poll until complete
result = ca.jobs.poll(job["jobId"])
print(f"Decision: {result['status']} · Hash: {result['eventId']}")

# Human review if flagged (EU AI Act Art. 14)
if result.get("requiresReview"):
    ca.reviews.submit(
        event_id=result["eventId"],
        action="approve",
        justification="Verified by compliance team — supplier invoice confirmed",
        reviewer_id="alice@acme.com",
        reviewer_email="alice@acme.com",
        reviewer_role="compliance_officer",
    )

# Audit integrity (EU AI Act Art. 19)
integrity = ca.audit.integrity()
print(f"Chain valid: {integrity['validChain']} · Events: {integrity['totalEvents']}")

# Compliance export
export = ca.audit.export(authority_name="BaFin", authority_ref="INQ-2026-01")
# or XML: ca.audit.export(format="xml")
```

## API Reference

### `ClearAgentClient(api_key, base_url, timeout)`

| Resource | Methods |
|----------|---------|
| `ca.agents` | `register()`, `suspend()`, `activate()`, `flag()`, `list()` |
| `ca.events` | `verify()`, `get()`, `list()` |
| `ca.jobs` | `get()`, `poll()` |
| `ca.reviews` | `submit()` |
| `ca.audit` | `integrity()`, `export()` |

### Context manager

```python
with ClearAgentClient(api_key="ca_live_...") as ca:
    job = ca.events.verify(input={...})
```

## Requirements

- Python ≥ 3.10
- `httpx >= 0.27`

## TypeScript SDK

The canonical SDK is `@clearagent/sdk` (TypeScript). This Python SDK mirrors
its API surface for parity. See `packages/sdk/` in the monorepo.
