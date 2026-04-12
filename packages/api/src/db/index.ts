import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL || "postgresql://clearagent:clearagent@localhost:5432/clearagent";

// Use SSL for any non-localhost connection (Neon, RDS, etc.)
const isLocalDB = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const client = postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 3 : 10,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: isLocalDB ? undefined : true,
});
export const db = drizzle(client, { schema });

export { schema };
