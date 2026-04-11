# ClearAgent Launch Thread — 10 Tweets

## Thread

---

**Tweet 1 (Hook)**
The EU AI Act goes into full enforcement August 2026.

Every company deploying AI agents in Europe needs to prove every decision was
logged, reviewable, and tamper-evident.

Most aren't ready. We built the infrastructure.

🧵

---

**Tweet 2 (The problem)**
Current tools log what your AI did.

That's not what EU regulators need.

They need *tamper-evident evidence* that the log was never modified after the
fact. There's a difference between "we have logs" and "we can prove the logs
are authentic."

---

**Tweet 3 (The law)**
EU AI Act Articles 12, 14, 19 require:

→ Art. 12: Immutable log of every AI decision
→ Art. 14: Human review workflow for high-risk decisions
→ Art. 19: Signed audit exports you can hand to BaFin or the FCA

Penalty for non-compliance: up to 4% of global annual revenue.

---

**Tweet 4 (The solution)**
ClearAgent builds a SHA-256 hash chain over every AI agent decision.

Each event is cryptographically linked to the previous one. Change one record
and the entire chain breaks. A PostgreSQL trigger raises an exception on any
UPDATE — the immutability is enforced at the database level.

---

**Tweet 5 (Show the code)**
```typescript
const { jobId } = await ca.events.verify({
  input: { amount: 1500, currency: "EUR" }
});

const result = await ca.jobs.poll(jobId);
// result.contentHash is your legal evidence
// result.requiresReview tells you if Art. 14 applies
```

One API call. One content hash. Admissible evidence.

---

**Tweet 6 (Human oversight — Art. 14)**
Low-confidence decisions are automatically routed to human reviewers.

SLA timers enforced via BullMQ. Miss the deadline and the system escalates.

Every review is cryptographically bound to the exact event version the reviewer
saw — reviewers can't deny what they approved.

---

**Tweet 7 (Audit export — Art. 19)**
When a regulator asks for your audit trail, you export a signed manifest:

```bash
GET /v1/audit/export?format=xml&authority_name=BaFin
```

Each export is chained to the previous one (prevExportHash).
Chain of exports = chain of custody.

---

**Tweet 8 (Demo GIF)**
[DEMO GIF — register → verify → poll → integrity check]

From git clone to verified event in under 5 minutes:

```bash
git clone https://github.com/Sanjaayyy7/clearagent
bash scripts/quickstart.sh
```

---

**Tweet 9 (MCP / Claude integration)**
ClearAgent ships as an MCP server.

Claude can call `clearagent_verify`, `clearagent_poll`,
`clearagent_audit_integrity`, and `clearagent_submit_review` directly.

Your AI agent can audit itself. That's the recursion regulators want.

---

**Tweet 10 (CTA)**
ClearAgent is MIT-licensed. Self-host forever.

We're looking for design partners — EU fintechs, AI-native startups,
compliance teams building for the August 2026 deadline.

If that's you: star the repo and open a GitHub Discussion.

→ github.com/Sanjaayyy7/clearagent

---

## Notes for Zara

- Tweet 5 should use the actual demo GIF once recorded
- Tweet 8 embed: swap placeholder for real asciinema → GIF once Story 7.4 done
- Post the thread on a Tuesday or Wednesday morning (9–11am ET) for max dev reach
- Pin a reply with the quickstart link after thread goes live
- Cross-post to LinkedIn (longer format — expand Tweet 3 into a full paragraph)
