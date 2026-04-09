# Competitive Landscape — Honest Map

> Last updated: April 2026. This is a working document, not a marketing page.

## Our actual competitors

### Payment-rail focused (not our category)

**Skyfire**
- What they do: Enable AI agents to hold and spend money via crypto wallets
- Our read: Solving a different problem. They need agents to have money; we need agents to have accountability. These are complementary, not competitive.
- Risk: They could add an audit layer. Probability: low near-term — it's a different product motion.

**Nevermined**
- What they do: Agent-to-agent payment infrastructure on-chain
- Our read: Web3 native, different buyer. Enterprise compliance teams are not buying on-chain audit logs from a crypto startup in 2026.
- Risk: Minimal for our target market.

**Stripe Agent Connectivity Protocol (ACP)**
- What they do: Stripe is experimenting with AI agent payment patterns
- Our read: This is Stripe figuring out how to process payments initiated by agents. The audit trail and human oversight layer is not their focus.
- Risk: If Stripe builds a compliance record layer as part of ACP, that's a real threat. Timeline: 18–24 months if they move.

**Google Agent2Agent Protocol**
- What they do: Protocol for agent-to-agent communication and task delegation
- Our read: Infrastructure layer, not compliance layer. No human oversight workflow, no immutable audit trail.
- Risk: If Google builds a compliance layer on top of AP2, significant. Not happening near-term.

### "AI Governance" space (different buyer, different motion)

**Sponge (YC W26)**
- What they do: AI agent payment rails + some governance primitives
- Our read: The payment rail angle means their compliance story is secondary and tied to their payment product. We don't depend on anyone using our payment stack.
- Risk: They could pivot to pure compliance. Watching closely.

**Enterprise AI governance platforms** (IBM OpenPages, etc.)
- What they do: Top-down governance frameworks, policy management, risk registers
- Our read: These are sold to CISOs and compliance teams, not to developers. They are expensive, slow to deploy, and don't integrate with AI agents directly. We are the technical layer that feeds into these platforms.
- Risk: They could acquire a technical audit layer (like us). That's an exit, not a threat.

## Where we win

1. **Developer-first** — Our SDK is `npm install @clearagent/sdk` and five function calls. No procurement process, no 6-month integration.

2. **Narrow scope** — We don't process payments, so we aren't a threat to anyone's core business. This makes partnerships easy.

3. **Regulation-specific** — Our feature set maps directly to EU AI Act Articles 12, 14, 19. When a compliance team asks "what do we need for August 2026?" our answer is specific.

4. **Open-source trust** — An audit infrastructure that is itself opaque is a contradiction. Our core codebase is MIT licensed. Customers can verify the hash chain implementation, the immutability triggers, the canonical JSON serialization.

5. **First mover in the category** — AI agent trust infrastructure is not a named category yet. The companies above are all solving adjacent problems. We have a narrow window to establish the terminology and the standard.

## Where we're vulnerable

1. **Large platform plays** — If OpenAI, Anthropic, or AWS builds a compliance logging layer into their agent frameworks, that's default-on and we have to be better. Mitigation: stay open-source, be the best technical implementation, build regulatory relationships so regulators cite our approach.

2. **Regulation delay** — If EU AI Act enforcement slips beyond 2026, the urgency softens. Mitigation: the regulation is law; enforcement is the variable. And the US, UK, and Singapore are all moving in the same direction.

3. **Enterprise vs. developer chasm** — Developer-adopted tools don't always cross to enterprise procurement. Mitigation: design partner relationships, SOC 2 certification, enterprise SLA tiers.

## Who we want as partners, not competitors

- **Agent frameworks** (LangChain, CrewAI, Autogen) — We want to be the default audit layer they recommend
- **Model providers** — They want their models to be trusted; our audit trail helps prove that
- **Payment rails** (Stripe, Skyfire) — They need compliance infrastructure; we provide it without competing on payments
- **Enterprise governance platforms** — We are the technical layer that feeds their dashboards
