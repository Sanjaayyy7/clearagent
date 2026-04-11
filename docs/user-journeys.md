# User Journey Maps — ClearAgent

Three ICP journeys: trigger → discovery → integration → value → renewal

---

## ICP 1: Compliance Officer at EU Fintech

**Profile:** Elena, Chief Compliance Officer at a Series B German fintech.
Responsible for EU AI Act readiness. Reports to the board. August 2026 deadline
is on her risk register.

---

### Trigger

Elena's legal team flags that their credit-scoring AI (Article 6, Annex III —
high-risk system) needs to comply with Art. 12, 14, 19 by August 2026.
A KPMG audit says their current logging infrastructure ("we have CloudWatch")
doesn't meet the tamper-evidence standard. The penalty exposure is €40M.

### Discovery

Elena searches "EU AI Act Art. 12 compliance tool" and "tamper-evident AI audit
trail." She finds ClearAgent on GitHub via a Hacker News Show HN post. The README's
first line — *"verification-only protocol, not payment rails"* — immediately
resonates: every other tool she's evaluated is bundled with payment features she
doesn't need.

She reads `docs/eu-ai-act-guide.md` in 15 minutes. The mapping of each endpoint
to specific Article obligations is exactly what she needs to show external auditors.

### Integration

Elena loops in her platform engineering team. They run `bash scripts/quickstart.sh`
and have a working integration in 40 minutes. The BullMQ SLA enforcement for Art. 14
reviews maps directly to their existing compliance workflow.

They create a custom oversight policy:
```bash
POST /v1/policies
{
  "name": "High-value credit decisions",
  "triggerConditions": { "confidence_below": 0.92 },
  "slaSeconds": 7200,
  "reviewerRole": "credit_compliance_officer"
}
```

### Value

3 weeks later, the BaFin sends a routine inquiry. Elena runs:
```bash
GET /v1/audit/export?format=xml&authority_name=BaFin&authority_ref=INQ-2026-14
```

The signed XML export — with chained `prevExportHash` linking back 6 months of
exports — is sent within 4 hours. BaFin responds that the chain-of-custody
documentation is "fully compliant."

### Renewal

Elena becomes a design partner. Her team contributes the RFC 3161 timestamp
anchoring integration (currently on the roadmap). She refers two other fintechs
in her network. On renewal: upgrades to cloud-hosted tier for managed SLA
reporting and 99.9% uptime SLA.

---

## ICP 2: Platform Engineer at AI-Native Startup

**Profile:** Dev, senior backend engineer at a 15-person UK AI startup building
autonomous agents for legal document review. Has no compliance officer — "the
engineers own compliance."

---

### Trigger

Dev's startup closes a Series A. The term sheet includes a clause: "Company must
demonstrate EU AI Act Art. 12 compliance within 90 days." Dev is assigned to
own this. He knows nothing about the EU AI Act but is comfortable with TypeScript
and APIs.

### Discovery

Dev finds ClearAgent on GitHub via the `eu-ai-act` topic. He reads the README
top-to-bottom in 10 minutes. The SDK example looks identical to calling any other
API — no compliance jargon required.

```typescript
const result = await ca.jobs.poll(jobId);
// result.contentHash is your evidence
```

He opens `docs/architecture.md` and understands the hash chain in one read.
The MCP server section makes him realise he can verify Claude's outputs directly.

### Integration

Dev runs `npm install @clearagent/sdk` and has the first event verified in 45
minutes. He wraps every agent decision in `ca.events.verify()` — 3 hours of
work across 4 agent routes. The `requiresReview` flag auto-routes flagged
decisions to their internal Slack channel via a webhook.

### Value

During a client demo, the client's legal team asks: "Can you show us that the AI
didn't change its output after the fact?" Dev runs `GET /v1/audit/integrity`
live in the demo. `validChain: true`. `totalEvents: 847`. The Merkle root
matches the checkpoint from 3 months ago. The client signs the contract.

### Renewal

Dev shares a blog post: "How we got EU AI Act compliant in a weekend." It drives
220 GitHub stars in 48 hours. He contributes the Slack webhook integration as an
open-source example. On renewal: upgrades to team plan for multi-org support as
they onboard enterprise clients.

---

## ICP 3: Open Source Contributor / Self-Hoster

**Profile:** Yuki, senior ML engineer at a large tech company. Self-hosts
everything. Builds side projects. Active on GitHub. Interested in compliance
tooling as a topic.

---

### Trigger

Yuki sees the HN Show HN thread and finds the SHA-256 hash chain implementation
interesting as an engineering problem. The immutability trigger (`RAISE EXCEPTION`
on any UPDATE) strikes her as an elegant solution to a hard problem.

### Discovery

She clones the repo, runs `docker compose up -d && npm run db:migrate && npm run seed`
and has a working local instance in 8 minutes. She reads `services/hashChain.ts`
and opens a GitHub Discussion asking about the RFC 3161 anchoring roadmap.

### Integration

Yuki doesn't have a compliance use case — she's building a personal AI agent
framework. She integrates ClearAgent as the audit layer for her personal agents
"for fun." She finds a bug in the Merkle root computation for empty hash arrays
and opens a PR.

### Value

The PR is merged. She becomes a recurring contributor. She builds a Ruby client
library and open-sources it as `clearagent-rb`. She speaks about the hash chain
architecture at a local meetup. Three attendees sign up for the cloud waitlist.

### Renewal

Yuki becomes a maintainer. She owns the RFC 3161 anchoring integration. Her
contributions compound: Ruby gem → Helm chart → GitHub Action for automated
compliance reports. She refers two enterprise colleagues who become paying customers.

---

## Cross-ICP Patterns

| Stage | ICP 1 (Compliance) | ICP 2 (Engineering) | ICP 3 (OSS) |
|-------|-------------------|---------------------|-------------|
| Trigger | Regulatory deadline | VC term sheet | Engineering curiosity |
| Discovery | HN + eu-ai-act search | GitHub topic + npm | HN thread |
| Time to first event | 40 min | 45 min | 8 min |
| Integration depth | Deep (custom policies, XML export) | Medium (SDK + webhook) | Exploratory |
| Value moment | BaFin inquiry answered in 4h | Live demo → signed contract | PR merged |
| Expansion path | Cloud tier + referrals | Team plan + enterprise | Maintainer + referrals |
