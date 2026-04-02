CREATE TABLE IF NOT EXISTS "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"model_provider" text,
	"model_id" text,
	"risk_class" text DEFAULT 'high' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"agent_id" uuid,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_four" text NOT NULL,
	"label" text,
	"is_test" boolean DEFAULT true NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"export_type" text NOT NULL,
	"format" text NOT NULL,
	"filters_applied" jsonb NOT NULL,
	"record_count" integer NOT NULL,
	"requested_by" text NOT NULL,
	"requester_role" text NOT NULL,
	"authority_name" text,
	"authority_ref" text,
	"file_hash" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"storage_path" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "human_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"reviewer_id" text NOT NULL,
	"reviewer_email" text NOT NULL,
	"reviewer_role" text NOT NULL,
	"action" text NOT NULL,
	"original_decision" text NOT NULL,
	"override_decision" text,
	"justification" text NOT NULL,
	"escalated_from" uuid,
	"escalation_reason" text,
	"review_requested_at" timestamp with time zone NOT NULL,
	"review_completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"review_sla_ms" integer,
	"content_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integrity_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"checkpoint_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_count" bigint NOT NULL,
	"merkle_root" text NOT NULL,
	"prev_checkpoint_id" uuid,
	"external_anchor" text,
	"anchor_service" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"eu_ai_act_risk_class" text DEFAULT 'high' NOT NULL,
	"data_retention_days" integer DEFAULT 3650 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oversight_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_conditions" jsonb NOT NULL,
	"action" text NOT NULL,
	"reviewer_role" text DEFAULT 'compliance_officer' NOT NULL,
	"sla_seconds" integer DEFAULT 3600 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"input_hash" text NOT NULL,
	"input_payload" jsonb NOT NULL,
	"output_payload" jsonb,
	"decision" text NOT NULL,
	"confidence" numeric(5, 4),
	"reasoning" text,
	"session_id" uuid,
	"parent_event_id" uuid,
	"sequence_num" integer DEFAULT 0 NOT NULL,
	"eu_ai_act_articles" text[] DEFAULT '{}' NOT NULL,
	"risk_indicators" jsonb DEFAULT '{}'::jsonb,
	"content_hash" text NOT NULL,
	"prev_hash" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retention_expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requires_review" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_exports" ADD CONSTRAINT "audit_exports_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_event_id_verification_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."verification_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integrity_checkpoints" ADD CONSTRAINT "integrity_checkpoints_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oversight_policies" ADD CONSTRAINT "oversight_policies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agents_org_external_idx" ON "agents" USING btree ("org_id","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_prefix_idx" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_event_idx" ON "human_reviews" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_reviewer_idx" ON "human_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_action_idx" ON "human_reviews" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ve_org_agent_idx" ON "verification_events" USING btree ("org_id","agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ve_session_idx" ON "verification_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ve_occurred_idx" ON "verification_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ve_decision_idx" ON "verification_events" USING btree ("decision");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ve_status_idx" ON "verification_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ve_retention_idx" ON "verification_events" USING btree ("retention_expires_at");