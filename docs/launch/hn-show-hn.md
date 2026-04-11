# Show HN: ClearAgent — open-source compliance infrastructure for AI agents (EU AI Act)

## Draft

**Title:** Show HN: ClearAgent – open-source audit trail for AI agent decisions (EU AI Act)

---

**Body:**

We built ClearAgent because the EU AI Act enforcement deadline (August 2026) is
real, the penalty is up to 4% of global revenue, and every existing tool is
focused on payment rails instead of compliance evidence.

ClearAgent is a verification-only protocol: AI agents emit every decision through
our API, which builds a tamper-evident SHA-256 hash chain and creates a
court-admissible audit trail. We don't touch money. We don't process payments.
We produce the evidence regulators actually need.

**What it does:**

- Appends every agent decision to an immutable hash chain (PostgreSQL trigger blocks all UPDATEs)
- Computes a Merkle root after each event for external anchoring
- Routes low-confidence decisions to human reviewers with SLA enforcement (Art. 14)
- Exports signed audit manifests in JSON or XML for regulator submission (Art. 19)

**5-minute demo:**

```bash
git clone https://github.com/Sanjaayyy7/clearagent
bash scripts/quickstart.sh
```

**MCP integration** — Claude can call `clearagent_verify`, `clearagent_poll`,
`clearagent_audit_integrity`, and `clearagent_submit_review` directly.

**TypeScript SDK:**
```typescript
const { jobId } = await ca.events.verify({ input: { amount, recipient } });
const result = await ca.jobs.poll(jobId);
// contentHash is your evidence
```

**Python SDK (alpha):** `pip install -e ./packages/sdk-python`

We're looking for design partners — specifically compliance officers at EU fintechs,
AI-native startups building agents in regulated industries, and anyone building for
the August 2026 deadline.

Stack: TypeScript · Express · BullMQ · PostgreSQL · Redis · React

---

## Pre-empted HN concerns

**"How is this different from LangSmith/LangFuse?"**
LangSmith/LangFuse are observability tools — they show you what happened. We
produce tamper-evident legal evidence of what happened. The difference is a
PostgreSQL trigger that raises an exception on any UPDATE vs. a log you could
modify. EU regulators need the former.

**"Another compliance tool nobody will use until forced to."**
Correct — that's why we built for the forced timeline (August 2026). The penalty
structure (4% global revenue) makes this a board-level risk, not a dev team
discretionary project.

**"EU AI Act isn't real / will be delayed."**
High-risk system obligations under Articles 12, 14, 19 have been in force since
August 2024. The compliance deadline for AI systems already deployed is August
2026. This is not speculative.

**"Why not just use a blockchain?"**
Blockchains add latency, cost, and external dependencies without adding legal
clarity. A SHA-256 hash chain with RFC 3161 timestamp anchoring provides the
same non-repudiation properties at sub-millisecond overhead. We have a field
for RFC 3161 integration — it's on the roadmap.

**"What's your business model?"**
Cloud-hosted version with SLA guarantees and managed compliance reporting.
Self-host is always free (MIT). We're pre-revenue, talking to design partners.
