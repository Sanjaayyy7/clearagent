import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL || "postgresql://clearagent:clearagent@localhost:5432/clearagent";

const client = postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 3 : 10,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: process.env.NODE_ENV === "production" ? true : undefined,
});
export const db = drizzle(client, { schema });

export { schema };
