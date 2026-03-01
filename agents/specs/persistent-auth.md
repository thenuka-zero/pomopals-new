# Persistent User Accounts with Email Verification

**Status:** Draft
**Author:** Product
**Date:** 2026-02-28

---

## Overview

PomoPals currently stores all user data in-memory (`Map` objects in `src/lib/auth.ts`, `src/lib/analytics.ts`, and `src/lib/rooms.ts`). Every server restart wipes all accounts, pomodoro sessions, and room data. This spec adds persistent storage via SQLite, email verification for new accounts, and a themed welcome email.

### Current State (What We're Replacing)

| Concern | Current Implementation | Problem |
|---|---|---|
| User storage | `Map<string, User>` in `src/lib/auth.ts` | Lost on restart |
| Session analytics | `Map<string, PomodoroSession[]>` in `src/lib/analytics.ts` | Lost on restart |
| Room storage | `Map<string, Room>` in `src/lib/rooms.ts` | Lost on restart (acceptable for rooms -- they're ephemeral) |
| Password hashing | `scrypt` with random salt in `src/lib/auth.ts` | Good -- keep as-is |
| Auth framework | NextAuth v5 beta with JWT strategy + `CredentialsProvider` | Good -- keep as-is |
| Registration | Happens inside the `authorize()` callback via `action: "register"` | Needs to move to a dedicated endpoint |

### What Changes

1. Users and pomodoro sessions move to SQLite (rooms stay in-memory -- they're short-lived by design).
2. Registration moves from the NextAuth `authorize()` callback to a dedicated `POST /api/auth/register` endpoint so we can send verification emails before signing the user in.
3. New email verification flow with token-based confirmation.
4. Themed welcome/verification email sent via Resend.

---

## 1. Database Choice: SQLite + Drizzle ORM

### Why SQLite

- Zero infrastructure. No Postgres/MySQL server to provision, no connection strings, no Docker containers.
- The database is a single file on disk, trivial to back up and inspect.
- Plenty fast for PomoPals' scale (single-server deployment on Vercel or a VPS).
- Drizzle ORM gives us type-safe queries and simple migrations without a heavy runtime.

### Dependencies to Add

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

### Database File Location

```
/data/pomopals.db          # production (outside the repo)
./pomopals-dev.db          # development (gitignored)
```

Controlled by env var:

```env
DATABASE_URL=./pomopals-dev.db
```

### Drizzle Config

Create `drizzle.config.ts` at the project root:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./pomopals-dev.db",
  },
});
```

### Migration Strategy

1. Drizzle Kit generates SQL migration files into `./drizzle/` on `npx drizzle-kit generate`.
2. Migrations run automatically on app startup via a `migrate()` call in the DB connection module.
3. For the initial release, there is no existing data to preserve -- it's all in-memory. So the first migration is simply "create tables."
4. Add `pomopals-dev.db` and `*.db-journal` to `.gitignore`.

---

## 2. Database Schema

### File: `src/lib/db/schema.ts`

```ts
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
```

### Table: `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | `crypto.randomUUID()` |
| `name` | TEXT | NOT NULL | Display name |
| `email` | TEXT | NOT NULL, UNIQUE | Used for login + verification |
| `password_hash` | TEXT | NOT NULL | `salt:hash` format from existing scrypt logic |
| `email_verified` | INTEGER (boolean) | NOT NULL, DEFAULT false | Flipped to true on verification |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp |

### Table: `email_verification_tokens`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | `crypto.randomUUID()` |
| `user_id` | TEXT | NOT NULL, FK -> users.id (CASCADE) | Owner of the token |
| `token` | TEXT | NOT NULL, UNIQUE | 64-char hex string (`randomBytes(32)`) |
| `expires_at` | TEXT | NOT NULL | 24 hours from creation |
| `used_at` | TEXT | nullable | Set when the token is consumed |
| `created_at` | TEXT | NOT NULL | ISO 8601 |

### Table: `pomodoro_sessions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID from the client |
| `user_id` | TEXT | NOT NULL, FK -> users.id (CASCADE) | Scoped to authenticated user |
| `started_at` | TEXT | NOT NULL | ISO 8601 |
| `ended_at` | TEXT | nullable | ISO 8601 |
| `phase` | TEXT | NOT NULL | "work", "shortBreak", "longBreak" |
| `planned_duration` | INTEGER | NOT NULL | Seconds |
| `actual_duration` | INTEGER | NOT NULL | Seconds |
| `completed` | INTEGER (boolean) | NOT NULL | Did it run to full completion? |
| `completion_percentage` | REAL | NOT NULL | 0-100 |
| `date` | TEXT | NOT NULL | "YYYY-MM-DD" for grouping |

### Indexes (add in migration)

```sql
CREATE INDEX idx_pomodoro_sessions_user_date ON pomodoro_sessions(user_id, date);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_users_email ON users(email);
```

---

## 3. Email Verification Flow

### Step-by-Step User Journey

```
1. User opens PomoPals, clicks "Sign In" in the Navbar
2. User switches to "Sign Up" tab in AuthModal
3. User fills in Name, Email, Password and clicks "Sign Up"
4. Frontend calls POST /api/auth/register
5. Backend:
   a. Validates input (name, email format, password >= 8 chars)
   b. Checks email uniqueness
   c. Hashes password with scrypt (existing logic)
   d. Inserts user row with email_verified = false
   e. Generates a verification token (randomBytes(32).toString("hex"))
   f. Inserts token into email_verification_tokens (expires in 24h)
   g. Sends welcome/verification email via Resend
   h. Returns { success: true, message: "Check your email to verify your account." }
6. Frontend shows a success message: "Account created! Check your email for a verification link."
7. Frontend auto-signs the user in via NextAuth (so they can start using the timer immediately)
8. User opens their email, clicks the verification link
9. Link goes to: GET /api/auth/verify?token=<token>
10. Backend:
    a. Looks up token in email_verification_tokens
    b. Checks token exists, is not expired, and has not been used
    c. Sets users.email_verified = true
    d. Sets email_verification_tokens.used_at = now
    e. Redirects to /?verified=true
11. Frontend detects ?verified=true query param and shows a toast: "Email verified! You're all set."
```

### Key Rules

- **Unverified users CAN:**
  - Use the timer (solo mode)
  - Join rooms
  - Browse the app fully
- **Unverified users CANNOT:**
  - Save pomodoro session analytics (the `POST /api/analytics` endpoint will reject requests from unverified users with a helpful message)
  - Create rooms (host-only restriction)
- **Token expiry:** 24 hours from generation.
- **Resend capability:** Users can request a new verification email via `POST /api/auth/resend-verification`. Rate limit: 1 email per 60 seconds per user. The old token is invalidated when a new one is issued.
- **Already-verified guard:** If a user tries to verify an already-verified account (e.g., double-clicking the link), redirect gracefully to `/?verified=true` with no error.

### Session/JWT Changes

The NextAuth JWT and session must carry `emailVerified` so the frontend knows the user's verification status without an extra API call.

Update the JWT callback:

```ts
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.emailVerified = user.emailVerified;
  }
  return token;
},
async session({ session, token }) {
  if (session.user && token.id) {
    session.user.id = token.id as string;
    session.user.emailVerified = token.emailVerified as boolean;
  }
  return session;
},
```

---

## 4. Email Provider: Resend

### Why Resend

- Simple REST API -- one `POST` call to send an email.
- Generous free tier: 100 emails/day, 3,000/month. More than enough for early PomoPals.
- First-class support for React Email templates (optional future upgrade).
- No SMTP configuration needed.

### Dependencies

```bash
npm install resend
```

### Environment Variables

Add to `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx   # From https://resend.com/api-keys
APP_URL=http://localhost:3000             # Base URL for verification links
```

Production:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
APP_URL=https://pomopals.app
```

### Development Fallback

When `RESEND_API_KEY` is not set (or set to `"development"`), the email module logs the verification link to the console instead of sending:

```
[PomoPals Email] Verification link for user@example.com:
  http://localhost:3000/api/auth/verify?token=abc123def456...
```

This means developers never need a Resend account to work on the app locally.

### Email Module: `src/lib/email.ts`

```ts
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "development"
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = "PomoPals <noreply@pomopals.app>";  // Requires Resend domain verification
// During development with unverified domain, use: "PomoPals <onboarding@resend.dev>"

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string
): Promise<void> {
  const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${verificationToken}`;

  if (!resend) {
    console.log(`\n[PomoPals Email] Verification link for ${to}:\n  ${verifyUrl}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Let's ketchup! Verify your PomoPals account 🍅",
    html: buildWelcomeEmailHtml(name, verifyUrl),
  });
}
```

---

## 5. Welcome Email Design

### Subject Line Options (pick one)

1. **"Let's ketchup! Verify your PomoPals account"** (recommended)
2. "You're one click from being a-tomato-cally productive"
3. "Welcome to PomoPals -- time to get saucy with focus"
4. "Ripe timing! Confirm your PomoPals email"
5. "Don't leaf us hanging -- verify your email"

### Design Spec

The email uses inline CSS for maximum email client compatibility. It matches the app's warm palette.

**Color palette:**

| Name | Hex | Usage |
|---|---|---|
| Cream (background) | `#FDF6EC` | Email body background |
| Tomato Red | `#E54B4B` | CTA button, accents |
| Tomato Dark | `#D43D3D` | Button hover hint text |
| Brown | `#3D2C2C` | Primary text |
| Brown Light | `#5C4033` | Secondary text |
| Brown Muted | `#8B7355` | Tertiary / fine print |
| Sand | `#F0E6D3` | Borders, dividers |
| Green | `#6EAE3E` | Leaf accent, success |
| White | `#FFFFFF` | Card background |

### Email HTML Template

File: `src/lib/email-templates/welcome.ts`

```ts
export function buildWelcomeEmailHtml(name: string, verifyUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PomoPals</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF6EC; font-family: 'Nunito', 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF6EC;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #FFFFFF; border-radius: 16px; border: 2px solid #F0E6D3; overflow: hidden;">

          <!-- Header with tomato -->
          <tr>
            <td align="center" style="padding: 36px 32px 20px; background-color: #FFFFFF;">
              <!-- Tomato character using text/emoji since SVG is poorly supported in email -->
              <div style="font-size: 64px; line-height: 1;">&#127813;</div>
              <h1 style="margin: 16px 0 0; font-size: 24px; font-weight: 800; color: #3D2C2C;">
                Welcome to Pomo<span style="color: #E54B4B;">Pals</span>!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #5C4033;">
                Hey ${firstName}! We're so glad you're here.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #5C4033;">
                PomoPals is your cozy corner for staying focused. Use the Pomodoro technique
                solo or team up with friends in shared timer rooms. Track your progress,
                build streaks, and watch your productivity grow.
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #5C4033;">
                Just one thing -- tap the button below to verify your email so we can
                save your pomodoro stats:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}"
                       style="display: inline-block; padding: 14px 36px; background-color: #E54B4B; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 12px rgba(229, 75, 75, 0.25);">
                      Verify My Email &#127813;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #8B7355; text-align: center;">
                This link expires in 24 hours. If you didn't create a PomoPals account,
                you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="border-top: 2px solid #F0E6D3;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 32px 28px;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #8B7355;">
                Made with &#127813; by the PomoPals team
              </p>
              <p style="margin: 0; font-size: 12px; color: #C4B098;">
                If the button doesn't work, paste this link into your browser:<br/>
                <a href="${verifyUrl}" style="color: #E54B4B; word-break: break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
```

### Tone and Voice

- Friendly, casual, warm -- like a study buddy, not a corporation.
- Short sentences. No jargon.
- Light humor welcome (tomato puns).
- The email should feel like it belongs to the same world as the app's cute tomato mascot.

---

## 6. API Endpoints

### `POST /api/auth/register`

**File:** `src/app/api/auth/register/route.ts`

**Request Body:**

```json
{
  "name": "Thenuka",
  "email": "thenuka@example.com",
  "password": "supersecure123"
}
```

**Validation Rules:**

| Field | Rule |
|---|---|
| `name` | Required, 1-100 characters, trimmed |
| `email` | Required, valid email format, trimmed, lowercased |
| `password` | Required, minimum 8 characters |

**Success Response (201):**

```json
{
  "success": true,
  "message": "Account created! Check your email to verify your account."
}
```

**Error Responses:**

| Status | Condition | Body |
|---|---|---|
| 400 | Missing/invalid fields | `{ "error": "Name is required." }` |
| 400 | Password too short | `{ "error": "Password must be at least 8 characters." }` |
| 409 | Email already registered | `{ "error": "An account with this email already exists." }` |
| 500 | Unexpected error | `{ "error": "Something went wrong. Please try again." }` |

**Logic:**

1. Parse and validate request body.
2. Check if email is already taken (`SELECT id FROM users WHERE email = ?`).
3. Hash password using existing `hashPassword()` function.
4. Generate user ID (`crypto.randomUUID()`).
5. Insert user row with `email_verified = false`.
6. Generate verification token (`crypto.randomBytes(32).toString("hex")`).
7. Insert token row with `expires_at` = now + 24 hours.
8. Send verification email (or log link in dev mode).
9. Return 201.

---

### `GET /api/auth/verify`

**File:** `src/app/api/auth/verify/route.ts`

**Query Parameters:**

| Param | Required | Description |
|---|---|---|
| `token` | Yes | The 64-character hex verification token |

**Logic:**

1. Look up token in `email_verification_tokens` where `used_at IS NULL`.
2. If not found: redirect to `/?error=invalid-token`.
3. If expired (`expires_at < now`): redirect to `/?error=token-expired`.
4. Set `users.email_verified = true` and `users.updated_at = now`.
5. Set `email_verification_tokens.used_at = now`.
6. Redirect to `/?verified=true`.

**Redirect targets:**

| Outcome | Redirect URL |
|---|---|
| Success | `/?verified=true` |
| Token not found | `/?error=invalid-token` |
| Token expired | `/?error=token-expired` |
| Already verified | `/?verified=true` (no error, graceful) |

---

### `POST /api/auth/resend-verification`

**File:** `src/app/api/auth/resend-verification/route.ts`

**Authentication:** Required (user must be signed in).

**Logic:**

1. Get user from NextAuth session.
2. If already verified: return `{ message: "Email is already verified." }` with 200.
3. Check for existing unexpired token created within the last 60 seconds (rate limiting).
4. If recent token exists: return 429 `{ "error": "Please wait 60 seconds before requesting another email." }`.
5. Invalidate all existing tokens for this user (set `used_at = now`).
6. Generate new token, insert into `email_verification_tokens`.
7. Send verification email.
8. Return 200 `{ "success": true, "message": "Verification email sent." }`.

---

## 7. Files to Create/Modify

### New Files to Create

| File | Description |
|---|---|
| `src/lib/db/schema.ts` | Drizzle ORM table definitions (users, email_verification_tokens, pomodoro_sessions) |
| `src/lib/db/index.ts` | Database connection singleton. Creates the `better-sqlite3` connection, runs migrations on startup, exports the `db` instance and Drizzle wrapper. |
| `src/lib/db/migrate.ts` | Migration runner (called from `index.ts` on first import). Uses `drizzle-kit` generated SQL files. |
| `src/lib/email.ts` | Email sending module. Wraps Resend client with dev fallback. Exports `sendVerificationEmail()`. |
| `src/lib/email-templates/welcome.ts` | The `buildWelcomeEmailHtml(name, verifyUrl)` function returning the full HTML email string. |
| `src/app/api/auth/register/route.ts` | `POST` handler for user registration. |
| `src/app/api/auth/verify/route.ts` | `GET` handler for email verification token consumption. |
| `src/app/api/auth/resend-verification/route.ts` | `POST` handler for resending the verification email. |
| `drizzle.config.ts` | Drizzle Kit configuration file for migrations. |
| `drizzle/` | Directory for generated SQL migration files (auto-generated by `drizzle-kit generate`). |

### Existing Files to Modify

| File | Changes |
|---|---|
| **`src/lib/auth.ts`** | (1) Remove the in-memory `users` Map. (2) Remove the `action === "register"` branch from `authorize()` -- registration now goes through its own endpoint. (3) The `authorize()` function (login only) now queries the `users` table via Drizzle instead of the Map. (4) Keep the `hashPassword()` and `verifyPassword()` functions but export them so the register endpoint can use them. (5) Add `emailVerified` to the JWT and session callbacks. |
| **`src/lib/types.ts`** | Add `emailVerified: boolean` and `updatedAt: string` to the `User` interface. |
| **`src/lib/analytics.ts`** | Replace the in-memory `Map` with Drizzle queries against the `pomodoro_sessions` table. All function signatures stay the same (`recordSession`, `getUserSessions`, `getDailyAnalytics`, `getAnalyticsByPeriod`). The analytics computation logic stays the same -- only the data source changes. |
| **`src/app/api/analytics/route.ts`** | Add an email-verification check in the `POST` handler: if `!session.user.emailVerified`, return 403 with `{ error: "Please verify your email to save analytics." }`. The `GET` handler remains open to all authenticated users (verified or not) since they may have historical data. |
| **`src/components/AuthModal.tsx`** | (1) In "Sign Up" mode, call `POST /api/auth/register` instead of `signIn("credentials", { action: "register" })`. (2) On success, auto-sign the user in via `signIn("credentials", { email, password })` and show a "Check your email" message. (3) Add a success state with the verification message. |
| **`src/components/Navbar.tsx`** | (1) Show a small "Unverified" badge or banner when `session.user.emailVerified === false`. (2) Add a "Resend verification email" action. |
| **`src/components/CompactTimer.tsx`** | No changes to timer logic. The analytics `POST` call already exists; it will now receive a 403 if unverified, which we can handle gracefully (show a subtle nudge to verify). |
| **`src/app/page.tsx`** | Read the `?verified=true` or `?error=token-expired` query params on mount and show an appropriate toast/banner. |
| **`src/app/layout.tsx`** | No changes needed. |
| **`package.json`** | Add new dependencies: `drizzle-orm`, `better-sqlite3`, `resend`. Add dev dependencies: `drizzle-kit`, `@types/better-sqlite3`. Add scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:studio": "drizzle-kit studio"`. |
| **`.env.local`** | Add `DATABASE_URL`, `RESEND_API_KEY`, `APP_URL`. |
| **`.gitignore`** | Add `*.db`, `*.db-journal`, `*.db-wal`. |

---

## 8. Frontend Changes Needed

### 8.1 AuthModal (`src/components/AuthModal.tsx`)

**Current behavior:** Both sign-up and sign-in go through `signIn("credentials", ...)` with an `action` field.

**New behavior:**

- **Sign-in mode:** No change. Still calls `signIn("credentials", { email, password })`.
- **Sign-up mode:**
  1. Call `fetch("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) })`.
  2. If 201: show a success state inside the modal with the message "Account created! Check your email for a verification link."
  3. Then auto-sign the user in by calling `signIn("credentials", { email, password, redirect: false })`.
  4. On successful sign-in: close the modal and reload (same as current behavior).
  5. If 409 (email taken): show "An account with this email already exists."
  6. If 400: show the specific validation error from the response.

**New success state UI (inside the modal, post-registration):**

```
  ┌──────────────────────────────────────┐
  │                                      │
  │            🍅                        │
  │   You're almost there!               │
  │                                      │
  │   We sent a verification link to     │
  │   thenuka@example.com                │
  │                                      │
  │   Check your inbox (and spam         │
  │   folder) to verify your account.    │
  │                                      │
  │   [Continue to PomoPals]             │
  │                                      │
  │   Didn't get it? Resend email        │
  └──────────────────────────────────────┘
```

The "Continue to PomoPals" button closes the modal (user is already signed in). The "Resend email" link calls `POST /api/auth/resend-verification`.

### 8.2 Verification Status Banner

**Where:** Rendered inside `Navbar.tsx` when `session.user.emailVerified === false`.

**Design:** A slim, dismissible banner just below the navbar:

```
┌──────────────────────────────────────────────────────────────────┐
│ 📧 Please verify your email to save your pomodoro stats.        │
│ [Resend email]                                           [✕]    │
└──────────────────────────────────────────────────────────────────┘
```

- Background: `#FFF8F0` (warm light orange).
- Border-bottom: `1px solid #F0E6D3`.
- Text color: `#5C4033`.
- "Resend email" link color: `#E54B4B`.
- Dismissible for the current session (use `useState` or `sessionStorage`). It reappears if the user refreshes and is still unverified.

### 8.3 Verification Success Toast

**Where:** `src/app/page.tsx` (the home page).

**Trigger:** URL contains `?verified=true`.

**Behavior:**

1. On mount, check `searchParams` for `verified=true`.
2. Show a green success toast/banner at the top: "Email verified! You're all set." with a tomato emoji.
3. Remove the query param from the URL using `router.replace("/")` so refreshing doesn't re-show.
4. Toast auto-dismisses after 5 seconds.

**Error handling:**

- `?error=invalid-token` -> "This verification link is invalid. Please request a new one."
- `?error=token-expired` -> "This verification link has expired. Please request a new one."

Both error toasts include a "Resend verification email" link that calls the resend endpoint (only works if user is signed in).

### 8.4 Analytics Guard (CompactTimer)

**Current behavior:** `CompactTimer.tsx` sends a `POST /api/analytics` when a session completes.

**New behavior:** If the `POST` returns 403, show a subtle inline message below the timer: "Verify your email to save your stats" with a link to resend. Do NOT block the timer from working.

### 8.5 TypeScript Session Types

Extend the NextAuth session type declaration so `session.user.emailVerified` is available. Create or update the NextAuth type augmentation:

**File:** `src/types/next-auth.d.ts`

```ts
import "next-auth";

declare module "next-auth" {
  interface User {
    emailVerified?: boolean;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    emailVerified: boolean;
  }
}
```

---

## 9. Implementation Order

This is the recommended order for an engineer to implement the changes, designed so each step can be tested independently:

### Phase 1: Database Foundation (no behavior changes)

1. Install dependencies (`drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `@types/better-sqlite3`).
2. Create `drizzle.config.ts`.
3. Create `src/lib/db/schema.ts` with all three tables.
4. Create `src/lib/db/index.ts` with connection singleton + auto-migration.
5. Run `npx drizzle-kit generate` to produce the initial migration.
6. Update `.gitignore` to exclude `*.db` files.
7. **Test:** Run the app. The DB file should appear and tables should be created. No behavior change yet.

### Phase 2: Migrate User Storage

1. Update `src/lib/types.ts` (add `emailVerified`, `updatedAt`).
2. Refactor `src/lib/auth.ts`:
   - Remove the in-memory Map.
   - Export `hashPassword()` and `verifyPassword()`.
   - The `authorize()` callback reads from the DB.
   - Remove the registration branch.
   - Add `emailVerified` to JWT/session callbacks.
3. Create `src/types/next-auth.d.ts` for type augmentation.
4. **Test:** Existing login should work against the DB (you'll need to register via the new endpoint first, so manually insert a test user or wait for Phase 3).

### Phase 3: Registration Endpoint

1. Create `src/app/api/auth/register/route.ts`.
2. Update `src/components/AuthModal.tsx` to use the new endpoint for sign-up.
3. **Test:** Sign up a new user. Confirm the user row appears in the DB with `email_verified = false`. Confirm auto-sign-in works after registration.

### Phase 4: Email Verification

1. Install `resend`.
2. Create `src/lib/email-templates/welcome.ts`.
3. Create `src/lib/email.ts`.
4. Create `src/app/api/auth/verify/route.ts`.
5. Create `src/app/api/auth/resend-verification/route.ts`.
6. Wire up the register endpoint to send the verification email.
7. Add env vars to `.env.local` (use dev fallback initially).
8. **Test:** Register a user. Check the console for the verification link. Click it. Confirm `email_verified` flips to `true` in the DB.

### Phase 5: Frontend Verification UX

1. Update `AuthModal.tsx` with the post-registration success state.
2. Add the verification status banner to `Navbar.tsx`.
3. Add the verification toast to `page.tsx`.
4. Add the 403 handling in `CompactTimer.tsx`.
5. **Test:** Full end-to-end flow. Register, see the "check your email" message, verify, see the toast, confirm analytics saving works.

### Phase 6: Migrate Analytics Storage

1. Refactor `src/lib/analytics.ts` to read/write from the `pomodoro_sessions` table instead of the in-memory Map.
2. Update `src/app/api/analytics/route.ts` to check `emailVerified` on POST.
3. **Test:** Complete a pomodoro. Confirm the session is persisted in the DB. Restart the server. Confirm the analytics page still shows the data.

---

## 10. Environment Variables Summary

| Variable | Required | Default | Description |
|---|---|---|---|
| `AUTH_SECRET` | Yes | (none) | Already exists. NextAuth JWT signing secret. |
| `DATABASE_URL` | No | `./pomopals-dev.db` | Path to the SQLite database file. |
| `RESEND_API_KEY` | No | (none) | Resend API key. When absent, emails are logged to console. |
| `APP_URL` | No | `http://localhost:3000` | Base URL for verification links. Must be set in production. |

---

## 11. Security Considerations

1. **Password hashing:** Keep the existing `scrypt` implementation. It's already solid (random salt, 64-byte derived key, `timingSafeEqual` for comparison).
2. **Verification tokens:** Use `crypto.randomBytes(32)` -- 256 bits of entropy, not guessable.
3. **Token single-use:** Mark tokens as used (`used_at`) instead of deleting them. This creates an audit trail and prevents replay.
4. **Rate limiting on resend:** 1 email per 60 seconds per user prevents abuse.
5. **SQL injection:** Not a concern -- Drizzle ORM uses parameterized queries.
6. **Email enumeration:** The register endpoint returns 409 when an email exists. This is a deliberate UX tradeoff (users need to know why registration failed). If this becomes a concern later, we can switch to a generic error. For now, usability > obscurity for a Pomodoro app.
7. **CSRF:** NextAuth handles CSRF for its own endpoints. The new API routes should validate the Origin header or use NextAuth's CSRF token.

---

## 12. Future Considerations (Out of Scope)

These are NOT part of this spec but are natural follow-ups:

- **Password reset flow:** Forgot password email with reset token. Similar architecture to verification.
- **OAuth providers:** Google, GitHub sign-in. NextAuth makes this straightforward once the DB adapter is in place.
- **Migrate rooms to DB:** If rooms should persist across restarts, add a `rooms` table. For now, rooms are intentionally ephemeral.
- **Email change flow:** Re-verification when a user updates their email.
- **Account deletion:** GDPR-style "delete my data" flow.
- **Move to Postgres:** If PomoPals outgrows SQLite (multiple server instances, high write concurrency), migrate to Postgres. Drizzle makes this a dialect swap.

---

## 13. Open Questions

1. **Minimum password length:** This spec uses 8 characters. The current `AuthModal` uses `minLength={4}`. Should we bump the frontend validation to match? **Recommendation: Yes, update to 8.**
2. **Email sender domain:** Resend requires domain verification for custom `From` addresses. We can use `onboarding@resend.dev` during development and set up `noreply@pomopals.app` for production. Does the team have DNS access for the production domain?
3. **Room creation restriction:** This spec proposes that only verified users can create rooms. Is this too restrictive for the early launch? Alternative: allow room creation but show a "verify to unlock analytics" nudge.
