import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

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

// ─── Friends ──────────────────────────────────────────────────────────────────

export const friendships = sqliteTable(
  "friendships",
  {
    id: text("id").primaryKey(),
    userIdA: text("user_id_a").notNull().references(() => users.id, { onDelete: "cascade" }),
    userIdB: text("user_id_b").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_friendships_pair").on(t.userIdA, t.userIdB),
    index("idx_friendships_user_a").on(t.userIdA),
    index("idx_friendships_user_b").on(t.userIdB),
  ]
);

export const friendRequests = sqliteTable(
  "friend_requests",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'rejected' | 'cancelled'
    createdAt: text("created_at").notNull(),
    respondedAt: text("responded_at"),
  },
  (t) => [
    uniqueIndex("idx_friend_requests_pair").on(t.requesterId, t.recipientId),
    index("idx_friend_requests_recipient").on(t.recipientId, t.status),
    index("idx_friend_requests_requester").on(t.requesterId, t.status),
  ]
);

export const userPresence = sqliteTable("user_presence", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  isActive: integer("is_active").notNull().default(0),
  roomId: text("room_id"),
  roomName: text("room_name"),
  phase: text("phase"),
  startedAt: text("started_at"),
  expiresAt: text("expires_at").notNull(),
  broadcastEnabled: integer("broadcast_enabled").notNull().default(1),
});

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  broadcastEnabled: integer("broadcast_enabled").notNull().default(1),
  friendLimit: integer("friend_limit").notNull().default(50),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const roomJoinRequests = sqliteTable(
  "room_join_requests",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    hostId: text("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled'
    createdAt: text("created_at").notNull(),
    respondedAt: text("responded_at"),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("idx_room_join_requests_pair").on(t.roomId, t.requesterId),
    index("idx_room_join_requests_host").on(t.hostId, t.status),
    index("idx_room_join_requests_requester").on(t.requesterId, t.status),
  ]
);
