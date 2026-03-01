import { createClient } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL || "file:./pomopals-dev.db";
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

let _db: LibSQLDatabase<typeof schema> | null = null;

async function initDatabase(): Promise<LibSQLDatabase<typeof schema>> {
  if (_db) return _db;

  const client = createClient({
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
  });

  _db = drizzle(client, { schema });

  // Run migrations automatically on startup
  try {
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    await migrate(_db, { migrationsFolder });
  } catch (error) {
    console.error("Database migration failed:", error);
    throw error;
  }

  return _db;
}

// For synchronous access after initialization, use this proxy.
// It lazily initializes on first access via the sync drizzle constructor.
const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

export const db: LibSQLDatabase<typeof schema> = drizzle(client, { schema });

// Run migrations on first import (top-level await)
const migrationsFolder = path.join(process.cwd(), "drizzle");
migrate(db, { migrationsFolder }).catch((error) => {
  console.error("Database migration failed:", error);
});
