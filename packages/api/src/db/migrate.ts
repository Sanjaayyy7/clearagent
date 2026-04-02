import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgresql://clearagent:clearagent@localhost:5432/clearagent";

async function runMigrations() {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations complete.");

  // Create immutability enforcement for audit tables
  console.log("Setting up immutability enforcement...");

  // verification_events: allow ONE status transition (pending → final), block all other updates and all deletes
  await client`
    CREATE OR REPLACE FUNCTION enforce_verification_immutability()
    RETURNS trigger AS $$
    BEGIN
      -- Allow the initial status transition from 'pending' to a final state
      IF OLD.status = 'pending' AND NEW.status IN ('verified', 'failed', 'flagged') THEN
        RETURN NEW;
      END IF;
      -- Block all other updates
      RAISE EXCEPTION 'verification_events is append-only: updates blocked on finalized events (EU AI Act Art. 12)';
    END;
    $$ LANGUAGE plpgsql;
  `;
  await client`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_ve_immutability') THEN
        CREATE TRIGGER enforce_ve_immutability
          BEFORE UPDATE ON verification_events
          FOR EACH ROW EXECUTE FUNCTION enforce_verification_immutability();
      END IF;
    END $$;
  `;

  // Block DELETE on verification_events (always)
  await client`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'no_delete_verification_events') THEN
        CREATE RULE no_delete_verification_events AS ON DELETE TO verification_events DO INSTEAD NOTHING;
      END IF;
    END $$;
  `;

  // human_reviews: fully immutable (no updates, no deletes)
  await client`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'no_update_human_reviews') THEN
        CREATE RULE no_update_human_reviews AS ON UPDATE TO human_reviews DO INSTEAD NOTHING;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_rules WHERE rulename = 'no_delete_human_reviews') THEN
        CREATE RULE no_delete_human_reviews AS ON DELETE TO human_reviews DO INSTEAD NOTHING;
      END IF;
    END $$;
  `;
  console.log("Immutability enforcement applied.");

  // Set up NOTIFY trigger for real-time SSE
  console.log("Setting up NOTIFY triggers...");
  await client`
    CREATE OR REPLACE FUNCTION notify_verification_event()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('verification_events', json_build_object(
        'id', NEW.id,
        'event_type', NEW.event_type,
        'decision', NEW.decision,
        'confidence', NEW.confidence,
        'status', NEW.status,
        'requires_review', NEW.requires_review,
        'occurred_at', NEW.occurred_at
      )::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  await client`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'verification_event_notify') THEN
        CREATE TRIGGER verification_event_notify
          AFTER INSERT ON verification_events
          FOR EACH ROW EXECUTE FUNCTION notify_verification_event();
      END IF;
    END $$;
  `;
  console.log("NOTIFY triggers applied.");

  await client.end();
  console.log("Done.");
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
