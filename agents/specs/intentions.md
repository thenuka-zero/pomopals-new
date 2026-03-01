# Feature Spec: Intentions

**Status:** Draft
**Date:** 2026-03-01
**Author:** PM Agent

---

## 1. Overview

Intentions is an optional, opt-in feature that encourages users to set a micro-goal before each Pomodoro work session and reflect on whether they achieved it when the session ends. The feature surfaces as a lightweight pre-session prompt and a post-session reflection modal, and accumulates into a personal "Intentions Journal" on the dashboard with completion trends.

The core user loop is:

```
[Optional] Enter intention → Start Pomodoro → Timer runs → [Natural end] → Reflect → Journal updated
```

The feature must be non-intrusive: users who don't want it can disable it entirely in settings, and even enabled users are never blocked from starting a timer.

---

## 2. Goals

- Encourage focused, intentional work by anchoring each session to a clear micro-goal.
- Close the feedback loop: did the user accomplish what they set out to do?
- Provide longitudinal visibility into intention quality and follow-through over time.
- Remain invisible to users who opt out.

## 3. Non-Goals

- Intentions are **not** shared with room participants. They are always personal.
- Intentions do **not** replace or duplicate session analytics — they are a separate dimension alongside existing `PomodoroSession` tracking.
- This spec does not cover gamification beyond streaks (no badges, no points system).
- Mobile push notifications are out of scope.

---

## 4. User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| U1 | Focus user | Write a brief intention before starting a Pomodoro | I stay on-task and have a clear goal for the session |
| U2 | Focus user | Be prompted at the end of a Pomodoro to mark my intention as completed or not | I can reflect honestly on whether I stayed focused |
| U3 | Focus user | Add an optional note when marking my intention | I can capture quick context (e.g., "got distracted by Slack") |
| U4 | Reflective user | Browse a journal of all past intentions | I can see my productivity patterns over time |
| U5 | Reflective user | See my completion rate and streaks in the journal | I can understand my focus trends |
| U6 | Minimalist user | Disable the intentions feature entirely | I am never bothered by prompts I don't want |
| U7 | Room user | Use intentions in a shared room | I have personal goals even in collaborative sessions |
| U8 | Skipping user | NOT be prompted for a reflection when I manually skip a Pomodoro | Reflections only matter for sessions I actually completed |

---

## 5. Feature Architecture

### 5.1 Data Model

#### New Database Table: `intentions`

```sql
CREATE TABLE intentions (
  id           TEXT PRIMARY KEY,              -- UUID, client-generated
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id   TEXT,                           -- FK to pomodoroSessions.id (nullable — set on reflection)
  text         TEXT NOT NULL,                  -- The intention string (max 280 chars)
  status       TEXT NOT NULL DEFAULT 'pending',-- 'pending' | 'completed' | 'not_completed' | 'skipped'
  note         TEXT,                           -- Optional reflection note (max 500 chars)
  started_at   TEXT NOT NULL,                  -- ISO 8601 — when the timer was started with this intention
  reflected_at TEXT,                           -- ISO 8601 — when the user submitted their reflection
  date         TEXT NOT NULL,                  -- YYYY-MM-DD for grouping (derived from started_at)
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX intentions_user_id_date ON intentions(user_id, date);
CREATE INDEX intentions_session_id ON intentions(session_id);
```

**Status lifecycle:**

```
pending  →  completed       (natural completion + user marked done)
         →  not_completed   (natural completion + user marked not done)
         →  skipped         (timer was manually skipped or reset before natural end)
```

#### Extending `userSettings` Table

Add one new column:

```sql
ALTER TABLE user_settings ADD COLUMN intentions_enabled INTEGER NOT NULL DEFAULT 1;
-- 1 = enabled (default on), 0 = disabled
```

This uses the existing settings upsert pattern and is returned from `GET /api/settings`.

#### Linking Intentions to Sessions

`intentions.session_id` is a nullable FK to `pomodoroSessions.id`. It is `NULL` when the intention is first created (we don't know the session ID yet at start time), and is populated when the user submits their reflection — at that point we know which session completed.

If the timer completes but the user dismisses the reflection without submitting, the intention remains `pending` and `session_id` stays `NULL`. A background reconciliation pass (on next journal load) marks stale `pending` intentions as `skipped` if their `started_at + planned_duration + 30 minutes < now`.

### 5.2 TypeScript Types

Add to `src/lib/types.ts`:

```typescript
// ── Intentions ──────────────────────────────────────────────────────────────

export type IntentionStatus = "pending" | "completed" | "not_completed" | "skipped";

export interface Intention {
  id: string;
  userId: string;
  sessionId: string | null;
  text: string;
  status: IntentionStatus;
  note: string | null;
  startedAt: string;       // ISO 8601
  reflectedAt: string | null;
  date: string;            // YYYY-MM-DD
  createdAt: string;
}

export interface CreateIntentionPayload {
  id: string;              // client-generated UUID
  text: string;
  startedAt: string;
  date: string;
}

export interface ReflectIntentionPayload {
  status: "completed" | "not_completed";
  sessionId?: string;
  note?: string;
  reflectedAt: string;
}

export interface IntentionJournalEntry extends Intention {
  // Derived fields added by the API for display convenience
  plannedDuration?: number;   // from linked session (seconds)
  actualDuration?: number;    // from linked session (seconds)
}

export interface IntentionTrends {
  totalIntentions: number;
  completedCount: number;
  notCompletedCount: number;
  skippedCount: number;
  completionRate: number;       // 0–100
  currentStreak: number;        // consecutive days with ≥1 completed intention
  longestStreak: number;
  last30Days: DailyIntentionStat[];
}

export interface DailyIntentionStat {
  date: string;
  total: number;
  completed: number;
  completionRate: number;
}
```

Extend existing `UserSettings`:

```typescript
export interface UserSettings {
  broadcastEnabled: boolean;
  intentionsEnabled: boolean;   // new
}
```

### 5.3 Timer Store Changes (`src/store/timer-store.ts`)

Add the following fields and actions to the Zustand store:

```typescript
// New state fields
currentIntention: string;         // text typed before starting — empty string if none
pendingReflection: boolean;       // true when a natural completion just occurred and we need reflection
lastCompletedIntentionId: string | null; // the intention ID from the just-completed session
lastCompletedSessionId: string | null;   // the session ID from the just-completed session

// New actions
setCurrentIntention: (text: string) => void;
clearCurrentIntention: () => void;
setPendingReflection: (value: boolean) => void;
```

**Persistence:** `currentIntention` should be persisted in `localStorage` (it's reasonable for the user to come back to a tab and still see their typed intention). `pendingReflection` and `lastCompletedIntentionId`/`lastCompletedSessionId` should also be persisted so they survive tab reloads during the reflection window.

**`start()` action changes:**

When `start()` is called and `currentIntention` is non-empty, the component layer (not the store) is responsible for calling `POST /api/intentions` to create the intention record. The store does not make API calls — it only tracks state. The component passes the newly created `intentionId` back via `setLastCompletedIntentionId` after creation, or alternatively the component tracks the active `intentionId` in local component state.

> **Design rationale:** Keeping API calls out of the Zustand store maintains the existing pattern in the codebase (see `CompactTimer.tsx` which calls `POST /api/analytics` directly, not from the store).

**Natural completion detection changes:**

The existing `tick()` function already transitions the phase when `timeRemaining <= 0`. At that transition point, if the phase was `"work"`, set `pendingReflection: true` (only if the transition was natural, not a `skip()` or `reset()`). The distinction between natural completion and skip already exists via `lastTransitionType`.

Add to the `transitionPhase()` internal function:

```typescript
// After recording the session:
if (phase === "work" && transitionType === "completed") {
  set({
    pendingReflection: true,
    lastCompletedSessionId: newSession.id
  });
}
```

### 5.4 API Routes

#### `POST /api/intentions`

Creates a new intention at the moment the user starts a timer.

**Auth:** Required
**Body:** `CreateIntentionPayload`
**Response:** `{ success: true; intention: Intention }`

Validation:
- `text` must be 1–280 characters
- `startedAt` must be a valid ISO date string
- `date` must be YYYY-MM-DD

#### `PATCH /api/intentions/[intentionId]`

Updates an intention with reflection data.

**Auth:** Required; user must own the intention
**Body:** `ReflectIntentionPayload`
**Response:** `{ success: true; intention: Intention }`

Validation:
- `status` must be `"completed"` or `"not_completed"`
- `note` max 500 characters
- `reflectedAt` must be a valid ISO date string
- Cannot reflect on an already-reflected intention (idempotency: allow re-submitting the same status, reject status change)

#### `POST /api/intentions/[intentionId]/skip`

Marks an intention as skipped (called when a session is manually skipped or reset while an intention is active).

**Auth:** Required; user must own the intention
**Body:** `{}` (empty)
**Response:** `{ success: true }`

Only transitions from `pending` → `skipped`. Idempotent.

#### `GET /api/intentions`

Returns paginated intentions for the journal.

**Auth:** Required
**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 50)
- `status` — filter by status (optional)
- `from` — start date YYYY-MM-DD (optional)
- `to` — end date YYYY-MM-DD (optional)

**Response:**
```typescript
{
  intentions: IntentionJournalEntry[];
  total: number;
  page: number;
  totalPages: number;
}
```

#### `GET /api/intentions/trends`

Returns aggregated trends for the journal header.

**Auth:** Required
**Query params:** none (always returns trends for all-time + last 30 days)

**Response:** `IntentionTrends`

Streak calculation logic:
- **Current streak:** Walk backwards from today, day by day. A day "counts" if the user has at least one intention with status `completed` or `not_completed` (i.e., they reflected, regardless of outcome). Stop when a day has zero reflections.
- **Longest streak:** Same logic, maximum consecutive run across all-time data.

#### `PATCH /api/settings` (extended, no new route)

The existing settings endpoint gains awareness of `intentionsEnabled`:

```typescript
// PATCH body (now also accepts):
{ intentionsEnabled: boolean }

// GET response (now also returns):
{ settings: { broadcastEnabled: boolean; intentionsEnabled: boolean } }
```

---

## 6. UI / UX Flow

### 6.1 Pre-Session Intention Input

**Location:** Below the timer controls in both `CompactTimer.tsx` (expanded view) and the room timer controls in `RoomView.tsx`.

**Appearance:** A single text input, styled as a subtle pill/chip area:

```
╭──────────────────────────────────────────╮
│ 💭  What do you want to accomplish?       │
│     [                                  ] │
╰──────────────────────────────────────────╯
```

- Placeholder text: *"What will you focus on? (optional)"*
- Max 280 characters, with a subtle character counter appearing after 200 chars
- The input is shown **only when the timer is in `idle` or `paused` state AND the phase is `work`** (i.e., not during break phases — you don't set intentions for breaks)
- When the timer is `running`, the active intention (if any) is displayed as read-only text below the timer — e.g., *"💭 Writing intro section of my essay"* — replacing the input
- The input is **never required** — users can start without typing anything. The Start button is never blocked by this field.
- When `intentionsEnabled` is `false` in settings, this entire section is hidden.

**Behavior on Start:**
1. User types (or leaves blank) and presses Start.
2. If text is non-empty:
   - Generate a client-side UUID (`intentionId`).
   - Call `POST /api/intentions` with `{ id: intentionId, text, startedAt: now, date: today }`.
   - Store `intentionId` in component state (not Zustand) for use when the session ends.
   - On API failure: silently continue — timer starts regardless, intention just won't be saved.
3. If text is empty: no API call, no `intentionId` tracked.

**Behavior on Skip/Reset (when intention was set):**
- Call `POST /api/intentions/[intentionId]/skip` — fire and forget.
- Clear `currentIntention` in the store.
- Clear local `intentionId`.

### 6.2 Post-Session Reflection Modal

**Trigger:** When `pendingReflection` becomes `true` in the timer store AND an `intentionId` was active during the session.

If no intention was set for the session, `pendingReflection` still becomes `true` but the modal is **not shown** — there is nothing to reflect on.

**Component:** New `IntentionReflectionModal.tsx`

```
╭───────────────────────────────────────────────────╮
│                 🎉 Pomodoro Complete!               │
│                                                    │
│  Your intention was:                               │
│  "Write the introduction section of my essay"      │
│                                                    │
│  Did you accomplish it?                            │
│                                                    │
│   ✅ Completed          ❌ Not completed            │
│                                                    │
│  Add a note (optional)                             │
│  ┌────────────────────────────────────────────┐   │
│  │                                            │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│                         [ Submit Reflection ]      │
╰───────────────────────────────────────────────────╯
```

- **Modal is non-blocking:** A "Skip reflection" link/button is visible at the bottom. Clicking it dismisses the modal without calling the API — the intention stays `pending` and will be reconciled to `skipped` later.
- The modal does **not** auto-dismiss on a timer. The user must actively choose to submit or skip.
- The note field has a 500-character limit with a character counter.
- The two status buttons toggle selection (one must be selected to submit).
- On Submit:
  1. Call `PATCH /api/intentions/[intentionId]` with `{ status, note, sessionId, reflectedAt }`.
  2. Call `setPendingReflection(false)` and `clearCurrentIntention()` in the store.
  3. Show a brief success toast: "Reflection saved ✓"
  4. Close modal.
- On API failure: show an error inline, allow retry. Do not close the modal.
- Transition to the next phase (break timer) begins immediately regardless of whether the user has completed the reflection — the modal overlays the timer UI.

**Where it renders:** In `CompactTimer.tsx` and `RoomView.tsx` — both components already check for `pendingReflection`-style state. The modal is rendered at the page level (using a portal or at the root of the component tree) so it appears above all other UI.

**Room mode specifics:** The modal behavior is identical. Intentions are personal — other room participants are not notified and do not see the modal. The room timer continues ticking normally while the individual user is on the reflection modal.

### 6.3 Intentions Journal

**Location:** New route `/intentions` — accessible from the main navigation.

**Navbar change:** Add "Journal" link in the authenticated nav between "Dashboard" and "Friends" (or under a dropdown if nav gets crowded). Alternatively, add it as a tab within the existing `/analytics` dashboard page. **Recommendation: new `/intentions` page** to keep the analytics page focused on quantitative session data and let the journal feel more personal.

**Page layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Intentions Journal                                     │
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐ │
│  │  Total  │  │ Completed│  │  Rate   │  │  Streak   │ │
│  │   128   │  │    94   │  │  73.4%  │  │  🔥 12d   │ │
│  └─────────┘  └─────────┘  └─────────┘  └───────────┘ │
│                                                         │
│  [Completion Rate — last 30 days bar chart]             │
│                                                         │
│  ── Filter: [All ▾]  [Date range]  ────────────────── │
│                                                         │
│  Today                                                  │
│  ┌────────────────────────────────────────────────┐    │
│  │ ✅  Write intro section of my essay  · 9:15am  │    │
│  │     "Got it done. Needed an extra 5 mins."     │    │
│  ├────────────────────────────────────────────────┤    │
│  │ ❌  Review PR #142                 · 11:00am  │    │
│  │     "Got distracted by the bug in auth."      │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  Yesterday                                              │
│  ┌────────────────────────────────────────────────┐    │
│  │ ✅  Fix the login redirect bug     · 2:30pm   │    │
│  │     —                                          │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Stats strip (top):**
- Total intentions (all-time)
- Completed count
- Completion rate (%)
- Current streak (days with ≥1 completed reflection)

**Trend chart:**
- 30-day bar chart (reuse Recharts, consistent with existing `Dashboard.tsx` pattern)
- Each bar = one day, color-coded: green portion = completed, red = not completed, gray = skipped
- Hoverable tooltip showing date + count + rate

**Journal list:**
- Grouped by date (descending — today first)
- Each entry shows:
  - Status icon (✅ / ❌ / ↩️ skipped / ⏳ pending)
  - Intention text (truncated at 100 chars, expandable)
  - Time of day (from `startedAt`)
  - Note (if present, shown in a muted style below the intention text)
- Filter bar: All / Completed / Not Completed / Skipped
- Date range picker (default: last 30 days; option for all-time)
- Pagination: 20 items per page with "Load more" button

**Empty state:** If no intentions yet, show a friendly illustration + "Start your first Pomodoro with an intention to see your journal" call to action.

**Loading/error states:** Standard skeleton loaders, consistent with Dashboard pattern.

### 6.4 Settings Toggle

**Location:** Existing `Settings.tsx` modal (the timer settings panel), in a new "Behavior" or "Features" section.

```
─── Intentions ───────────────────────────────────────

  Set a goal before each Pomodoro            ● ON
  and reflect when it ends.

  Turning this off hides all intention
  prompts and controls.
```

- Toggle is a simple boolean switch.
- Change is persisted immediately via `PATCH /api/settings` (existing endpoint, now extended).
- The toggle is only shown to authenticated users (since the feature requires auth to persist data). Guest users don't see it at all.
- State is fetched on Settings open from `GET /api/settings` and stored in local component state during the settings session.

---

## 7. Interaction with Skipped / Reset Pomodoros

| Timer Action | Intention in progress? | What happens |
|---|---|---|
| Natural completion (work phase ends) | Yes | `pendingReflection = true`; reflection modal shown |
| Natural completion (work phase ends) | No | `pendingReflection = true`; modal NOT shown (no intention to reflect on) |
| Manual skip (`skip()` action) | Yes | `PATCH /api/intentions/[id]/skip` called; intention marked `skipped`; no reflection modal |
| Manual skip (`skip()` action) | No | Nothing |
| Manual reset (`reset()` action) | Yes | `PATCH /api/intentions/[id]/skip` called; intention marked `skipped` |
| Manual reset (`reset()` action) | No | Nothing |
| Tab closed mid-session, re-opened (`hydratedAsExpired`) | Yes | This is a "natural completion" from the user's perspective — `pendingReflection` should be `true`. However, since the app may have been closed for a long time, the reflection modal shows but adds context: *"Your Pomodoro completed while you were away."* |
| Tab closed mid-session, re-opened (`hydratedAsExpired`) | No | `pendingReflection` triggers as usual, modal not shown |

**Key rule:** The reflection modal only appears for **natural completions of work-phase sessions**. Skip and reset always produce a `skipped` intention status.

---

## 8. Room Mode Considerations

- Intentions are **entirely personal** — not stored on the room object, not visible to other participants.
- The room timer controls in `RoomView.tsx` gain the same pre-session intention input that `CompactTimer.tsx` has.
- The `RoomView.tsx` component already detects phase completion via `timeRemaining <= 3 && phase changed` — this same detection should trigger `pendingReflection = true` and the reflection modal, just as in solo mode.
- When the host skips/resets the timer in a room, all participants' timers advance. For participants (non-host) who had an active intention, the skip event needs to be detected from the polling response and trigger the `skip` API call. This is analogous to how all participants currently receive phase transition notifications.
  - Specifically: when `RoomView.tsx` detects a `phase change` driven by a `skip`/`reset` action (distinguishable from natural completion via `timeRemaining > 3` at transition time, or a new `lastTransitionType` field in the room response), fire the intention skip API call.

---

## 9. Guest / Unauthenticated Users

- If a user is not signed in, the intention input field is hidden entirely (no API exists to save it).
- The settings toggle is also hidden.
- This is consistent with how analytics recording is gated on authentication today.

---

## 10. Reconciliation of Stale Pending Intentions

A small number of intentions may get stuck in `pending` status (e.g., user dismissed the reflection modal and never came back, or closed the tab right as the modal appeared). These are reconciled at two points:

1. **On journal load (`GET /api/intentions`):** The API query filters out intentions where `status = 'pending'` AND `started_at + 4 hours < now` and returns them as `skipped` in the response (without actually updating the DB on every load — a background job or a lazy update on the next API mutation is fine).

2. **On next session start:** When `CompactTimer.tsx` mounts or `start()` is called, check if `lastCompletedIntentionId` in the store still has a `pendingReflection = true`. If so, show the reflection modal for the previous session before allowing a new intention to be set. This prevents "losing" a reflection.

---

## 11. Component Breakdown

### New Components

| Component | Location | Responsibility |
|---|---|---|
| `IntentionInput.tsx` | `src/components/` | The pre-session text input + character counter. Receives `value`, `onChange`, `disabled` (when timer is running) props. |
| `IntentionReflectionModal.tsx` | `src/components/` | Post-session reflection modal. Receives `intentionText`, `intentionId`, `sessionId`, `onSubmit`, `onDismiss` props. |
| `IntentionsJournal.tsx` | `src/components/` | Full journal page component (data fetching + trends chart + list). |
| `IntentionTrendsChart.tsx` | `src/components/` | 30-day bar chart using Recharts. Reuses chart styling from `Dashboard.tsx`. |

### Modified Components

| Component | Changes |
|---|---|
| `CompactTimer.tsx` | Add `IntentionInput` below controls (shown in idle/paused work phase). Track `intentionId` in local state. Call intention API on start/skip/reset. Render `IntentionReflectionModal` when `pendingReflection && intentionId` is set. |
| `RoomView.tsx` | Same as `CompactTimer.tsx` for intention input and reflection modal. Detect skip events from room polling to fire intention skip API. |
| `Settings.tsx` | Add intentions toggle in a new "Features" section. Extend settings fetch/save to include `intentionsEnabled`. |
| `Navbar.tsx` | Add "Journal" link in the authenticated navigation. |

### New Pages

| Page | Location | Renders |
|---|---|---|
| Intentions Journal | `src/app/intentions/page.tsx` | `IntentionsJournal` component, protected (redirect to sign-in if unauthenticated) |

---

## 12. API Implementation Notes

### Database (src/lib/db/schema.ts)

Add `intentions` table using Drizzle ORM's `sqliteTable`:

```typescript
export const intentions = sqliteTable("intentions", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId:   text("session_id"),              // nullable
  text:        text("text").notNull(),
  status:      text("status").notNull().default("pending"),
  note:        text("note"),
  startedAt:   text("started_at").notNull(),
  reflectedAt: text("reflected_at"),
  date:        text("date").notNull(),
  createdAt:   text("created_at").notNull().default(sql`(datetime('now'))`),
});
```

Add migration. Update `src/lib/db/index.ts` to export the new table.

### Analytics module (`src/lib/analytics.ts`)

Add `getIntentionTrends(userId: string): Promise<IntentionTrends>` function alongside existing analytics functions. This is responsible for streak calculation and 30-day aggregation.

Streak calculation (pseudo-code):

```typescript
// Walk backwards from today
let currentStreak = 0;
let longestStreak = 0;
let runStreak = 0;
const today = new Date().toISOString().slice(0, 10);

for (let i = 0; i < allDatesWithData.length; i++) {
  const date = allDatesWithData[i];
  const dayHasReflection = dailyStats[date]?.completed > 0 || dailyStats[date]?.notCompleted > 0;

  if (dayHasReflection) {
    runStreak++;
    longestStreak = Math.max(longestStreak, runStreak);
    if (date === today || date === yesterday) {
      // Still in the current streak
    }
  } else {
    if (i === 0 && date === today) {
      // Today has no data yet — don't break streak
    } else {
      if (i < consecutiveDaysFromToday) currentStreak = runStreak; // only set current once
      runStreak = 0;
    }
  }
}
```

---

## 13. Migration Plan

1. **Database migration:** Add `intentions` table + `intentions_enabled` column to `user_settings`.
2. **Types:** Add new types to `src/lib/types.ts`.
3. **API routes:** Create `src/app/api/intentions/route.ts` and `src/app/api/intentions/[intentionId]/route.ts` and `src/app/api/intentions/[intentionId]/skip/route.ts` and `src/app/api/intentions/trends/route.ts`.
4. **Settings API:** Extend `GET /api/settings` and `PATCH /api/settings` for `intentionsEnabled`.
5. **Analytics lib:** Add `getIntentionTrends()` function.
6. **Timer store:** Add `currentIntention`, `pendingReflection`, `lastCompletedIntentionId`, `lastCompletedSessionId` fields and actions.
7. **New components:** `IntentionInput`, `IntentionReflectionModal`, `IntentionsJournal`, `IntentionTrendsChart`.
8. **Modify components:** `CompactTimer`, `RoomView`, `Settings`, `Navbar`.
9. **New page:** `src/app/intentions/page.tsx`.

**Dependency order for implementation:**
- Backend first: DB migration → types → API routes → analytics lib
- Frontend second: Timer store → components → page

---

## 14. Open Questions

| # | Question | Recommendation |
|---|----------|---------------|
| OQ1 | Should intentions be shared in a room (visible to all participants) as an optional "accountability" feature? | Out of scope for v1. Could be a future social feature. |
| OQ2 | Should `intentionsEnabled` default to ON or OFF for new users? | **ON** — the feature is the point of the product, opt-out is for power users. |
| OQ3 | Should the Intentions Journal replace the Analytics dashboard or live alongside it? | **Alongside** — they serve different purposes (qualitative vs quantitative). |
| OQ4 | Should we link to the journal from the reflection modal after submission? | Nice-to-have: add a subtle "View your journal →" link in the success toast. |
| OQ5 | What happens to intentions if the user deletes their account? | Cascade delete via FK — already handled by `ON DELETE CASCADE`. |
| OQ6 | Should the reflection modal appear for break phases too (e.g., "Did you rest?")? | No — breaks are passive, intentions are about work. |
| OQ7 | Should users be able to edit a past intention's text after the fact? | No — the immutability is intentional; the note field is the place for corrections. |

---

## 15. Acceptance Criteria

### AC1 — Intention Input
- [ ] `IntentionInput` is visible below timer controls when phase is `work` and status is `idle` or `paused`
- [ ] Input is hidden when `intentionsEnabled = false` in settings
- [ ] Input is hidden for unauthenticated users
- [ ] Input disappears and active intention text appears when timer is `running`
- [ ] Starting without text does not create an intention record
- [ ] Starting with text creates a `pending` intention via `POST /api/intentions`

### AC2 — Reflection Modal
- [ ] Modal appears after natural work-phase completion when an intention was set
- [ ] Modal does NOT appear after skip or reset
- [ ] Modal does NOT appear after natural completion if no intention was set
- [ ] User can mark Completed or Not Completed
- [ ] User can add an optional note (max 500 chars)
- [ ] Submitting calls `PATCH /api/intentions/[id]` and shows success toast
- [ ] "Skip reflection" dismisses without API call
- [ ] The break timer runs normally while the modal is open

### AC3 — Skip/Reset Handling
- [ ] Skipping calls `POST /api/intentions/[id]/skip`
- [ ] Resetting calls `POST /api/intentions/[id]/skip`
- [ ] Intention input is cleared after skip/reset

### AC4 — Intentions Journal
- [ ] Accessible from `/intentions` route and nav link
- [ ] Requires authentication (redirects to sign-in if not)
- [ ] Shows total, completed count, completion rate, current streak in header
- [ ] Shows 30-day bar chart
- [ ] Lists intentions grouped by date, newest first
- [ ] Each entry shows: text, status icon, time, note (if present)
- [ ] Filter by status works correctly
- [ ] Pagination (20 per page) works

### AC5 — Settings Toggle
- [ ] Settings modal shows intentions toggle for authenticated users
- [ ] Toggling OFF hides intention input and prevents reflection modal
- [ ] Toggle state persists via `PATCH /api/settings`
- [ ] Toggle state is read from `GET /api/settings` on settings open

### AC6 — Room Mode
- [ ] Intention input appears in room view for work phases
- [ ] Reflection modal appears after room timer naturally completes a work phase
- [ ] When host skips timer, participants with active intentions have them marked `skipped`
- [ ] Intentions from room sessions appear in the user's personal journal

---

*End of spec.*
