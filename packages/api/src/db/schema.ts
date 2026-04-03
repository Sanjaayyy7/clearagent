import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  integer,
  boolean,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Organizations ────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  euAiActRiskClass: text("eu_ai_act_risk_class").notNull().default("high"),
  dataRetentionDays: integer("data_retention_days").notNull().default(3650),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Agents ───────────────────────────────────────────────────
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    modelProvider: text("model_provider"),
    modelId: text("model_id"),
    riskClass: text("risk_class").notNull().default("high"),
    status: text("status").notNull().default("active"),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("agents_org_external_idx").on(table.orgId, table.externalId),
  ]
);

// ─── API Keys ─────────────────────────────────────────────────
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    agentId: uuid("agent_id").references(() => agents.id),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    lastFour: text("last_four").notNull(),
    label: text("label"),
    isTest: boolean("is_test").notNull().default(true),
    revoked: boolean("revoked").notNull().default(false),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("api_keys_prefix_idx").on(table.keyPrefix),
  ]
);

// ─── Verification Events (Art. 12 — APPEND-ONLY) ─────────────
export const verificationEvents = pgTable(
  "verification_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),

    // What happened
    eventType: text("event_type").notNull(),
    eventCategory: text("event_category").notNull(),

    // The verification itself
    inputHash: text("input_hash").notNull(),
    inputPayload: jsonb("input_payload").notNull(),
    outputPayload: jsonb("output_payload"),
    decision: text("decision").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    reasoning: text("reasoning"),

    // Context chain (traceability)
    sessionId: uuid("session_id"),
    parentEventId: uuid("parent_event_id"),
    sequenceNum: integer("sequence_num").notNull().default(0),

    // Regulatory metadata
    euAiActArticles: text("eu_ai_act_articles").array().notNull().default(sql`'{}'`),
    riskIndicators: jsonb("risk_indicators").default(sql`'{}'::jsonb`),

    // Immutability / hash chain
    contentHash: text("content_hash").notNull(),
    prevHash: text("prev_hash"),

    // Timestamps
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),

    // Retention
    retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }).notNull(),

    // Status for async processing
    status: text("status").notNull().default("pending"),
    requiresReview: boolean("requires_review").notNull().default(false),
  },
  (table) => [
    index("ve_org_agent_idx").on(table.orgId, table.agentId),
    index("ve_session_idx").on(table.sessionId),
    index("ve_occurred_idx").on(table.occurredAt),
    index("ve_decision_idx").on(table.decision),
    index("ve_status_idx").on(table.status),
    index("ve_retention_idx").on(table.retentionExpiresAt),
  ]
);

// ─── Human Reviews (Art. 14 — APPEND-ONLY) ───────────────────
export const humanReviews = pgTable(
  "human_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id),
    eventId: uuid("event_id").notNull().references(() => verificationEvents.id),

    // Who reviewed
    reviewerId: text("reviewer_id").notNull(),
    reviewerEmail: text("reviewer_email").notNull(),
    reviewerRole: text("reviewer_role").notNull(),

    // The review
    action: text("action").notNull(),
    originalDecision: text("original_decision").notNull(),
    overrideDecision: text("override_decision"),
    justification: text("justification").notNull(),

    // Escalation chain
    escalatedFrom: uuid("escalated_from"),
    escalationReason: text("escalation_reason"),

    // Timing
    reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }).notNull(),
    reviewCompletedAt: timestamp("review_completed_at", { withTimezone: true }).notNull().defaultNow(),
    reviewSlaMs: integer("review_sla_ms"),

    // Immutability
    contentHash: text("content_hash").notNull(),
  },
  (table) => [
    index("hr_event_idx").on(table.eventId),
    index("hr_reviewer_idx").on(table.reviewerId),
    index("hr_action_idx").on(table.action),
  ]
);

// ─── Oversight Policies (Art. 14) ─────────────────────────────
export const oversightPolicies = pgTable("oversight_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  triggerConditions: jsonb("trigger_conditions").notNull(),
  action: text("action").notNull(),
  reviewerRole: text("reviewer_role").notNull().default("compliance_officer"),
  slaSeconds: integer("sla_seconds").notNull().default(3600),
  isActive: boolean("is_active").notNull().default(true),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").notNull(),
});

// ─── Audit Exports (Art. 19) ──────────────────────────────────
export const auditExports = pgTable("audit_exports", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  exportType: text("export_type").notNull(),
  format: text("format").notNull(),
  filtersApplied: jsonb("filters_applied").notNull(),
  recordCount: integer("record_count").notNull(),
  requestedBy: text("requested_by").notNull(),
  requesterRole: text("requester_role").notNull(),
  authorityName: text("authority_name"),
  authorityRef: text("authority_ref"),
  fileHash: text("file_hash").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
  storagePath: text("storage_path").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

// ─── Jobs (async verification tracking) ──────────────────────
export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(), // nanoid
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  status: text("status").notNull().default("queued"), // queued|processing|completed|failed
  eventId: uuid("event_id").references(() => verificationEvents.id),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Integrity Checkpoints (Art. 12 + 19) ─────────────────────
export const integrityCheckpoints = pgTable("integrity_checkpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  checkpointAt: timestamp("checkpoint_at", { withTimezone: true }).notNull().defaultNow(),
  eventCount: bigint("event_count", { mode: "number" }).notNull(),
  merkleRoot: text("merkle_root").notNull(),
  prevCheckpointId: uuid("prev_checkpoint_id"),
  externalAnchor: text("external_anchor"),
  anchorService: text("anchor_service"),
});
