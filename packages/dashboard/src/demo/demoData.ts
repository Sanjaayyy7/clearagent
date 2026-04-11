/**
 * Static demo data for ?demo=true mode.
 * 25 events across 3 agent types, 5 reviews, mixed statuses.
 */

export interface DemoEvent {
  id: string;
  orgId: string;
  agentId: string;
  eventType: string;
  eventCategory: string;
  inputHash: string;
  outputPayload: Record<string, unknown>;
  decision: string;
  confidence: number | null;
  status: string;
  requiresReview: boolean;
  contentHash: string;
  prevHash: string | null;
  occurredAt: string;
  recordedAt: string;
  euAiActArticles: string[];
}

export interface DemoReview {
  id: string;
  eventId: string;
  reviewerId: string;
  reviewerEmail: string;
  reviewerRole: string;
  action: "approve" | "reject" | "override";
  justification: string;
  reviewCompletedAt: string;
}

const TS = (offsetMinutes: number) =>
  new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();

export const DEMO_EVENTS: DemoEvent[] = [
  // procurement-agent events
  { id: "evt_demo_001", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", outputPayload: { vendor: "Acme Corp", amount: 48500, currency: "EUR", approved: true }, decision: "approved", confidence: 0.97, status: "verified", requiresReview: false, contentHash: "hash001", prevHash: null, occurredAt: TS(120), recordedAt: TS(120), euAiActArticles: ["Art. 12", "Art. 14"] },
  { id: "evt_demo_002", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3", outputPayload: { vendor: "BuildCo Ltd", amount: 124000, currency: "EUR", approved: false, reason: "exceeds_budget" }, decision: "rejected", confidence: 0.91, status: "verified", requiresReview: false, contentHash: "hash002", prevHash: "hash001", occurredAt: TS(110), recordedAt: TS(110), euAiActArticles: ["Art. 12", "Art. 14"] },
  { id: "evt_demo_003", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", outputPayload: { vendor: "TechSup GmbH", amount: 87500, currency: "EUR", approved: true }, decision: "approved", confidence: 0.72, status: "pending_review", requiresReview: true, contentHash: "hash003", prevHash: "hash002", occurredAt: TS(100), recordedAt: TS(100), euAiActArticles: ["Art. 12", "Art. 14"] },
  { id: "evt_demo_004", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5", outputPayload: { vendor: "Logistics SA", amount: 22300, currency: "EUR", approved: true }, decision: "approved", confidence: 0.96, status: "verified", requiresReview: false, contentHash: "hash004", prevHash: "hash003", occurredAt: TS(90), recordedAt: TS(90), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_005", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6", outputPayload: { vendor: "MediaGroup", amount: 315000, currency: "EUR", approved: false, reason: "high_risk_vendor" }, decision: "flagged", confidence: 0.61, status: "pending_review", requiresReview: true, contentHash: "hash005", prevHash: "hash004", occurredAt: TS(80), recordedAt: TS(80), euAiActArticles: ["Art. 12", "Art. 14"] },
  { id: "evt_demo_006", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1", outputPayload: { vendor: "CloudInfra Inc", amount: 9800, currency: "EUR", approved: true }, decision: "approved", confidence: 0.99, status: "verified", requiresReview: false, contentHash: "hash006", prevHash: "hash005", occurredAt: TS(70), recordedAt: TS(70), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_007", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b3", outputPayload: { vendor: "DataOps BV", amount: 56700, currency: "EUR", approved: true }, decision: "approved", confidence: 0.88, status: "verified", requiresReview: false, contentHash: "hash007", prevHash: "hash006", occurredAt: TS(60), recordedAt: TS(60), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_008", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c4", outputPayload: { vendor: "LegalFirst LLP", amount: 43200, currency: "EUR", approved: true }, decision: "approved", confidence: 0.95, status: "verified", requiresReview: false, contentHash: "hash008", prevHash: "hash007", occurredAt: TS(50), recordedAt: TS(50), euAiActArticles: ["Art. 12"] },

  // risk-agent events
  { id: "evt_demo_009", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d5", outputPayload: { entity: "Partner AG", riskScore: 0.12, category: "low" }, decision: "approved", confidence: 0.98, status: "verified", requiresReview: false, contentHash: "hash009", prevHash: "hash008", occurredAt: TS(48), recordedAt: TS(48), euAiActArticles: ["Art. 12", "Art. 19"] },
  { id: "evt_demo_010", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e6", outputPayload: { entity: "InvCo SA", riskScore: 0.74, category: "high" }, decision: "flagged", confidence: 0.65, status: "pending_review", requiresReview: true, contentHash: "hash010", prevHash: "hash009", occurredAt: TS(46), recordedAt: TS(46), euAiActArticles: ["Art. 12", "Art. 14", "Art. 19"] },
  { id: "evt_demo_011", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f7", outputPayload: { entity: "Meridian GmbH", riskScore: 0.31, category: "medium" }, decision: "approved", confidence: 0.87, status: "verified", requiresReview: false, contentHash: "hash011", prevHash: "hash010", occurredAt: TS(44), recordedAt: TS(44), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_012", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a2", outputPayload: { entity: "Nexus BV", riskScore: 0.08, category: "low" }, decision: "approved", confidence: 0.99, status: "verified", requiresReview: false, contentHash: "hash012", prevHash: "hash011", occurredAt: TS(42), recordedAt: TS(42), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_013", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b4", outputPayload: { entity: "ShadowTrade Ltd", riskScore: 0.91, category: "critical" }, decision: "rejected", confidence: 0.78, status: "pending_review", requiresReview: true, contentHash: "hash013", prevHash: "hash012", occurredAt: TS(40), recordedAt: TS(40), euAiActArticles: ["Art. 12", "Art. 14", "Art. 19"] },
  { id: "evt_demo_014", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c5", outputPayload: { entity: "Alpine Fin AG", riskScore: 0.22, category: "low" }, decision: "approved", confidence: 0.94, status: "verified", requiresReview: false, contentHash: "hash014", prevHash: "hash013", occurredAt: TS(35), recordedAt: TS(35), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_015", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d6", outputPayload: { entity: "EuroTech GmbH", riskScore: 0.55, category: "medium" }, decision: "approved", confidence: 0.82, status: "verified", requiresReview: false, contentHash: "hash015", prevHash: "hash014", occurredAt: TS(30), recordedAt: TS(30), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_016", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e7", outputPayload: { entity: "Atlas Capital", riskScore: 0.43, category: "medium" }, decision: "approved", confidence: 0.89, status: "verified", requiresReview: false, contentHash: "hash016", prevHash: "hash015", occurredAt: TS(25), recordedAt: TS(25), euAiActArticles: ["Art. 12"] },

  // contract-agent events
  { id: "evt_demo_017", orgId: "org_demo", agentId: "contract-agent", eventType: "contract.review", eventCategory: "legal", inputHash: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f8", outputPayload: { contractId: "CTR-2026-001", parties: 2, value: 250000, issues: [] }, decision: "approved", confidence: 0.96, status: "verified", requiresReview: false, contentHash: "hash017", prevHash: "hash016", occurredAt: TS(22), recordedAt: TS(22), euAiActArticles: ["Art. 12", "Art. 19"] },
  { id: "evt_demo_018", orgId: "org_demo", agentId: "contract-agent", eventType: "contract.review", eventCategory: "legal", inputHash: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a3", outputPayload: { contractId: "CTR-2026-002", parties: 3, value: 1200000, issues: ["missing_liability_cap", "ambiguous_ip_clause"] }, decision: "flagged", confidence: 0.58, status: "pending_review", requiresReview: true, contentHash: "hash018", prevHash: "hash017", occurredAt: TS(20), recordedAt: TS(20), euAiActArticles: ["Art. 12", "Art. 14", "Art. 19"] },
  { id: "evt_demo_019", orgId: "org_demo", agentId: "contract-agent", eventType: "contract.review", eventCategory: "legal", inputHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b5", outputPayload: { contractId: "CTR-2026-003", parties: 2, value: 45000, issues: [] }, decision: "approved", confidence: 0.99, status: "verified", requiresReview: false, contentHash: "hash019", prevHash: "hash018", occurredAt: TS(18), recordedAt: TS(18), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_020", orgId: "org_demo", agentId: "contract-agent", eventType: "contract.review", eventCategory: "legal", inputHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c6", outputPayload: { contractId: "CTR-2026-004", parties: 4, value: 780000, issues: ["gdpr_compliance_gap"] }, decision: "rejected", confidence: 0.83, status: "verified", requiresReview: false, contentHash: "hash020", prevHash: "hash019", occurredAt: TS(15), recordedAt: TS(15), euAiActArticles: ["Art. 12", "Art. 19"] },
  { id: "evt_demo_021", orgId: "org_demo", agentId: "contract-agent", eventType: "contract.review", eventCategory: "legal", inputHash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d7", outputPayload: { contractId: "CTR-2026-005", parties: 2, value: 99000, issues: [] }, decision: "approved", confidence: 0.97, status: "verified", requiresReview: false, contentHash: "hash021", prevHash: "hash020", occurredAt: TS(12), recordedAt: TS(12), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_022", orgId: "org_demo", agentId: "contract-agent", eventType: "contract.review", eventCategory: "legal", inputHash: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e8", outputPayload: { contractId: "CTR-2026-006", parties: 2, value: 320000, issues: [] }, decision: "approved", confidence: 0.93, status: "verified", requiresReview: false, contentHash: "hash022", prevHash: "hash021", occurredAt: TS(10), recordedAt: TS(10), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_023", orgId: "org_demo", agentId: "contract-agent", eventType: "contract.review", eventCategory: "legal", inputHash: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f9", outputPayload: { contractId: "CTR-2026-007", parties: 3, value: 550000, issues: ["force_majeure_clause"] }, decision: "flagged", confidence: 0.69, status: "pending_review", requiresReview: true, contentHash: "hash023", prevHash: "hash022", occurredAt: TS(8), recordedAt: TS(8), euAiActArticles: ["Art. 12", "Art. 14"] },
  { id: "evt_demo_024", orgId: "org_demo", agentId: "procurement-agent", eventType: "procurement.decision", eventCategory: "financial", inputHash: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a4", outputPayload: { vendor: "QuickShip AS", amount: 18700, currency: "EUR", approved: true }, decision: "approved", confidence: 0.98, status: "verified", requiresReview: false, contentHash: "hash024", prevHash: "hash023", occurredAt: TS(5), recordedAt: TS(5), euAiActArticles: ["Art. 12"] },
  { id: "evt_demo_025", orgId: "org_demo", agentId: "risk-agent", eventType: "risk.assessment", eventCategory: "compliance", inputHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b6", outputPayload: { entity: "NewGen Fintech", riskScore: 0.48, category: "medium" }, decision: "approved", confidence: 0.86, status: "verified", requiresReview: false, contentHash: "hash025", prevHash: "hash024", occurredAt: TS(2), recordedAt: TS(2), euAiActArticles: ["Art. 12"] },
];

export const DEMO_REVIEWS: DemoReview[] = [
  { id: "rev_demo_001", eventId: "evt_demo_003", reviewerId: "reviewer_alice", reviewerEmail: "alice@compliance.eu", reviewerRole: "compliance_officer", action: "approve", justification: "Reviewed vendor credentials — TechSup GmbH has valid DUNS and clean AML screening. Confidence threshold met.", reviewCompletedAt: TS(95) },
  { id: "rev_demo_002", eventId: "evt_demo_005", reviewerId: "reviewer_bob", reviewerEmail: "bob@compliance.eu", reviewerRole: "senior_reviewer", action: "reject", justification: "MediaGroup flagged in sanctions database. Decision upheld — contract terminated immediately per policy P-14.", reviewCompletedAt: TS(75) },
  { id: "rev_demo_003", eventId: "evt_demo_010", reviewerId: "reviewer_alice", reviewerEmail: "alice@compliance.eu", reviewerRole: "compliance_officer", action: "override", justification: "InvCo SA risk score inflated due to name collision. Manual check confirms low-risk entity — overriding to approved.", reviewCompletedAt: TS(43) },
  { id: "rev_demo_004", eventId: "evt_demo_013", reviewerId: "reviewer_carol", reviewerEmail: "carol@risk.eu", reviewerRole: "risk_manager", action: "reject", justification: "ShadowTrade Ltd confirmed shell company via Orbis database. High-confidence reject. Escalated to legal team.", reviewCompletedAt: TS(38) },
  { id: "rev_demo_005", eventId: "evt_demo_018", reviewerId: "reviewer_bob", reviewerEmail: "bob@compliance.eu", reviewerRole: "senior_reviewer", action: "approve", justification: "IP clause reviewed by legal — standard software IP assignment. Liability cap confirmed adequate at 2x contract value.", reviewCompletedAt: TS(17) },
];

/** Returns a fresh copy of events (regenerates timestamps each call) */
export function getDemoEvents(): DemoEvent[] {
  return DEMO_EVENTS.map((e) => ({ ...e }));
}
