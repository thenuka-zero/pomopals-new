import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id:            text("id").primaryKey(),                    // crypto.randomUUID()
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  passwordHash:  text("password_hash").notNull(),            // "salt:hash" from scrypt
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  createdAt:     text("created_at").notNull(),               // ISO 8601
  updatedAt:     text("updated_at").notNull(),               // ISO 8601
});

// ─── Email Verification Tokens ────────────────────────────────────────────────

export const emailVerificationTokens = sqliteTable("email_verification_tokens", {
  id:        text("id").primaryKey(),                        // crypto.randomUUID()
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token:     text("token").notNull().unique(),               // crypto.randomBytes(32).toString("hex")
  expiresAt: text("expires_at").notNull(),                   // ISO 8601, 24 hours from creation
  usedAt:    text("used_at"),                                // ISO 8601, null until used
  createdAt: text("created_at").notNull(),                   // ISO 8601
});

// ─── Pomodoro Sessions ────────────────────────────────────────────────────────

export const pomodoroSessions = sqliteTable("pomodoro_sessions", {
  id:                   text("id").primaryKey(),             // UUID from the client
  userId:               text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt:            text("started_at").notNull(),        // ISO 8601
  endedAt:              text("ended_at"),                    // ISO 8601, null if in-progress
  phase:                text("phase").notNull(),             // "work" | "shortBreak" | "longBreak"
  plannedDuration:      integer("planned_duration").notNull(), // seconds
  actualDuration:       integer("actual_duration").notNull(),  // seconds
  completed:            integer("completed", { mode: "boolean" }).notNull(),
  completionPercentage: real("completion_percentage").notNull(), // 0-100
  date:                 text("date").notNull(),              // "YYYY-MM-DD" for grouping
});
