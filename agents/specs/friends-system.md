# Friends System — Product Spec

**Feature:** Friends System
**Author:** PM Agent
**Date:** 2026-03-01
**Status:** Draft
**Target Engineers:** backend-engineer, frontend-engineer

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Data Models](#2-data-models)
3. [API Contracts](#3-api-contracts)
4. [UX Flows](#4-ux-flows)
5. [Edge Cases](#5-edge-cases)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Implementation Order](#7-implementation-order)

---

## 1. Current State Analysis

### 1.1 What Exists Today

**User Model** (`src/lib/db/schema.ts`):
- Stored in LibSQL (SQLite) via Drizzle ORM
- Fields: `id` (UUID), `name`, `email` (unique), `password_hash`, `email_verified`, `created_at`, `updated_at`
- No social graph, no relationships table, no profile enhancements

**Authentication** (`src/lib/auth.ts`):
- NextAuth v5, Credentials Provider (email/password)
- JWT strategy — session carries `{ id, name, email, emailVerified }`
- Email verification is a soft gate: unverified users can join rooms but not save analytics

**Rooms** (`src/lib/rooms.ts`):
- Entirely in-memory (`Map<roomId, Room>`)
- 6-char alphanumeric room codes
- Auto-cleanup after 2 hours of inactivity
- Max 20 participants; single host controls timer
- Participants: `{ id: string, name: string, joinedAt: ISO8601 }`
- No database persistence; room state is ephemeral

**Real-Time Sync**:
- Client polls room state every 1 second (`/api/rooms/[roomId]`)
- Solo timer uses `BroadcastChannel` for cross-tab sync
- No WebSockets

**Dashboard/Analytics** (`/analytics` page):
- Requires auth; queries SQLite for stored `pomodoro_sessions`
- Displays personal stats only; no social features

**Navigation** (`src/components/Navbar.tsx`):
- Links: Home, Dashboard, Sign In/Out
- No friends, notifications, or social nav items

### 1.2 What Is Missing

| Capability | Status |
|---|---|
| User search / discovery | ❌ Not built |
| Friend relationships table | ❌ Not built |
| Friend request flow | ❌ Not built |
| Broadcasting active sessions | ❌ Not built |
| "Friends online" dashboard widget | ❌ Not built |
| Join-request flow for rooms | ❌ Not built |
| Broadcast opt-out setting | ❌ Not built |
| Notifications (in-app) | ❌ Not built |

### 1.3 Architectural Implications

- **Persistence layer exists**: SQLite/Drizzle is already set up. Friend relationships and requests need new tables added via Drizzle schema + migrations.
- **Rooms are ephemeral**: Active session broadcast cannot rely on the rooms Map as the source of truth for presence. A lightweight "presence" record in the DB (or a parallel in-memory store) is needed to decouple friend visibility from whether the user is in a named room.
- **Polling pattern**: The app already uses 1-second polling for rooms. The "active friends" widget on the dashboard can follow the same polling pattern (lower frequency, e.g. 15 seconds).
- **No push/WebSocket infrastructure**: All real-time features must work with polling or client-initiated requests.
- **Email verification gate**: Any social feature that could expose user data (e.g., seeing a friend's active session) should require `emailVerified = true` to prevent throwaway accounts from harvesting presence data.
- **Guest users**: Guests cannot have friends (no persistent user record). Friend features are auth-only.

---

## 2. Data Models

### 2.1 New Database Tables

#### `friendships`

Represents a confirmed, bidirectional friendship. One row is written when a friend request is accepted.

```sql
CREATE TABLE friendships (
  id          TEXT PRIMARY KEY,           -- UUID
  user_id_a   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_b   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,              -- ISO 8601
  UNIQUE(user_id_a, user_id_b),
  CHECK(user_id_a < user_id_b)           -- canonical ordering prevents duplicate pairs
);

CREATE INDEX idx_friendships_user_a ON friendships(user_id_a);
CREATE INDEX idx_friendships_user_b ON friendships(user_id_b);
```

> **Design note:** Canonical ordering (`user_id_a < user_id_b`) means each friendship pair is stored exactly once. Queries must use `user_id_a = ? OR user_id_b = ?` to fetch all friends for a user.

#### `friend_requests`

Tracks pending, accepted, and rejected friend requests.

```sql
CREATE TABLE friend_requests (
  id              TEXT PRIMARY KEY,       -- UUID
  requester_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected' | 'cancelled'
  created_at      TEXT NOT NULL,          -- ISO 8601
  responded_at    TEXT,                   -- ISO 8601, set when status changes from pending
  UNIQUE(requester_id, recipient_id)      -- one outstanding request per pair
);

CREATE INDEX idx_friend_requests_recipient ON friend_requests(recipient_id, status);
CREATE INDEX idx_friend_requests_requester ON friend_requests(requester_id, status);
```

> **Design note:** A `(requester_id, recipient_id)` UNIQUE constraint prevents spam. After rejection, the requester must wait for a cooldown (see §5) before re-requesting. The `status` column uses a closed enum; `cancelled` is used when the requester withdraws before the recipient responds.

#### `user_presence`

Tracks whether a user is currently in an active Pomodoro work session and, if so, which room (if any). Written by the client on session start/end; TTL-expired records are treated as offline.

```sql
CREATE TABLE user_presence (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_active   INTEGER NOT NULL DEFAULT 0,  -- 1 = in a Pomodoro work phase
  room_id     TEXT,                        -- 6-char room code, NULL for solo sessions
  room_name   TEXT,                        -- cached for display without room lookup
  phase       TEXT,                        -- 'work' | 'shortBreak' | 'longBreak'
  started_at  TEXT,                        -- ISO 8601, when this presence record was set
  expires_at  TEXT NOT NULL,               -- ISO 8601; client must heartbeat to extend
  broadcast_enabled INTEGER NOT NULL DEFAULT 1  -- mirrors user_settings.broadcast_enabled
);
```

> **Design note:** `expires_at` is set to `now + 5 minutes` and must be refreshed by the client every 60 seconds while a session is active. If the client goes offline, the presence naturally expires. A separate cleanup job (or lazy cleanup on read) removes stale rows. This avoids WebSocket complexity while still supporting the feature. We only broadcast work phase presence — break phases are considered private.

#### `user_settings`

Stores per-user feature preferences. Starts minimal; extendable later.

```sql
CREATE TABLE user_settings (
  user_id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  broadcast_enabled   INTEGER NOT NULL DEFAULT 1,  -- 1 = friends can see when you're in a Pomodoro
  friend_limit        INTEGER NOT NULL DEFAULT 50,  -- reserved; see §5
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
```

> **Design note:** A row is lazily created when the user first accesses settings or when their account is created. Reads return defaults if no row exists.

#### `room_join_requests`

Tracks requests from one friend to join another friend's room.

```sql
CREATE TABLE room_join_requests (
  id            TEXT PRIMARY KEY,         -- UUID
  room_id       TEXT NOT NULL,            -- 6-char room code (not FK — rooms are ephemeral)
  requester_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled'
  created_at    TEXT NOT NULL,            -- ISO 8601
  responded_at  TEXT,                     -- ISO 8601
  expires_at    TEXT NOT NULL,            -- ISO 8601 (created_at + 5 minutes)
  UNIQUE(room_id, requester_id)           -- one pending request per user per room
);

CREATE INDEX idx_room_join_requests_host ON room_join_requests(host_id, status);
CREATE INDEX idx_room_join_requests_requester ON room_join_requests(requester_id, status);
```

> **Design note:** `room_id` is not a foreign key because rooms are ephemeral in-memory objects. If the room no longer exists when the host approves, the approve handler returns a "room no longer exists" error and the request is marked `expired`. Requests auto-expire after 5 minutes via `expires_at`.

### 2.2 Updated TypeScript Types (`src/lib/types.ts`)

```typescript
// ─── Friend Relationships ─────────────────────────────────────────────────────

export type FriendRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type RoomJoinRequestStatus = "pending" | "approved" | "denied" | "expired" | "cancelled";

export interface FriendRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  recipientId: string;
  recipientName: string;
  status: FriendRequestStatus;
  createdAt: string;      // ISO 8601
  respondedAt: string | null;
}

export interface Friend {
  userId: string;
  name: string;
  email: string;          // shown only to the friend (privacy)
  friendsSince: string;   // ISO 8601 (createdAt of friendship row)
}

// ─── Presence ────────────────────────────────────────────────────────────────

export interface FriendPresence {
  userId: string;
  name: string;
  isActive: boolean;
  roomId: string | null;   // null = solo session (no shareable room)
  roomName: string | null;
  phase: TimerPhase | null;
  startedAt: string | null; // ISO 8601
  // Note: expiresAt is NOT exposed to clients to avoid gaming presence
}

// ─── Room Join Requests ───────────────────────────────────────────────────────

export interface RoomJoinRequest {
  id: string;
  roomId: string;
  requesterId: string;
  requesterName: string;
  hostId: string;
  status: RoomJoinRequestStatus;
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface UserSettings {
  broadcastEnabled: boolean;
}
```

### 2.3 Presence Heartbeat Contract

The client is responsible for maintaining presence. The heartbeat works as follows:

- **On Pomodoro work phase start:** POST to `/api/presence` with `isActive: true, roomId?, roomName?, phase: "work"`
- **Every 60 seconds while work phase is running:** POST to `/api/presence` with `isActive: true` (heartbeat; extends `expires_at`)
- **On pause, phase transition to break, session end, or page unload:** POST to `/api/presence` with `isActive: false`
- **On page unload (unreliable):** Use `navigator.sendBeacon` (same pattern as the existing partial-session recording in `CompactTimer`)

---

## 3. API Contracts

All new endpoints require `emailVerified = true` unless otherwise noted. All responses are JSON. Standard error shape:

```typescript
{ error: string }
```

---

### 3.1 Friend Requests

#### `POST /api/friends/requests`
Send a friend request to another user.

**Auth:** Required + emailVerified
**Request body:**
```typescript
{ recipientEmail: string }
// We use email as the lookup key; username search is a future enhancement
```

**Response:**
- `201 Created` — request sent
  ```typescript
  { request: FriendRequest }
  ```
- `400 Bad Request` — validation error (missing email, invalid format)
- `404 Not Found` — no user with that email
- `409 Conflict` — request already pending, or already friends
- `422 Unprocessable Entity` — cannot send request to yourself
- `429 Too Many Requests` — re-request cooldown active (see §5.3); includes `retryAfter: ISO8601`

---

#### `GET /api/friends/requests`
List incoming and outgoing friend requests.

**Auth:** Required
**Query params:**
```
?direction=incoming|outgoing|all   (default: all)
?status=pending|accepted|rejected|cancelled|all  (default: pending)
```

**Response `200`:**
```typescript
{
  incoming: FriendRequest[],
  outgoing: FriendRequest[]
}
```

---

#### `PATCH /api/friends/requests/[requestId]`
Accept or reject an incoming friend request. Only the recipient may call this.

**Auth:** Required + emailVerified
**Request body:**
```typescript
{ action: "accept" | "reject" }
```

**Response:**
- `200 OK`
  ```typescript
  { request: FriendRequest }
  // On accept: also creates a friendship row; returns { request, friendship }
  ```
- `403 Forbidden` — caller is not the recipient
- `404 Not Found` — request not found
- `409 Conflict` — request is not in `pending` state

---

#### `DELETE /api/friends/requests/[requestId]`
Cancel an outgoing friend request. Only the requester may call this.

**Auth:** Required
**Response:**
- `200 OK` — `{ request: FriendRequest }` (status = "cancelled")
- `403 Forbidden` — caller is not the requester
- `404 Not Found`
- `409 Conflict` — request is not in `pending` state

---

### 3.2 Friends List

#### `GET /api/friends`
Return the authenticated user's confirmed friends.

**Auth:** Required
**Response `200`:**
```typescript
{ friends: Friend[] }
```

---

#### `DELETE /api/friends/[friendUserId]`
Remove a friend (unfriend). Either party may call this.

**Auth:** Required
**Response:**
- `200 OK` — `{ message: "Friendship removed" }`
- `404 Not Found` — not currently friends

---

### 3.3 Active Friends (Presence)

#### `GET /api/friends/active`
Return which friends are currently in an active Pomodoro work session and have broadcast enabled.

**Auth:** Required + emailVerified
**Response `200`:**
```typescript
{
  activeFriends: FriendPresence[]
  // Only includes friends where:
  //   - is_active = true
  //   - broadcast_enabled = true (in user_presence table)
  //   - expires_at > NOW (not stale)
  //   - Only work phase is exposed; friends in break phases are not listed
}
```

**Notes:**
- Stale presence rows (where `expires_at < NOW`) are lazily cleaned up on this read.
- This endpoint is intended to be polled every 15 seconds by the dashboard.

---

### 3.4 Presence Management

#### `POST /api/presence`
Upsert the authenticated user's presence record (start session, heartbeat, or end session).

**Auth:** Required
**Request body:**
```typescript
{
  isActive: boolean,
  roomId?: string | null,    // 6-char code; required if isActive + in a room
  roomName?: string | null,
  phase?: TimerPhase | null  // required if isActive = true
}
```

**Response `200`:**
```typescript
{ expiresAt: string }  // ISO 8601; client should heartbeat before this
```

**Notes:**
- If `isActive = false`, sets `is_active = 0`, clears room fields.
- If `isActive = true`, sets `expires_at = NOW + 5 minutes`.
- If user has `broadcast_enabled = false` in `user_settings`, the presence row is still written (for the user's own queries) but `broadcast_enabled = 0` so it won't appear in friends' active lists.

---

### 3.5 Room Join Requests

#### `POST /api/rooms/[roomId]/join-requests`
Request to join a friend's active room.

**Auth:** Required + emailVerified
**No request body** (requester identity from session)

**Response:**
- `201 Created`
  ```typescript
  { joinRequest: RoomJoinRequest }
  ```
- `400 Bad Request` — room doesn't exist
- `403 Forbidden` — requester is not a friend of the room host
- `409 Conflict` — already a participant in this room, or pending request already exists
- `422 Unprocessable Entity` — room is at max capacity (20 participants)

---

#### `GET /api/rooms/[roomId]/join-requests`
Return pending join requests for a room. Only the host may call this.

**Auth:** Required
**Response `200`:**
```typescript
{ joinRequests: RoomJoinRequest[] }  // status = "pending" only
```
- `403 Forbidden` — caller is not the room host

---

#### `PATCH /api/rooms/[roomId]/join-requests/[requestId]`
Approve or deny a join request. Only the host may call this.

**Auth:** Required
**Request body:**
```typescript
{ action: "approve" | "deny" }
```

**Response:**
- `200 OK`
  ```typescript
  { joinRequest: RoomJoinRequest }
  // On approve: also adds participant to room; returns { joinRequest, room: RoomResponse }
  ```
- `403 Forbidden` — caller is not the room host
- `404 Not Found` — request not found
- `409 Conflict` — request is not `pending`, or room no longer exists (status set to "expired")
- `422 Unprocessable Entity` — room is now at max capacity

---

#### `GET /api/rooms/[roomId]/join-requests/status`
Poll for the status of the caller's own pending join request (used by the requester while waiting).

**Auth:** Required
**Response `200`:**
```typescript
{ status: RoomJoinRequestStatus, joinRequest: RoomJoinRequest }
```
- `404 Not Found` — no join request from this user for this room

---

### 3.6 User Settings

#### `GET /api/settings`
Return the authenticated user's settings.

**Auth:** Required
**Response `200`:**
```typescript
{ settings: UserSettings }
```

---

#### `PATCH /api/settings`
Update user settings (partial update).

**Auth:** Required
**Request body (partial):**
```typescript
{ broadcastEnabled?: boolean }
```

**Response `200`:**
```typescript
{ settings: UserSettings }
```

---

### 3.7 User Search (for finding friends)

#### `GET /api/users/search`
Search for users by name or email to send friend requests.

**Auth:** Required + emailVerified
**Query params:**
```
?q=<search_term>   (min 3 chars, max 100 chars)
?limit=10          (default: 10, max: 20)
```

**Response `200`:**
```typescript
{
  users: Array<{
    id: string,
    name: string,
    // email is intentionally OMITTED for privacy;
    // shown only if the email matches exactly (to let users find by exact email)
    email?: string,  // included only if q is an exact email match
    isFriend: boolean,
    hasPendingRequest: boolean  // true if a pending request exists in either direction
  }>
}
```

**Notes:**
- Results exclude the calling user.
- Results exclude users who have blocked the caller (see §5.5).
- Name search is case-insensitive prefix/substring match on `name` column.
- Email search is exact match only (to preserve privacy — no typo-driven email discovery).
- Limit results to 20 max; always recommend finding friends by exact email to avoid impersonation.

---

## 4. UX Flows

### 4.1 Adding Friends

**Entry Points:**
- New "Friends" page at `/friends`
- Friend request notification badge in Navbar

**Flow:**

```
[User opens /friends page]
  ├─ Tabs: "My Friends" | "Add Friend" | "Requests" (with badge count)
  │
  └─ [Add Friend tab]
       ├─ Search input: "Search by name or enter email..."
       ├─ User types ≥3 chars → debounced GET /api/users/search
       ├─ Results list shows: avatar initial, name, (email if exact match)
       │   Each result has one of:
       │   ├─ "Add Friend" button → POST /api/friends/requests
       │   ├─ "Request Sent" (disabled, greyed) — pending outgoing request
       │   ├─ "Friends" (disabled, greyed) — already friends
       │   └─ "Accept" button — if there's already an incoming request from them
       │
       └─ On "Add Friend" click:
            ├─ Optimistic UI: button → "Request Sent" (disabled)
            ├─ POST /api/friends/requests { recipientEmail }
            ├─ Success: toast "Friend request sent to [name]!"
            └─ Error: toast with appropriate message (already friends, etc.)
```

**Incoming Requests (Requests tab):**

```
[Requests tab]
  ├─ Section: "Incoming Requests" (shows requester name, "Accept" / "Decline" buttons)
  └─ Section: "Outgoing Requests" (shows recipient name, "Cancel" button)

[Accept click]
  ├─ PATCH /api/friends/requests/[id] { action: "accept" }
  ├─ Success: toast "You and [name] are now friends!", move to My Friends list
  └─ Error: toast "Request no longer available"

[Decline click]
  ├─ Confirmation: "Decline friend request from [name]?"
  ├─ PATCH /api/friends/requests/[id] { action: "reject" }
  └─ Row removed from list

[Cancel outgoing click]
  ├─ DELETE /api/friends/requests/[id]
  └─ Row removed from list
```

**My Friends tab:**

```
[My Friends tab]
  ├─ Friends list: avatar initial, name, "Friends since [date]"
  ├─ Each row: "Unfriend" button (behind "..." menu to prevent accidental clicks)
  └─ [Unfriend flow]
       ├─ Confirmation modal: "Remove [name] from your friends list? They won't be notified."
       ├─ DELETE /api/friends/[userId]
       └─ Success: removed from list, toast "Removed [name] from friends"
```

---

### 4.2 Seeing Active Friends on the Dashboard

**Location:** `/analytics` dashboard page — new "Friends Activity" widget

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Friends Activity                              🔄 15s │
├─────────────────────────────────────────────────────┤
│  No friends currently in a Pomodoro session.         │
│  [Invite a friend]                                   │
└─────────────────────────────────────────────────────┘
```

When active friends exist:

```
┌─────────────────────────────────────────────────────┐
│  Friends Activity                              🔄 15s │
├─────────────────────────────────────────────────────┤
│  🟢  Alice        In a room "Study Grind"   [Join]   │
│  🟢  Bob          Solo Pomodoro             [—]      │
│  🟢  Carol        In a room "Deep Work"     [Join]   │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Widget polls `GET /api/friends/active` every 15 seconds.
- **"Join" button** is shown when the friend is in a named room (has a `roomId`). It is absent for solo sessions (no shareable entry point).
- **"Join" click** triggers the Join Request Flow (§4.3).
- If the user has zero friends, show a placeholder: "Add friends to see when they're focusing."
- If all friends have broadcast disabled or none are active, show "No friends currently in a Pomodoro session."

**Navbar badge:**
- A small red dot on the "Friends" nav link indicates unread friend requests (pending incoming).
- Polled every 30 seconds or invalidated on navigation to `/friends`.

---

### 4.3 Join Request Flow

This flow covers: Friend A (requester) wants to join Friend B's (host) room.

**Preconditions:**
- A and B are friends
- B is in an active work-phase Pomodoro in a named room
- B has broadcast enabled
- Room has < 20 participants

**Step 1 — Requester initiates:**

```
[User clicks "Join" next to friend in "Friends Activity" widget]
  ↓
[Join Request Modal opens]
  ├─ "Request to join [Friend Name]'s room?"
  ├─ Room name: "Study Grind"
  ├─ "They'll see a notification and can approve or deny your request."
  ├─ [Cancel] [Send Join Request]
  │
  └─ [Send Join Request click]
       ├─ POST /api/rooms/[roomId]/join-requests
       ├─ Success → Modal transitions to "Waiting for approval" state
       │     ├─ Spinner + "[Friend Name] has been notified."
       │     ├─ "This request will expire in 5 minutes."
       │     ├─ [Cancel Request] button
       │     └─ Polls GET /api/rooms/[roomId]/join-requests/status every 3 seconds
       └─ Error → toast + modal closes
```

**Step 2 — Host receives notification:**

```
[Host (Friend B) sees in-app notification]
  ├─ Location: sticky banner at top of /room/[roomId] page
  │     "[Alice] wants to join your room."  [Deny] [Approve]
  │
  ├─ [Approve click]
  │     ├─ PATCH /api/rooms/[roomId]/join-requests/[id] { action: "approve" }
  │     ├─ Success: Alice is added to room participants; banner dismissed
  │     └─ Error toast if room full / room gone
  │
  └─ [Deny click]
        ├─ PATCH /api/rooms/[roomId]/join-requests/[id] { action: "deny" }
        └─ Banner dismissed
```

> **Host notification polling:** The room page already polls `/api/rooms/[roomId]` every second. We add `GET /api/rooms/[roomId]/join-requests` to the poll cycle (same 1s interval) so the banner appears within ~1 second.

**Step 3a — Request approved:**

```
[Requester's waiting modal detects status = "approved"]
  ├─ Toast: "Request approved! Joining room..."
  ├─ Modal closes
  └─ Navigate to /room/[roomId]
       └─ Standard room join flow (existing POST /api/rooms/[roomId] { action: "join" })
```

**Step 3b — Request denied:**

```
[Requester's waiting modal detects status = "denied"]
  ├─ Modal transitions to "Request Denied" state
  ├─ "[Friend Name] declined your request."
  └─ [Close] button
```

**Step 3c — Request expired (5 minutes elapsed, no response):**

```
[Requester's waiting modal detects status = "expired" OR expiresAt has passed]
  ├─ Modal transitions to "Request Expired"
  ├─ "[Friend Name] didn't respond in time."
  └─ [Close] button
```

---

### 4.4 Broadcast Toggle (Settings)

**Location:** Existing Settings modal (accessible via the gear icon on the timer) — add a new "Privacy" section.

**Settings modal — new section:**

```
┌─────────────────────────────────────────────────┐
│  Privacy                                         │
├─────────────────────────────────────────────────┤
│  Share my Pomodoro sessions with friends         │
│  When enabled, friends can see when you're       │
│  focusing and request to join your rooms.        │
│                                          [ON ●]  │
└─────────────────────────────────────────────────┘
```

**Behavior:**
- Toggle reads from `GET /api/settings` on modal open.
- Toggle change: optimistic UI update, then `PATCH /api/settings { broadcastEnabled: false/true }`.
- If turned OFF mid-session:
  - Immediately posts `POST /api/presence { isActive: false }` to clear their presence record.
  - Friends currently viewing the dashboard will see them disappear on next poll.
  - Toast: "You are now invisible to friends."
- If turned ON:
  - If a session is currently running, POST `POST /api/presence` to re-activate presence.
  - Toast: "Your Pomodoro sessions are now visible to friends."

**Settings page (`/settings` — new route):**

While the toggle lives in the Settings modal, a dedicated `/settings` page should also exist for discoverability. It contains:
- Same broadcast toggle
- Future: notification preferences, account management
- Link from profile/navbar (future enhancement)

---

## 5. Edge Cases

### 5.1 User Goes Offline During a Pomodoro

**Scenario:** User A is in a Pomodoro session (presence active), then closes their laptop without ending the session.

**Handling:**
- The `user_presence` table has `expires_at = now + 5 minutes`.
- Client sends heartbeat every 60 seconds. After ~5 minutes of no heartbeat, `expires_at` passes.
- `GET /api/friends/active` filters out rows where `expires_at < NOW`.
- User A disappears from friends' "Friends Activity" widget on the next poll (within 15 seconds of expiry).
- When User A reconnects and the Zustand store rehydrates from localStorage, the timer may still be "running" (it calculates elapsed time from `startedAt`). The existing tick logic in `timer-store.ts` handles this. On rehydration, the client should also call `POST /api/presence` to re-establish presence.
- **On page unload:** `CompactTimer` already uses `sendBeacon` for session recording. We add a beacon call to `POST /api/presence { isActive: false }` on `beforeunload`. This is best-effort; the TTL expiry is the primary safety net.

### 5.2 Pomodoro Ends While Join Request Is Pending

**Scenario:** User B finishes their Pomodoro (timer completes, or they manually reset) while User A's join request is still `pending`.

**Handling:**
- Option A — Room still exists but timer is in break phase:
  - Join request remains `pending`.
  - Requester's waiting modal shows they are still waiting.
  - Host's room page still shows the notification banner.
  - If host approves, A joins the room (and will see the break phase timer).
- Option B — Room is ended (`endRoom` called):
  - Next time the host's join-requests poll fires (`GET /api/rooms/[roomId]/join-requests`), the API checks if the room exists. If not, it marks all pending requests for that room as `expired`.
  - Requester's status poll detects `expired` → shows "Room no longer exists" in the waiting modal.
- Option C — Phase transitions to shortBreak but room persists:
  - The join request remains valid. The host can still approve/deny during breaks.

### 5.3 Re-Request Cooldown After Rejection

**Scenario:** User B rejects User A's friend request. User A immediately re-sends.

**Handling:**
- After a `rejected` status, a 24-hour cooldown is enforced before the same requester can send a new request to the same recipient.
- `POST /api/friends/requests` checks: is there a request with `(requester_id, recipient_id)` that was `rejected` and `responded_at > NOW - 24h`? If yes → `429 Too Many Requests` with `retryAfter: ISO8601`.
- This is tracked on the `friend_requests` table; old rejected requests are not deleted, they are kept for audit.
- After the cooldown, a new request row can be inserted (the UNIQUE constraint must allow this — use `ON CONFLICT REPLACE` or soft-delete the old rejected row before inserting).

### 5.4 Simultaneous Friend Requests (Both Users Request Each Other)

**Scenario:** User A sends a request to B. Before B responds, B also sends a request to A.

**Handling:**
- B's `POST /api/friends/requests` will find an existing `pending` request from A to B.
- Server auto-accepts: mark A→B as `accepted`, create the friendship row, return `201` with `{ autoAccepted: true, message: "You and [A] are now friends!" }`.
- This provides a seamless UX — both users wanted to be friends.

### 5.5 Blocking (Future Feature Stub)

**Full blocking is out of scope for this feature**, but the architecture must not prevent it. Stubs:
- A future `blocks` table will record `(blocker_id, blocked_id)` pairs.
- All social API routes should have a comment: `// TODO: check blocks table`
- `GET /api/users/search` should filter out blocked users (this is already noted in §3.7).
- Unfriending (§3.2) does not prevent future re-friending; blocking is the stronger action.
- For now: document that unfriending removes the friendship but does not restrict future contact.

### 5.6 Friend Limit

**Default limit: 50 friends** (stored in `user_settings.friend_limit` for future admin overrides).

- Enforced at `POST /api/friends/requests`: if either the requester or recipient already has 50 friends, return `422 Unprocessable Entity` with `{ error: "Friend limit reached" }`.
- Display count on the `/friends` page: "23 / 50 friends".

### 5.7 Room Capacity Race Condition (Join Request Approval)

**Scenario:** Room has 19 participants. Two friends both have pending join requests. Host approves both simultaneously.

**Handling:**
- The `joinRoom` function in `src/lib/rooms.ts` already checks `MAX_PARTICIPANTS = 20`.
- The `PATCH /api/rooms/[roomId]/join-requests/[id]` approve handler must:
  1. Re-check room capacity inside the handler (after marking request approved).
  2. If room is now full: return `422` and revert the request to `pending` (or mark `denied`).
- Since the room is in-memory (not a transactional DB), this is best-effort. Document the known race and accept occasional over-capacity errors that surface as toast messages.

### 5.8 Guest Users and Friends

- Guests (unauthenticated room participants) cannot have friends — they have no persistent user record.
- The "Friends" nav link is not shown to unauthenticated users.
- If a guest navigates to `/friends`, redirect to `/` with an auth prompt.
- Room join requests require auth; if an unauthenticated user clicks "Join" on a friend's active session (impossible by design — the dashboard requires auth), they should see an auth modal.

### 5.9 Account Deletion Cascade

- The `friendships` and `friend_requests` tables use `ON DELETE CASCADE` referencing the `users` table.
- When a user deletes their account, all friendship rows, requests, presence records, and settings are deleted automatically by the DB.
- `room_join_requests` also cascades on both `requester_id` and `host_id`.

### 5.10 Self-Friend Request

- `POST /api/friends/requests` where `recipientEmail === session.user.email` → `422 Unprocessable Entity` with `{ error: "You cannot send a friend request to yourself" }`.

### 5.11 Presence Privacy for Non-Broadcast Users

- If User A has `broadcastEnabled = false`, their presence row is still written to `user_presence` (so the system knows they're in a session internally), but `broadcast_enabled = 0` in the row.
- `GET /api/friends/active` filters `WHERE broadcast_enabled = 1`. User A will never appear in any friend's active list.
- Corollary: User A cannot receive room join requests while broadcast is disabled (there's no visible room to request joining).

### 5.12 Expired Join Requests (Lazy vs. Active Cleanup)

- Expired join requests (where `expires_at < NOW` and status is still `pending`) are handled lazily:
  - On `GET /api/rooms/[roomId]/join-requests` (host polling), expired pending requests are excluded from results AND their status is updated to `expired` in the DB.
  - On `GET /api/rooms/[roomId]/join-requests/status` (requester polling), if `expires_at < NOW` and status is still `pending`, the API returns `expired` status and updates the DB.
- A nightly cleanup job (future) can sweep old expired/cancelled rows older than 30 days.

---

## 6. Acceptance Criteria

### 6.1 Friend Requests

- [ ] **AC-FR-01:** An authenticated, email-verified user can search for other users by name (≥3 char) or exact email.
- [ ] **AC-FR-02:** Search results show name, whether they're already a friend, and whether a request is pending.
- [ ] **AC-FR-03:** A user can send a friend request; the recipient sees it in their "Requests" tab within one page load.
- [ ] **AC-FR-04:** Sending a duplicate request (already pending) returns a clear error; UI prevents the button being clicked twice.
- [ ] **AC-FR-05:** A user cannot send a friend request to themselves.
- [ ] **AC-FR-06:** The recipient can accept or reject a request.
- [ ] **AC-FR-07:** Accepting creates the friendship; both users see each other in "My Friends."
- [ ] **AC-FR-08:** Rejecting removes the request from the recipient's list and notifies the requester's UI (request no longer "pending").
- [ ] **AC-FR-09:** The requester can cancel an outgoing pending request.
- [ ] **AC-FR-10:** If both users send requests to each other simultaneously, the system auto-accepts and both see a friendship created.
- [ ] **AC-FR-11:** After rejection, the requester cannot re-send a request for 24 hours (API returns 429 with retryAfter).
- [ ] **AC-FR-12:** Friend limit of 50 is enforced; attempting to add a 51st friend returns a clear error.

### 6.2 Friends List

- [ ] **AC-FL-01:** "My Friends" tab lists all confirmed friends with name and "Friends since" date.
- [ ] **AC-FL-02:** A user can unfriend another user with a confirmation step.
- [ ] **AC-FL-03:** After unfriending, neither user appears in the other's friends list.
- [ ] **AC-FL-04:** The Navbar shows a badge on the "Friends" link when there are pending incoming requests.

### 6.3 Presence & Broadcast

- [ ] **AC-PR-01:** When a user starts a Pomodoro work session (any mode — solo or room), `POST /api/presence` is called with `isActive: true`.
- [ ] **AC-PR-02:** Presence heartbeat is sent every 60 seconds while a session is running.
- [ ] **AC-PR-03:** When a user pauses, ends, or transitions to a break phase, `POST /api/presence { isActive: false }` is called.
- [ ] **AC-PR-04:** On page/tab unload, a beacon fires to clear presence.
- [ ] **AC-PR-05:** If a user goes offline without clearing presence, they disappear from friends' lists within 5 minutes + 15 seconds (TTL + poll interval).
- [ ] **AC-PR-06:** A user with `broadcastEnabled = false` does NOT appear in any friend's "Friends Activity" widget.
- [ ] **AC-PR-07:** Break phases (shortBreak, longBreak) do NOT show as active presence.

### 6.4 Dashboard Friends Activity Widget

- [ ] **AC-DA-01:** The "Friends Activity" widget is visible on `/analytics` for authenticated users.
- [ ] **AC-DA-02:** Widget polls `GET /api/friends/active` every 15 seconds and updates without a page reload.
- [ ] **AC-DA-03:** Friends in active room sessions show their room name and a "Join" button.
- [ ] **AC-DA-04:** Friends in solo sessions show "Solo Pomodoro" with no "Join" button.
- [ ] **AC-DA-05:** Users with no friends see a placeholder: "Add friends to see when they're focusing."
- [ ] **AC-DA-06:** When a friend ends their session, they disappear from the widget on the next poll.

### 6.5 Join Request Flow

- [ ] **AC-JR-01:** Clicking "Join" on a friend's active room opens a confirmation modal before sending the request.
- [ ] **AC-JR-02:** A join request can only be sent if the requester is a confirmed friend of the room host.
- [ ] **AC-JR-03:** After sending, the modal transitions to a "Waiting for approval" state and polls for status every 3 seconds.
- [ ] **AC-JR-04:** The host sees a notification banner on the room page within ~2 seconds of the request being sent.
- [ ] **AC-JR-05:** The host can approve or deny the request from the room page.
- [ ] **AC-JR-06:** On approval, the requester is automatically navigated to the room and joined as a participant.
- [ ] **AC-JR-07:** On denial, the requester sees a "Request Denied" state in their modal.
- [ ] **AC-JR-08:** Requests auto-expire after 5 minutes; requester sees a "Request Expired" state.
- [ ] **AC-JR-09:** A join request cannot be sent if the room is at max capacity (20 participants); the error is shown to the requester.
- [ ] **AC-JR-10:** The requester can cancel their pending request while waiting; the host's banner is dismissed on next poll.
- [ ] **AC-JR-11:** If the room ceases to exist before approval, the request is marked expired and the requester sees a "Room no longer exists" message.

### 6.6 Broadcast Toggle

- [ ] **AC-BT-01:** The Settings modal (gear icon) has a "Privacy" section with a broadcast toggle.
- [ ] **AC-BT-02:** Toggle state is loaded from `GET /api/settings` when the modal opens.
- [ ] **AC-BT-03:** Toggling off immediately clears the user's presence (they disappear from friends' widgets on next poll).
- [ ] **AC-BT-04:** Toggling on while a session is running re-establishes presence.
- [ ] **AC-BT-05:** The setting persists across sessions (stored in DB, not localStorage).

---

## 7. Implementation Order

The following order respects technical dependencies. Backend work must precede the frontend features that consume it.

### Phase 1 — Backend Foundation
1. **DB schema:** Add `friendships`, `friend_requests`, `user_presence`, `user_settings`, `room_join_requests` tables to `src/lib/db/schema.ts` + run migration.
2. **User settings API:** `GET /api/settings`, `PATCH /api/settings`
3. **User search API:** `GET /api/users/search`
4. **Friend requests API:** `POST /api/friends/requests`, `GET /api/friends/requests`, `PATCH /api/friends/requests/[id]`, `DELETE /api/friends/requests/[id]`
5. **Friends list API:** `GET /api/friends`, `DELETE /api/friends/[userId]`

### Phase 2 — Presence & Broadcast
6. **Presence API:** `POST /api/presence`, `GET /api/friends/active`
7. **Presence integration in timer:** Update `CompactTimer` and room view to call presence API on start/pause/end/unload.

### Phase 3 — Join Requests
8. **Room join request API:** `POST /api/rooms/[roomId]/join-requests`, `GET /api/rooms/[roomId]/join-requests`, `PATCH /api/rooms/[roomId]/join-requests/[id]`, `GET /api/rooms/[roomId]/join-requests/status`

### Phase 4 — Frontend
9. **`/friends` page:** Friends list, add friend search, incoming/outgoing requests.
10. **Navbar badge:** Pending request count.
11. **Dashboard widget:** "Friends Activity" widget with polling.
12. **Join request modal:** Requester waiting modal + host notification banner in room view.
13. **Settings broadcast toggle:** Add privacy section to Settings modal.

---

## Appendix A: File Change Summary

| File | Change |
|---|---|
| `src/lib/db/schema.ts` | Add 5 new tables |
| `src/lib/types.ts` | Add Friend, FriendRequest, FriendPresence, RoomJoinRequest, UserSettings types |
| `src/app/api/friends/requests/route.ts` | New: POST, GET |
| `src/app/api/friends/requests/[requestId]/route.ts` | New: PATCH, DELETE |
| `src/app/api/friends/route.ts` | New: GET, DELETE(via [friendUserId]) |
| `src/app/api/friends/[friendUserId]/route.ts` | New: DELETE |
| `src/app/api/friends/active/route.ts` | New: GET |
| `src/app/api/presence/route.ts` | New: POST |
| `src/app/api/settings/route.ts` | New: GET, PATCH |
| `src/app/api/users/search/route.ts` | New: GET |
| `src/app/api/rooms/[roomId]/join-requests/route.ts` | New: POST, GET |
| `src/app/api/rooms/[roomId]/join-requests/[requestId]/route.ts` | New: PATCH |
| `src/app/api/rooms/[roomId]/join-requests/status/route.ts` | New: GET |
| `src/app/friends/page.tsx` | New page |
| `src/app/settings/page.tsx` | New page |
| `src/components/FriendsPage.tsx` | New: full friends management UI |
| `src/components/FriendsActivityWidget.tsx` | New: dashboard presence widget |
| `src/components/JoinRequestModal.tsx` | New: requester waiting modal |
| `src/components/RoomJoinRequestBanner.tsx` | New: host notification banner |
| `src/components/Navbar.tsx` | Add Friends link + badge |
| `src/components/Settings.tsx` | Add broadcast toggle |
| `src/components/Dashboard.tsx` | Embed FriendsActivityWidget |
| `src/components/CompactTimer.tsx` | Add presence API calls |
| `src/components/RoomView.tsx` | Add join-requests polling + banner |
| `src/store/friends-store.ts` | New: Zustand store for friends state |

---

## Appendix B: Open Questions

1. **Notifications:** Should friend request acceptance trigger an email notification (like the existing email verification flow)? Or in-app only for v1?
2. **Room visibility:** Should non-broadcasting users be able to manually share their room link with friends outside of the presence system? (Currently yes — room codes are shareable links regardless of broadcast setting.)
3. **Mutual unfriend notification:** Should unfriending send an email or in-app notification to the removed friend? (Recommended: no — silent unfriend is standard practice.)
4. **Search privacy:** Should users be able to hide themselves from name-based search (only discoverable by exact email)? Could be a future `user_settings.searchable` flag.
5. **Break visibility:** Currently, break phases are invisible to friends. Should there be a "on break" status that's shown (without the Join button)? This could reduce friend FOMO but also exposes more data.
6. **Multiple pending join requests:** Can the host have multiple pending join requests simultaneously? Current design says yes (one per room per requester, but multiple requesters). Is there a UX for managing a queue of requests?
