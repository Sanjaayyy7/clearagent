# ClearAgent — YC S26 Application
# Deadline: May 4, 2026

---

## Company

**Company name:** ClearAgent
**URL:** https://clearagent.ai
**Tagline:** Tamper-evident audit trail for AI agent decisions. EU AI Act compliance infrastructure.

---

## What does your company do?

ClearAgent is the audit trail and human oversight layer for AI agents. When an AI agent makes a decision — approving a payment, flagging a job applicant, denying a loan — ClearAgent records it cryptographically, enforces human review when required, and produces the compliance evidence regulators can inspect.

The core is a SHA-256 hash chain: every agent decision is linked to the previous one so that any tampering — editing, deleting, reordering — is mathematically detectable. We add mandatory human review workflows, a real-time compliance dashboard, and structured exports mapped to EU AI Act Articles 12, 14, and 19.

We are not an AI agent framework. We are not payment rails. We are the one piece every AI agent deployment is missing: proof that it happened, proof a human checked it, proof the record wasn't changed.

---

## What's your progress?

- **Production deployed:** All 5 services live on Railway (API, dashboard, landing, MCP server, SDK)
- **SDK:** `@clearagent/sdk@1.0.0` — TypeScript client with verify, poll, review, audit, policies, and attestation
- **API endpoints:** 15+ endpoints covering event verification, human reviews, audit exports, compliance scoring, agent attestation
- **Compliance coverage:** EU AI Act Art. 12 (hash chain logging), Art. 14 (human oversight), Art. 19 (structured export)
- **Test coverage:** 117+ test cases across cryptographic hash chain, audit export, human review, and agent suspension flows
- **MCP server:** Claude Desktop integration — AI models can natively call ClearAgent to verify their own decisions
- **RFC 3161 timestamp anchoring:** Connects to DigiCert TSA for legally-recognized external timestamps
- **Compliance score API:** Real-time 0-100 score per organization with Article-by-Article breakdown and countdown to August 2026 enforcement

---

## Why did you pick this idea?

The EU AI Act enforcement deadline is August 2026. Articles 12, 14, and 19 require that companies running high-risk AI systems maintain automatic logs, enforce human oversight, and keep records available for regulators. The penalty is up to 4% of global annual revenue.

Every company deploying AI agents in financial services, healthcare, or HR is either building this themselves, paying consultants to write policies that don't connect to their code, or hoping the regulation doesn't apply to them. None of those strategies work.

The specific insight: audit infrastructure is fundamentally different from the AI agents being audited. The books shouldn't be kept by the treasurer. ClearAgent sits outside the stack being monitored — we only receive the output signal from agent decisions, never the agents themselves. This narrow scope is the product. It means we integrate with anything, compete with no one's core business, and have zero regulatory surface of our own.

---

## What's your unfair advantage?

**1. Regulatory specificity.** We don't do "AI governance" broadly. Our feature set maps to three specific Articles in a specific law with a specific enforcement date. When a compliance team asks "what do I need for August 2026," our answer is precise.

**2. Developer-first, regulator-proven.** `npm install @clearagent/sdk` and five function calls. No procurement cycle. But the output — the hash chain, the Merkle root, the RFC 3161 timestamp — is legally defensible. We meet both buyers: the developer integrating it and the compliance team signing off on it.

**3. Cryptographic architecture.** We don't just log events. The hash chain makes tampering mathematically detectable. The Postgres immutability triggers operate at the database level — no application code can bypass them. This is verifiable by any external auditor.

**4. Open source core.** An audit trail that is itself opaque is a contradiction. The hash chain implementation, canonical JSON serialization, and integrity verification are all MIT licensed. Customers can audit the auditor.

**5. MCP-native.** We are the only audit infrastructure that runs as an MCP server. AI models can verify their own decisions by calling ClearAgent directly — no wrapper code needed.

---

## Who are your competitors and what makes you different?

**Payment rail players (Skyfire, Nevermined, Stripe ACP):** They're solving how AI agents spend money. We're solving how AI agents prove they acted within bounds. Complementary, not competitive. None of them have an audit trail that satisfies EU AI Act requirements.

**Sponge (YC W26):** Agent payment infrastructure with some governance primitives. Their compliance story is secondary to their payment product. Ours is the entire product.

**Enterprise AI governance platforms (IBM OpenPages, etc.):** Top-down, expensive, consultant-driven, don't integrate with AI agents at the code level. We are the technical layer that feeds their dashboards.

**Agent frameworks (LangChain, CrewAI):** Infrastructure, not compliance. No immutable audit trail, no human oversight workflow, no regulatory export. We want to be the default audit layer they recommend.

The honest answer: no one owns this category yet. We have 12-18 months to become synonymous with "AI agent audit trail" before a larger player or framework makes it a default feature.

---

## What's your business model?

**Free tier:** Up to 1,000 verification events/month. Self-serve, no credit card. Developers integrate, build habit, prove value internally.

**Pro ($299/month):** Up to 100,000 events/month, compliance exports, RFC 3161 anchoring, dashboard, API. Target: startups and mid-market companies with active AI agent deployments.

**Enterprise (custom):** Unlimited events, SLA, SSO, dedicated support, custom retention policies, on-prem option. Target: financial services, healthcare, large enterprises with regulatory exposure.

**Services:** Compliance readiness assessment, integration support, audit preparation. High-margin, builds enterprise relationships.

Unit economics target: $0.002/event blended. At 100M events/month across the customer base, that's $200K MRR from pure usage — before subscriptions.

---

## How big is the market?

The EU AI Act applies to any company operating high-risk AI systems in the EU — that's every major financial institution, insurance company, healthcare provider, employer, and public authority in the EU. By 2026, that's estimated at 50,000+ companies facing mandatory compliance.

The US, UK, and Singapore are all moving toward similar requirements. This is a global $2B+ TAM in compliance infrastructure alone, growing with AI agent adoption.

Comparable: Datadog started as infrastructure monitoring for developers. We are starting as compliance infrastructure for AI teams. The expansion path is the same: every AI deployment becomes a ClearAgent customer once enforcement begins.

---

## Anything else?

**The timing is not a coincidence.** The EU AI Act enforcement deadline is August 2026 — 14 months from now. Compliance teams are issuing RFPs today. The window to establish ClearAgent as the standard audit layer closes when every major enterprise either buys a solution or builds one. We're building in the right place at the right time.

**We are not building in hope of regulation.** The regulation is law. Enforcement is the variable. Even if enforcement slips, the liability exposure — class actions, customer contractual requirements, investor due diligence — creates demand independent of government action.

**The product works today.** Not a demo, not a prototype. Production deployed, hash chain running, compliance scores calculated, RFC 3161 anchoring active. You can run `curl https://api.clearagent.ai/v1/health` right now.

---

## Founders

**[Founder 1 name, role]**
[Background]

**[Founder 2 name, role — if applicable]**
[Background]

---

## Links

- Production API: https://[railway-api-url]/v1/health
- Dashboard: https://[railway-dashboard-url]
- GitHub: https://github.com/Sanjaayyy7/clearagent
- SDK: https://www.npmjs.com/package/@clearagent/sdk
- EU AI Act compliance guide: [url]/docs/eu-ai-act-guide

---

*Last updated: April 2026*
