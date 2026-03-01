# Trophy Case — Achievements System Spec

**Feature:** Trophy Case — Achievements & Milestones
**Author:** PM Agent
**Date:** 2026-03-01
**Status:** Draft
**Target Engineers:** backend-engineer, frontend-engineer

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Design Philosophy](#2-design-philosophy)
3. [Achievement Catalogue](#3-achievement-catalogue)
4. [Data Model](#4-data-model)
5. [Achievement Checking Logic](#5-achievement-checking-logic)
6. [API Contracts](#6-api-contracts)
7. [UX Integration](#7-ux-integration)
8. [Edge Cases](#8-edge-cases)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Implementation Order](#10-implementation-order)

---

## 1. Current State Analysis

### 1.1 What Is Already Tracked (Durable, DB-Persisted)

The `pomodoro_sessions` table (LibSQL via Drizzle ORM) is the richest source of achievement signal. Every completed or abandoned work/break session is recorded with:

| Field | Type | Achievement Signal |
|---|---|---|
| `id` | UUID | — |
| `user_id` | FK → users | Per-user aggregation |
| `phase` | `work \| shortBreak \| longBreak` | Filter to work-only for milestones |
| `started_at` | ISO 8601 timestamp | Time-of-day easter eggs, streak computation |
| `ended_at` | ISO 8601 timestamp | Session duration, night-owl/early-bird |
| `planned_duration` | integer (seconds) | Detect non-default timer settings |
| `actual_duration` | integer (seconds) | Marathon detection via session chaining |
| `completed` | boolean | Only count `completed = true` for achievements |
| `completion_percentage` | 0–100 | Filter out abandoned sessions |
| `date` | YYYY-MM-DD | Day-level streak calculations |

**What can be derived from `pomodoro_sessions` alone:**
- Total completed pomodoros (all-time, per day, per week)
- Day-level activity calendar → streak computation
- First-ever session date → "first day" detection for Hat Trick
- Time-of-day patterns → Early Bird, Night Owl, Creature of Habit
- Non-default `planned_duration` values → Custom Craftsman
- Inactivity gaps → Back From the Dead
- January 1st sessions → Fresh Start
- Per-day pomodoro counts → Flow State, The Grind, Weekend Warrior, Perfect Week
- All-time total → The Answer (42), milestone counts

**What can be derived from `friendships`:**
- Total confirmed friend count → Social Spark, Building Your Circle, The Connector
- `created_at` on friendships → first friendship date

**What can be derived from `users`:**
- `created_at` → Pomversary calculation
- `email_verified` → gate all achievements behind this flag

**What can be derived from `user_settings`:**
- `broadcast_enabled` flag → Stealth Mode tracking (needs augmentation, see §4)

### 1.2 What Needs New Tracking Infrastructure

The room system is entirely in-memory (`Map<roomId, Room>` in `src/lib/rooms.ts`) and ephemeral (2-hour cleanup, lost on server restart). Room-based achievements require new lightweight persistence:

| Event | Current State | What's Needed |
|---|---|---|
| Room created by user | Not persisted | `rooms_hosted_count` counter in DB |
| User joins a room | Not persisted | `rooms_joined_count` counter in DB |
| Participant count at time of session completion | Not persisted | Pass participant count from room context when recording session |
| Session completed while in a room | Not linked | New `room_id` + `participant_count` columns on session or a `room_sessions` log |
| Same friend co-present across days | Not tracked | New `room_co_sessions` table or derived from session + room participant log |

The simplest approach: add **two nullable columns** to `pomodoro_sessions` — `room_id TEXT` and `room_participant_count INTEGER` — and a **new `user_stats` table** that holds running counters (rooms hosted, rooms joined). Session recording already happens server-side via `POST /api/analytics`, which has full context from the session submitter.

For **Study Buddy** (same friend, 5 different days): a lightweight `room_co_sessions` junction table records `(session_id, co_user_id)` pairs, populated when the server knows who else was in the room at session completion time.

### 1.3 What Cannot Be Retroactively Awarded

Because rooms are ephemeral with no audit log, the following achievements **cannot** be retroactively unlocked for existing users:

- Open Door (first room created)
- Gracious Host / Grand Host (rooms hosted count)
- Joining In (first room join with a friend)
- Better Together / Squad Goals (participant count at session time)
- Pack Leader / Full House (max participants as host)
- Study Buddy (co-session with same friend across days)

All other achievements can be retroactively computed from existing `pomodoro_sessions` and `friendships` data during the backfill migration described in §8.

### 1.4 Email Verification Gate

Pomodoro sessions are only saved to the DB for `emailVerified = true` users (existing behavior). Accordingly, **all achievements require email verification**. Unverified users who visit `/achievements` see a prompt to verify their email rather than a locked achievement grid.

---

## 2. Design Philosophy

### The Core Tension

Achievements can energize or cheapen. The difference is whether they feel like *recognition* of something real or *rewards* manufactured to drive engagement metrics.

PomoPals is a focus tool. Its users are trying to do hard work. Achievement design must serve that goal, not compete with it. Every achievement in this system should make a user think "yes, I actually did that" — not "I did that to get the badge."

### Guiding Principles

**1. Celebrate genuine milestones, not arbitrary ones.**
"Complete 100 pomodoros" celebrates real accumulated focus time (~41 hours). "Share PomoPals on Twitter" would be manufactured. When in doubt, only track things users would naturally tell a friend about.

**2. Reveal depth, don't manufacture dependency.**
Achievements should illuminate features users may not have discovered (rooms, broadcast presence, custom timers) — not create artificial requirements to use them.

**3. Progressive disclosure.**
Locked achievements show enough to intrigue without spoiling. Secret/easter-egg achievements are fully opaque until unlocked. Partially-complete achievements show progress bars that make completion feel inevitable.

**4. Never interrupt focus.**
Toast notifications appear *after* a session completes — never mid-session. The Trophy Case page is a destination, not a push mechanism.

**5. Scarcity creates meaning.**
Platinum achievements should feel genuinely rare. If 60% of active users have a Platinum, it's Silver. Calibrate against realistic usage data.

---

## 3. Achievement Catalogue

38 achievements across 4 categories. Tiers: 🥉 Bronze · 🥈 Silver · 🥇 Gold · 💎 Platinum.

Achievements marked **[SECRET]** are not shown by name or description until unlocked.

---

### 3.1 Solo Pomodoro Milestones

*Celebrating individual focus work — the core loop of PomoPals.*

---

**1. First Step**
🍅 · **Bronze**

> Complete your very first work session.

- **Unlock condition:** `completed = true` pomodoro sessions for this user count ≥ 1
- **Progress type:** Binary (no progress bar; just triggers once)
- **Toast copy:** *"Your first pomodoro is in the books. The journey of a thousand sessions begins here."*
- **Notes:** The most important achievement. Everyone gets this. Sets a welcoming tone.

---

**2. Finding Your Rhythm**
🎵 · **Bronze**

> Complete 10 pomodoros.

- **Unlock condition:** Total completed work sessions ≥ 10
- **Progress type:** Count (0 → 10)
- **Toast copy:** *"Ten sessions down. You're starting to find your groove."*

---

**3. Centurion**
💯 · **Silver**

> Complete 100 pomodoros.

- **Unlock condition:** Total completed work sessions ≥ 100
- **Progress type:** Count (0 → 100)
- **Toast copy:** *"100 sessions. That's over 40 hours of focused work. Centurion status earned."*

---

**4. Pomodoro Pro**
⭐ · **Gold**

> Complete 500 pomodoros.

- **Unlock condition:** Total completed work sessions ≥ 500
- **Progress type:** Count (0 → 500)
- **Toast copy:** *"500 sessions. Most people never get here. You're not most people."*

---

**5. The Legend**
👑 · **Platinum**

> Complete 1,000 pomodoros.

- **Unlock condition:** Total completed work sessions ≥ 1,000
- **Progress type:** Count (0 → 1,000)
- **Toast copy:** *"1,000 sessions. That's roughly 417 hours of focused work. Legendary."*
- **Notes:** Expected to be held by <5% of active users. Rare by design.

---

**6. Hat Trick**
🎩 · **Bronze**

> Complete 3 pomodoros on your very first day using PomoPals.

- **Unlock condition:** User has ≥ 3 completed work sessions on the same calendar day as their first-ever completed session (i.e., `date` of sessions matches `date(users.created_at)`)
- **Progress type:** Binary
- **Toast copy:** *"Three on day one. You came ready."*
- **Notes:** Cannot be retroactively awarded. Must be earned on the day of account creation. Rewards users who dive in immediately — a strong signal of engagement.

---

**7. Long Haul**
🏃 · **Bronze**

> Complete 4 consecutive pomodoros in one sitting without resetting the timer.

- **Unlock condition:** A `pomodoro_count` value of ≥ 4 is reached in a single timer session. The timer store tracks `pomodoroCount` which resets only on `reset()`. This value should be included in the session payload posted to the server when the 4th work session of that run completes. The payload must include a `session_run_id` (see §4.1) so the server can identify which sessions belong to the same sitting.
- **Progress type:** Binary
- **Toast copy:** *"Four in a row. That's a two-hour focus block. You were locked in."*

---

**8. Marathon Runner**
🏅 · **Silver**

> Complete 8 consecutive pomodoros in one sitting.

- **Unlock condition:** `pomodoro_count` ≥ 8 within a single `session_run_id`
- **Progress type:** Count (0 → 8, shown as "X/8 consecutive sessions")
- **Toast copy:** *"Eight pomodoros back-to-back. That's a marathon session. Hope you stood up at some point."*

---

**9. Ultramarathon**
🦅 · **Gold**

> Complete 12 consecutive pomodoros in one sitting — a full 6-hour focus block.

- **Unlock condition:** `pomodoro_count` ≥ 12 within a single `session_run_id`
- **Progress type:** Count (0 → 12)
- **Toast copy:** *"Twelve. Six hours. We're a little concerned about you, but also very impressed."*
- **Notes:** Intentionally rare. Shows on the Trophy Case page as one of the most prestigious solo achievements.

---

**10. Flow State**
🌊 · **Silver**

> Complete 8 work sessions in a single calendar day.

- **Unlock condition:** Count of completed work sessions with the same `date` value ≥ 8
- **Progress type:** Count (resets daily; shown as "X today" in progress)
- **Toast copy:** *"Eight sessions in a day. You found the zone. Don't lose it."*
- **Notes:** Different from Marathon Runner — this counts sessions across multiple sits throughout a day, not necessarily consecutive.

---

**11. The Grind**
⚙️ · **Gold**

> Complete 12 work sessions in a single calendar day.

- **Unlock condition:** Count of completed work sessions with the same `date` value ≥ 12
- **Progress type:** Count (resets daily)
- **Toast copy:** *"Twelve sessions in a day. Whatever you're working on, we hope it was worth it."*

---

**12. Custom Craftsman**
🔧 · **Bronze**

> Complete a pomodoro with non-default timer settings.

- **Unlock condition:** A completed work session where `planned_duration ≠ 1500` seconds (i.e., not the default 25 minutes). Any custom duration (shorter OR longer) qualifies.
- **Progress type:** Binary
- **Toast copy:** *"You found the settings menu. PomoPals works your way now."*
- **Notes:** Subtly surfaces timer customization to users who haven't explored it.

---

### 3.2 Social & Friends Achievements

*Celebrating the collaborative layer — rooms, friends, and shared focus.*

---

**13. Social Spark**
✨ · **Bronze**

> Add your first friend.

- **Unlock condition:** User's confirmed friendship count in `friendships` table ≥ 1
- **Progress type:** Binary
- **Toast copy:** *"Your first PomoPals friend. Focus is better together."*

---

**14. Building Your Circle**
👥 · **Bronze**

> Have 5 confirmed friends.

- **Unlock condition:** Confirmed friendship count ≥ 5
- **Progress type:** Count (0 → 5)
- **Toast copy:** *"Five friends. Your focus crew is taking shape."*

---

**15. The Connector**
🌐 · **Silver**

> Have 25 confirmed friends.

- **Unlock condition:** Confirmed friendship count ≥ 25
- **Progress type:** Count (0 → 25)
- **Toast copy:** *"25 friends. You're building a real community around focus. That matters."*

---

**16. Open Door**
🚪 · **Bronze**

> Create your first room.

- **Unlock condition:** User's `rooms_hosted_total` counter in `user_stats` ≥ 1 (incremented on `POST /api/rooms`)
- **Progress type:** Binary
- **Toast copy:** *"Your first room is open. Invite someone — focus is contagious."*

---

**17. Gracious Host**
🏠 · **Silver**

> Host 10 rooms.

- **Unlock condition:** `rooms_hosted_total` ≥ 10
- **Progress type:** Count (0 → 10)
- **Toast copy:** *"Ten rooms hosted. You keep showing up for others. That's what makes a good host."*

---

**18. Grand Host**
🏛️ · **Gold**

> Host 50 rooms.

- **Unlock condition:** `rooms_hosted_total` ≥ 50
- **Progress type:** Count (0 → 50)
- **Toast copy:** *"50 rooms. You've created thousands of minutes of shared focus. Grand."*

---

**19. Joining In**
🤝 · **Bronze**

> Join a room created by one of your friends for the first time.

- **Unlock condition:** User completes a `join` action on a room where `room.hostId` is in the user's confirmed friends list. Detected server-side in `POST /api/rooms/[roomId]` with `action: "join"`. The flag `has_joined_friends_room` on `user_stats` is set to `true` on first occurrence.
- **Progress type:** Binary
- **Toast copy:** *"You joined a friend's room. Now you're really doing this together."*

---

**20. Better Together**
💪 · **Bronze**

> Complete a work session in a room with at least 3 participants total (you + 2 others).

- **Unlock condition:** Completed work session where `room_participant_count ≥ 3` (new column on `pomodoro_sessions`, populated at session-completion time from the live room state)
- **Progress type:** Binary
- **Toast copy:** *"Three people, one goal. Better together is right."*

---

**21. Squad Goals**
🎯 · **Silver**

> Complete a work session in a room with 5 or more participants.

- **Unlock condition:** Completed work session where `room_participant_count ≥ 5`
- **Progress type:** Binary
- **Toast copy:** *"A five-person focus session. That's a squad."*

---

**22. Pack Leader**
🐺 · **Gold**

> Host a room that reaches 10 or more simultaneous participants.

- **Unlock condition:** User is the host of a room when `room.participants.length ≥ 10` at any point. Detected in `POST /api/rooms/[roomId]` join handler; sets `max_room_size_hosted` on `user_stats`. Unlocks when that value ≥ 10.
- **Progress type:** Count (0 → 10, tracking peak participants in a single hosted room)
- **Toast copy:** *"Ten people followed your lead. That's a pack."*

---

**23. Full House**
🎪 · **Platinum**

> Fill a room you're hosting to its 20-person capacity.

- **Unlock condition:** `max_room_size_hosted ≥ 20` — every slot taken
- **Progress type:** Count (0 → 20)
- **Toast copy:** *"Maximum capacity. Twenty people, one room, one focus session. Full house."*
- **Notes:** This is the hardest social achievement. Expected to be very rare. The 20-person cap is a hard limit in `src/lib/rooms.ts`.

---

### 3.3 Consistency Achievements

*Celebrating the habits that make focused work stick.*

---

**24. Habit Forming**
🔥 · **Bronze**

> Focus on 3 consecutive calendar days.

- **Unlock condition:** At least 1 completed work session on each of 3 consecutive dates in `pomodoro_sessions` (day boundary = UTC, see §8.3 for timezone nuance)
- **Progress type:** Count (current streak; 0 → 3)
- **Toast copy:** *"Three days in a row. A habit is starting to form."*

---

**25. Week in the Zone**
📅 · **Silver**

> Focus every day for 7 consecutive calendar days.

- **Unlock condition:** 7-day streak (≥ 1 completed work session per day for 7 consecutive UTC dates)
- **Progress type:** Count (current streak; 0 → 7)
- **Toast copy:** *"Seven days straight. You've completed your first week. That's no accident."*

---

**26. Unbreakable**
💎 · **Gold**

> Maintain a 30-day streak.

- **Unlock condition:** 30-day streak
- **Progress type:** Count (current streak; 0 → 30)
- **Toast copy:** *"Thirty days without missing one. You built something real."*

---

**27. Centurion Streak**
🌟 · **Platinum**

> Maintain a 100-day streak.

- **Unlock condition:** 100-day streak
- **Progress type:** Count (current streak; 0 → 100)
- **Toast copy:** *"One hundred days. Whatever you're working on, you're going to finish it."*
- **Notes:** ~100 days represents roughly a quarter of a year of daily focus. Expected to be held by <2% of active users. The single most prestigious consistency achievement.

---

**28. Creature of Habit**
⏰ · **Silver**

> Complete sessions in the same 2-hour window for 10 different days.

- **Unlock condition:** The user has ≥ 10 distinct calendar days where at least one completed work session has a `started_at` time falling within their personal "peak hour" window. The peak window is computed as the 2-hour block (e.g., 09:00–11:00) in which the user has the highest density of session starts across all time. The window is recomputed whenever the check runs.
- **Progress type:** Count (0 → 10 matching days)
- **Toast copy:** *"Same time, ten different days. Your brain knows when it's time to work."*
- **Notes:** Does not require the 10 days to be consecutive. Rewards time-of-day regularity regardless of streaks.

---

**29. Weekend Warrior**
⚔️ · **Bronze**

> Complete 5 pomodoros on a single Saturday or Sunday.

- **Unlock condition:** Count of completed work sessions on any single date where `day_of_week(date) IN (Saturday, Sunday)` ≥ 5
- **Progress type:** Count (best single weekend day, 0 → 5)
- **Toast copy:** *"Five sessions on a weekend. Your future self thanks you."*

---

**30. Perfect Week**
✅ · **Gold**

> Complete at least 4 pomodoros every day for 7 consecutive days (28 total minimum).

- **Unlock condition:** 7 consecutive dates each with ≥ 4 completed work sessions
- **Progress type:** Binary (tracked per rolling 7-day window; display current week progress as "X/7 days with 4+ sessions")
- **Toast copy:** *"Four or more, every single day, for seven days. That's not a week — that's a statement."*
- **Notes:** Strictly harder than "Week in the Zone" (which requires only 1/day). These stack independently; a user can have both.

---

**31. Study Buddy**
📚 · **Silver**

> Complete a pomodoro in a room with the same friend on 5 different calendar days.

- **Unlock condition:** The `room_co_sessions` table contains ≥ 5 distinct `date` values where both `(session_user_id = self)` and `(co_user_id = X)` for any single friend X
- **Progress type:** Count (per-friend best; shows "X/5 days with [best friend name]")
- **Toast copy:** *"Five days focusing alongside the same friend. You two make a good team."*
- **Notes:** This requires the `room_co_sessions` infrastructure described in §4. Cannot be retroactively awarded. The friend's name in the toast is a nice personal touch.

---

### 3.4 Easter Egg Achievements

*Surprising, delightful moments that reward curiosity and persistence. All are [SECRET] — shown as "???" until unlocked.*

---

**32. The Answer**
🔢 · **Bronze** · **[SECRET]**

> Accumulate exactly 42 total completed pomodoros. (Yes, exactly 42.)

- **Unlock condition:** Total completed work sessions count transitions through 42. Checked after each session recorded. Unlocks if the count was 41 before this session and is now 42 (or if the count is currently exactly 42 at backfill time).
- **Progress type:** Binary (no progress bar — discovering this is the reward)
- **Toast copy:** *"42 pomodoros. The answer to life, the universe, and everything. Also: great work."*
- **Notes:** Only one person in history needed 42 to mean something. Now it does for you too. The secrecy is important — showing "42/42 progress" would ruin it.

---

**33. Early Bird**
🌅 · **Bronze** · **[SECRET]**

> Complete a work session that starts before 7:00 AM in the user's local timezone.

- **Unlock condition:** A completed work session where `hour(started_at, user_timezone) < 7`. Session payload should include the user's timezone (from browser `Intl.DateTimeFormat().resolvedOptions().timeZone`) so the server can evaluate local time.
- **Progress type:** Binary
- **Toast copy:** *"Before 7am. The early hours are yours. Not many people can say that."*

---

**34. Night Owl**
🦉 · **Bronze** · **[SECRET]**

> Complete a work session that ends after 11:00 PM in the user's local timezone.

- **Unlock condition:** Completed work session where `hour(ended_at, user_timezone) >= 23`
- **Progress type:** Binary
- **Toast copy:** *"Past 11pm. The quiet hours are real. Night owls know."*

---

**35. Fresh Start**
🎆 · **Bronze** · **[SECRET]**

> Complete a pomodoro on January 1st.

- **Unlock condition:** Completed work session where `month(date) = 1 AND day(date) = 1` (UTC date). Because PomoPals is global and January 1st moves timezone-by-timezone, UTC date is used as a consistent reference.
- **Progress type:** Binary
- **Toast copy:** *"You started the year with intention. That means something."*
- **Notes:** Repeatable across years but only awarded once (first January 1st occurrence). Unlike most achievements, this cannot be predicted in advance — it rewards users who happen to use PomoPals at the right moment.

---

**36. Pomversary**
🎂 · **Gold** · **[SECRET]**

> Complete a pomodoro within 7 days of your 1-year account anniversary.

- **Unlock condition:** A completed work session where `ABS(days_since(users.created_at) - 365) ≤ 7`. Checked for any session in the 7-day window centered on the anniversary (days 362–368 after account creation). Also checked at login within this window.
- **Progress type:** Binary
- **Toast copy:** *"One year with PomoPals. Whatever you've been building — you've been building it for a year now."*
- **Notes:** Gold tier (not Bronze) because reaching this requires genuine long-term engagement. The 7-day window accounts for users who may miss the exact anniversary date.

---

**37. Stealth Mode**
🥷 · **Bronze** · **[SECRET]**

> Complete 10 pomodoros while broadcast mode is disabled.

- **Unlock condition:** Requires a new `stealth_sessions_count` column on `user_stats`, incremented whenever a session is recorded AND the user's `broadcast_enabled` flag is `false`. Unlocks at `stealth_sessions_count ≥ 10`.
- **Progress type:** Count (no visible progress — it's a secret)
- **Toast copy:** *"10 sessions in stealth mode. You were focused in the shadows. We saw you anyway."*
- **Notes:** Rewards users who explore the privacy settings. The irony in the toast copy — "we saw you anyway" — is intentional and fits the emoji.

---

**38. Back From the Dead**
💀 · **Silver** · **[SECRET]**

> Return to PomoPals after 30+ days away and complete a pomodoro.

- **Unlock condition:** Completed work session where the previous completed session for this user has `ended_at` more than 30 days ago. Computed as `days_since(MAX(ended_at) of prior sessions) ≥ 30` at the time of recording the new session.
- **Progress type:** Binary
- **Toast copy:** *"Thirty days away. But here you are. Welcome back — the timer was waiting."*
- **Notes:** Silver tier because returning after a long absence is genuinely meaningful. The toast should feel warm, not judgmental. This is the one achievement that rewards failure-and-recovery rather than sustained success.

---

### 3.5 Achievement Summary Table

| # | Name | Emoji | Tier | Category | Secret |
|---|------|-------|------|----------|--------|
| 1 | First Step | 🍅 | 🥉 Bronze | Solo | No |
| 2 | Finding Your Rhythm | 🎵 | 🥉 Bronze | Solo | No |
| 3 | Centurion | 💯 | 🥈 Silver | Solo | No |
| 4 | Pomodoro Pro | ⭐ | 🥇 Gold | Solo | No |
| 5 | The Legend | 👑 | 💎 Platinum | Solo | No |
| 6 | Hat Trick | 🎩 | 🥉 Bronze | Solo | No |
| 7 | Long Haul | 🏃 | 🥉 Bronze | Solo | No |
| 8 | Marathon Runner | 🏅 | 🥈 Silver | Solo | No |
| 9 | Ultramarathon | 🦅 | 🥇 Gold | Solo | No |
| 10 | Flow State | 🌊 | 🥈 Silver | Solo | No |
| 11 | The Grind | ⚙️ | 🥇 Gold | Solo | No |
| 12 | Custom Craftsman | 🔧 | 🥉 Bronze | Solo | No |
| 13 | Social Spark | ✨ | 🥉 Bronze | Social | No |
| 14 | Building Your Circle | 👥 | 🥉 Bronze | Social | No |
| 15 | The Connector | 🌐 | 🥈 Silver | Social | No |
| 16 | Open Door | 🚪 | 🥉 Bronze | Social | No |
| 17 | Gracious Host | 🏠 | 🥈 Silver | Social | No |
| 18 | Grand Host | 🏛️ | 🥇 Gold | Social | No |
| 19 | Joining In | 🤝 | 🥉 Bronze | Social | No |
| 20 | Better Together | 💪 | 🥉 Bronze | Social | No |
| 21 | Squad Goals | 🎯 | 🥈 Silver | Social | No |
| 22 | Pack Leader | 🐺 | 🥇 Gold | Social | No |
| 23 | Full House | 🎪 | 💎 Platinum | Social | No |
| 24 | Habit Forming | 🔥 | 🥉 Bronze | Consistency | No |
| 25 | Week in the Zone | 📅 | 🥈 Silver | Consistency | No |
| 26 | Unbreakable | 💎 | 🥇 Gold | Consistency | No |
| 27 | Centurion Streak | 🌟 | 💎 Platinum | Consistency | No |
| 28 | Creature of Habit | ⏰ | 🥈 Silver | Consistency | No |
| 29 | Weekend Warrior | ⚔️ | 🥉 Bronze | Consistency | No |
| 30 | Perfect Week | ✅ | 🥇 Gold | Consistency | No |
| 31 | Study Buddy | 📚 | 🥈 Silver | Consistency | No |
| 32 | The Answer | 🔢 | 🥉 Bronze | Easter Egg | **Yes** |
| 33 | Early Bird | 🌅 | 🥉 Bronze | Easter Egg | **Yes** |
| 34 | Night Owl | 🦉 | 🥉 Bronze | Easter Egg | **Yes** |
| 35 | Fresh Start | 🎆 | 🥉 Bronze | Easter Egg | **Yes** |
| 36 | Pomversary | 🎂 | 🥇 Gold | Easter Egg | **Yes** |
| 37 | Stealth Mode | 🥷 | 🥉 Bronze | Easter Egg | **Yes** |
| 38 | Back From the Dead | 💀 | 🥈 Silver | Easter Egg | **Yes** |

**Distribution:** 12 Solo · 11 Social · 8 Consistency · 7 Easter Egg
**By tier:** 16 Bronze · 10 Silver · 8 Gold · 4 Platinum

---

## 4. Data Model

### 4.1 New Database Tables

#### `user_achievements`

Stores the record of each unlocked achievement per user.

```sql
CREATE TABLE user_achievements (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  TEXT NOT NULL,          -- matches static definition id (e.g., 'first-step')
  unlocked_at     TEXT NOT NULL,          -- ISO 8601, set at unlock time
  notified_at     TEXT,                   -- NULL = not yet shown as toast; set when client acknowledges
  retroactive     INTEGER NOT NULL DEFAULT 0,  -- 1 if awarded via backfill migration
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unnotified ON user_achievements(user_id, notified_at)
  WHERE notified_at IS NULL;
```

**Notes:**
- Achievement definitions live in code (`src/lib/achievements.ts`), not in this table. The DB only stores the fact of unlocking.
- `notified_at` being nullable lets `GET /api/achievements/pending` efficiently find achievements that need toast display.
- `retroactive = 1` rows have pre-set `notified_at` (never trigger toasts) and display a label on the Trophy Case card.

---

#### `achievement_progress`

Stores per-user progress toward counted (non-binary) achievements. Updated any time a relevant event fires, even before the achievement unlocks.

```sql
CREATE TABLE achievement_progress (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  TEXT NOT NULL,
  current_value   INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL,          -- ISO 8601
  PRIMARY KEY (user_id, achievement_id)
);
```

**Notes:**
- Only achievements with `progressType: 'count'` get a row here.
- Binary achievements are checked on-the-fly; no progress record needed.
- For streak achievements, `current_value` holds the current streak length. The achievement checker recomputes streak from `pomodoro_sessions` each time rather than trusting this value alone — this row is primarily for fast UI display.

---

#### `user_stats`

A single-row-per-user table of running counters that are expensive to recompute from raw session data on every request.

```sql
CREATE TABLE user_stats (
  user_id                   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rooms_hosted_total        INTEGER NOT NULL DEFAULT 0,
  rooms_joined_total        INTEGER NOT NULL DEFAULT 0,
  max_room_size_hosted      INTEGER NOT NULL DEFAULT 0,
  stealth_sessions_count    INTEGER NOT NULL DEFAULT 0,
  has_joined_friends_room   INTEGER NOT NULL DEFAULT 0,  -- boolean: 0/1
  pinned_achievements       TEXT NOT NULL DEFAULT '[]',  -- JSON array, max 3 achievement IDs
  updated_at                TEXT NOT NULL
);
```

**Notes:**
- `rooms_hosted_total` is incremented by `POST /api/rooms` (create room).
- `rooms_joined_total` is incremented by `POST /api/rooms/[id]` with `action: "join"`.
- `max_room_size_hosted` is updated whenever a join happens in a room this user hosts, if the new participant count exceeds the stored max.
- `stealth_sessions_count` is incremented by `POST /api/analytics` when `user_settings.broadcast_enabled = false`.
- `has_joined_friends_room` is set to 1 the first time a join action occurs where `room.hostId` is in the user's confirmed friends list.
- `pinned_achievements` stores up to 3 achievement IDs as a JSON array (e.g., `["first-step", "centurion", "week-in-the-zone"]`).

---

#### `room_co_sessions`

Records which friend-users shared a room at the moment any session was completed. Powers the Study Buddy achievement.

```sql
CREATE TABLE room_co_sessions (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id      TEXT NOT NULL REFERENCES pomodoro_sessions(id) ON DELETE CASCADE,
  session_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  co_user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,   -- YYYY-MM-DD (UTC date of session)
  CHECK(session_user_id != co_user_id)
);

CREATE INDEX idx_room_co_sessions_user_date ON room_co_sessions(session_user_id, date);
CREATE INDEX idx_room_co_sessions_pair ON room_co_sessions(session_user_id, co_user_id, date);
```

**Populated by:** The `POST /api/analytics` endpoint, when the session payload includes a `room_id`. The server looks up the room's current participant list (from the in-memory rooms Map) and writes one row per *other* participant who is a confirmed friend of the session's user. Non-friend co-participants are excluded (Study Buddy is a friends-based achievement).

---

#### Schema additions to `pomodoro_sessions`

Four new nullable columns on the existing sessions table, added via migration:

```sql
ALTER TABLE pomodoro_sessions ADD COLUMN room_id TEXT;
ALTER TABLE pomodoro_sessions ADD COLUMN room_participant_count INTEGER;
ALTER TABLE pomodoro_sessions ADD COLUMN session_run_id TEXT;
ALTER TABLE pomodoro_sessions ADD COLUMN timezone TEXT;
```

- `room_id`: The room the user was in when the session was completed, if any.
- `room_participant_count`: Snapshot of participant count at session completion time. Used for Better Together (≥3), Squad Goals (≥5).
- `session_run_id`: UUID generated client-side when the timer starts fresh (reset on `reset()`). Groups consecutive sessions into "one sitting" for Long Haul / Marathon / Ultramarathon detection.
- `timezone`: User's IANA timezone string at session completion time (e.g., `America/New_York`). Used for Early Bird, Night Owl, and future local-day streak boundary calculations.

---

### 4.2 Static Achievement Definitions (Code)

Achievement metadata lives in `src/lib/achievements.ts`, not in the database. This keeps the authoritative definition co-located with the checking logic.

```typescript
// src/lib/achievements.ts

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type AchievementCategory = 'solo' | 'social' | 'consistency' | 'easter_egg';
export type ProgressType = 'binary' | 'count';

export interface AchievementDefinition {
  id: string;                      // kebab-case, stable identifier
  name: string;
  emoji: string;
  description: string;             // shown when unlocked or when not secret
  hint: string;                    // shown on locked card (vague clue, not a spoiler)
  category: AchievementCategory;
  tier: AchievementTier;
  isSecret: boolean;               // if true: name/desc hidden until unlocked
  progressType: ProgressType;
  progressTarget?: number;         // required when progressType = 'count'
  toastCopy: string;               // copy for the unlock toast notification
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-step',
    name: 'First Step',
    emoji: '🍅',
    description: 'Complete your very first pomodoro.',
    hint: 'Start a timer and see it through.',
    category: 'solo',
    tier: 'bronze',
    isSecret: false,
    progressType: 'binary',
    toastCopy: 'Your first pomodoro is in the books. The journey of a thousand sessions begins here.',
  },
  // ... all 38 definitions
];

export const ACHIEVEMENT_MAP = new Map(
  ACHIEVEMENTS.map((a) => [a.id, a])
);
```

---

## 5. Achievement Checking Logic

### 5.1 When Checks Run

Achievement checking is **always server-side** and triggered as a side effect of existing API calls. Never on a cron job or background worker — always in response to a real user action.

| User Action | API Call | Achievements Checked |
|---|---|---|
| Complete a session | `POST /api/analytics` | All solo milestones, consistency, easter eggs, room-based if `room_id` present |
| Accept a friend request | `PATCH /api/friends/requests/[id]` | Social Spark, Building Your Circle, The Connector |
| Create a room | `POST /api/rooms` | Open Door, Gracious Host, Grand Host |
| Join a room | `POST /api/rooms/[id] {action:"join"}` | Joining In; updates `max_room_size_hosted` for host |
| Log in | `POST /api/auth/[...nextauth]` | Pomversary (date-sensitive; checked on login to catch the window even without a session) |

### 5.2 Checking Strategy

Each API handler calls a shared `checkAchievements(userId, context)` function after its primary operation succeeds. The context carries hints about which achievements to evaluate so the check function doesn't re-query everything for every event.

```typescript
// src/lib/achievement-checker.ts

interface CheckContext {
  event: 'session_recorded' | 'friendship_confirmed' | 'room_created'
       | 'room_joined' | 'login';
  userId: string;
  // Event-specific payloads:
  session?: PomodoroSession;            // for session_recorded
  friendCount?: number;                 // for friendship_confirmed
  roomId?: string;                      // for room events
  participantCount?: number;            // for room_joined (new count after join)
  isUserHost?: boolean;                 // for room_joined (true when checking the host side)
}

export async function checkAchievements(ctx: CheckContext): Promise<string[]> {
  // Returns array of newly-unlocked achievement IDs
  // Non-blocking: caller does not need to await this for its response
}
```

The function:
1. Fetches the user's already-unlocked achievement IDs (one query, ~10ms)
2. Runs only the checks relevant to the event type (not all 38 every time)
3. For any newly satisfied conditions, writes to `user_achievements` in a single transaction
4. Updates `achievement_progress` rows for all relevant counted achievements (whether or not they just unlocked)
5. Returns the list of newly unlocked IDs

**Non-blocking on the critical path:** The session is saved first; then `checkAchievements` is called with `await` removed — it runs concurrently but its result does not affect the HTTP response. Any error in achievement checking must be caught, logged, and silently swallowed; it must never fail session recording.

```typescript
// In POST /api/analytics handler:
await recordSession(session);
checkAchievements({ event: 'session_recorded', userId, session })
  .catch((err) => console.error('Achievement check failed:', err));
return NextResponse.json({ success: true });
```

### 5.3 Streak Computation

Streaks are computed fresh from the `pomodoro_sessions` table to avoid counter drift:

```sql
-- Get all distinct dates with at least one completed work session, most recent first
SELECT DISTINCT date
FROM pomodoro_sessions
WHERE user_id = ? AND phase = 'work' AND completed = 1
ORDER BY date DESC;
```

Walk the date list forward; count consecutive days. If two adjacent dates differ by exactly 1 calendar day, the streak continues. Any gap breaks it. The current streak is the length of the leading consecutive run from today (or yesterday, to account for users who haven't focused yet today).

**Performance note:** Add `CREATE INDEX idx_sessions_user_date ON pomodoro_sessions(user_id, phase, completed, date)` to handle this efficiently for power users.

### 5.4 Retroactive Backfill (Existing Users)

On first deployment of the Trophy Case feature, a one-time backfill migration runs for all existing users with `email_verified = true`:

1. For each user, compute all retroactively-awardable achievements from existing data.
2. Write `user_achievements` rows with `unlocked_at = NOW()`, `notified_at = NOW()` (pre-acknowledged — no toast flood), and `retroactive = 1`.
3. Insert initial `achievement_progress` rows from historical data.
4. Insert `user_stats` rows with `rooms_hosted_total = 0`, `rooms_joined_total = 0` (cannot be retroactively computed).
5. The Trophy Case page on first visit shows a one-time banner (stored in localStorage): *"We looked back at your history and awarded you X achievements."*

Retroactively awardable achievements:

| Achievement | Source Data |
|---|---|
| First Step through The Legend (solo counts) | `pomodoro_sessions` total count |
| Flow State, The Grind | `pomodoro_sessions` daily counts |
| Custom Craftsman | `pomodoro_sessions.planned_duration` |
| Habit Forming → Centurion Streak | `pomodoro_sessions` date array |
| Creature of Habit | `pomodoro_sessions` time patterns |
| Weekend Warrior | `pomodoro_sessions` weekend dates |
| Perfect Week | `pomodoro_sessions` daily counts over rolling 7-day windows |
| Social Spark → The Connector | `friendships` table count |
| Early Bird, Night Owl | `pomodoro_sessions.started_at` / `ended_at` + UTC time (timezone retroactive if stored) |
| The Answer | `pomodoro_sessions` total count (check if total ever passed through 42) |
| Fresh Start | `pomodoro_sessions.date` — any Jan 1 entries |
| Back From the Dead | `pomodoro_sessions` gap analysis |
| Pomversary | `users.created_at` vs session dates |

**Not retroactively awardable** (room events lost, or timing-specific):
All room-based achievements, Hat Trick (requires same-day as account creation and can no longer be verified), Stealth Mode (no historical broadcast state per session).

---

## 6. API Contracts

### 6.1 `GET /api/achievements`

Returns all 38 achievement definitions enriched with the authenticated user's unlock status and progress.

**Auth:** Required. Returns `401` if unauthenticated. Returns `403` with `{ error: 'email_verification_required' }` if email not verified.

**Response `200`:**

```typescript
interface GetAchievementsResponse {
  achievements: AchievementWithStatus[];
  summary: {
    total: number;               // always 38
    unlocked: number;            // count of user's unlocked achievements
    byTier: {
      bronze:   { total: number; unlocked: number };
      silver:   { total: number; unlocked: number };
      gold:     { total: number; unlocked: number };
      platinum: { total: number; unlocked: number };
    };
    currentStreak: number;       // current day streak
    totalPomodoros: number;      // total completed work sessions
  };
}

interface AchievementWithStatus {
  id: string;
  // Metadata — obfuscated for locked secrets:
  name: string;                  // "???" if isSecret && !unlocked
  emoji: string;                 // "🔒" if isSecret && !unlocked
  description: string | null;    // null if isSecret && !unlocked
  hint: string;                  // always shown (vague, non-spoiling)
  category: AchievementCategory;
  tier: AchievementTier;
  isSecret: boolean;
  progressType: ProgressType;
  progressTarget: number | null;
  // User state:
  unlocked: boolean;
  unlockedAt: string | null;     // ISO 8601
  currentProgress: number | null; // null for binary achievements
  retroactivelyAwarded: boolean; // true if unlocked via backfill
}
```

**Caching:** Response can be cached client-side for 30 seconds. Achievement state changes only on specific user actions.

---

### 6.2 `GET /api/achievements/pending`

Returns achievements that have been unlocked but not yet displayed to the user as a toast notification. Client polls this to trigger toasts.

**Auth:** Required.

**Response `200`:**

```typescript
interface GetPendingAchievementsResponse {
  pending: PendingAchievement[];
}

interface PendingAchievement {
  id: string;
  name: string;
  emoji: string;
  tier: AchievementTier;
  toastCopy: string;
  unlockedAt: string;  // ISO 8601
}
```

**Polling frequency:** Client polls every 30 seconds while the app is in focus, **paused while the timer is running** (status === `'running'`). The endpoint queries only `user_achievements WHERE notified_at IS NULL`, making it lightweight.

---

### 6.3 `POST /api/achievements/acknowledge`

Marks a batch of achievement IDs as notified (user has seen the toast). Sets `notified_at = NOW()`.

**Auth:** Required.

**Request body:**

```typescript
interface AcknowledgeAchievementsRequest {
  achievementIds: string[];  // max 20 per call
}
```

**Response `200`:** `{ acknowledged: number }`

**Response `400`:** If `achievementIds` is empty or exceeds 20 items.

**Notes:** Idempotent — acknowledging an already-notified achievement is a no-op. Client calls this immediately after showing the toast (not after dismiss).

---

### 6.4 `GET /api/achievements/[id]`

Returns a single achievement with user status. Useful for deep-linking from a toast.

**Auth:** Required.

**Response `200`:** Single `AchievementWithStatus` object.

**Response `404`:** If `id` doesn't match any defined achievement.

---

### 6.5 `GET /api/users/[userId]/achievements`

Returns another user's public achievement profile. Visible to confirmed friends only.

**Auth:** Required. Returns `403` if `userId` is not in the requester's confirmed friends list.

**Response `200`:**

```typescript
interface UserAchievementsPublicResponse {
  userId: string;
  userName: string;
  unlocked: PublicAchievement[];        // sorted by unlockedAt DESC
  pinnedAchievements: string[];         // up to 3 achievement IDs
  summary: {
    total: number;                      // total unlocked count
    byTier: { bronze: number; silver: number; gold: number; platinum: number };
    currentStreak: number;
    totalPomodoros: number;
  };
}

interface PublicAchievement {
  id: string;
  name: string;                         // full name visible even for secrets (they earned it)
  emoji: string;
  tier: AchievementTier;
  category: AchievementCategory;
  unlockedAt: string;
}
```

**Notes:** Locked achievements are excluded entirely (no spoilers for what others haven't earned).

---

### 6.6 `PATCH /api/achievements/pinned`

Updates which achievements (up to 3) the user has pinned to their public profile.

**Auth:** Required.

**Request body:**

```typescript
interface UpdatePinnedRequest {
  pinnedAchievementIds: string[];  // 0–3 items; all must be unlocked by this user
}
```

**Response `200`:** `{ pinnedAchievementIds: string[] }`

**Response `400`:** If >3 IDs, or if any ID references a locked achievement, or if any ID is not a valid achievement ID.

---

## 7. UX Integration

### 7.1 Toast Notifications

**Trigger:** The client polls `GET /api/achievements/pending` every 30 seconds. On receiving ≥ 1 pending achievement, it immediately calls `POST /api/achievements/acknowledge` for all returned IDs and queues the toasts for sequential display.

**Timing rule:** The poll is **paused** while `timerStore.status === 'running'`. It resumes the moment the timer transitions to idle, paused, or break. This ensures achievement toasts never interrupt an active session.

**Practical flow:** A user completes their 100th session → server unlocks "Centurion" → timer transitions to break → next poll (≤ 30s later) returns the pending achievement → toast appears.

**Toast anatomy:**

```
┌─────────────────────────────────────────────────┐
│  🎉 Achievement Unlocked                   [×]  │
│                                                 │
│  💯  Centurion                       🥈 SILVER  │
│  100 sessions. That's over 40 hours...          │
│                                                 │
│              [ View Trophy Case ]               │
└─────────────────────────────────────────────────┘
```

- **Position:** Bottom-right, stacked above any other toasts
- **Auto-dismiss:** 6 seconds, extended by hovering
- **Queue behavior:** Multiple achievements show sequentially, one every 6 seconds (or on dismiss). Cap at 5 per poll cycle; any beyond 5 are discoverable via the navbar indicator.
- **Sound:** Uses the existing `notificationSound` preference. A lighter, distinct sound from the session-complete chime.
- **Animation:** Slide up from bottom-right, fade out on dismiss.
- **Clicking "View Trophy Case":** Navigates to `/achievements` and scrolls to the newly unlocked card.

---

### 7.2 Trophy Case Page (`/achievements`)

A new top-level route, linked from the navbar.

**Page Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  🏆 Trophy Case                                              │
│                                                              │
│  12 / 38 achievements  ·  🔥 14-day streak  ·  247 poms     │
│  ████████░░░░░░░░░░ 32%                                      │
│                                                              │
│  [ All ] [ Solo ] [ Social ] [ Consistency ] [ Easter Eggs ] │
│                    [ All ] [ Unlocked ] [ Locked ]           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │    🍅    │  │    🎵    │  │    💯    │  │    ⭐    │    │
│  │First Step│  │ Finding  │  │Centurion │  │ Pomodo.. │    │
│  │🥉 Bronze │  │ Rhythm🥉 │  │🥈 Silver │  │🥇 Gold   │    │
│  │ Unlocked │  │Unlocked  │  │ 100/100  │  │  47/500  │    │
│  │ Jan 5 ✓  │  │ Jan 7 ✓  │  │ Jan 20 ✓ │  │  ░█░░░░░ │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  🔒👑   │  │   🔒🔢   │  │   🔒???  │  │   🔒???  │    │
│  │The Legend│  │ (Secret) │  │ (Secret) │  │ (Secret) │    │
│  │💎Platinum│  │🥉 Bronze │  │🥉 Bronze │  │🥈 Silver │    │
│  │  47/1000 │  │Easter Egg│  │Easter Egg│  │Easter Egg│    │
│  │  ░░█░░░░ │  │Late night│  │ Early    │  │ Comeback?│    │
│  │          │  │ focused? │  │ riser?   │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Unlocked Achievement Card:**
- Full color, emoji prominent
- Name, tier badge, unlock date
- For counted achievements: green checkmark + "100/100"
- Hover/focus: reveals full description and toast copy as a tooltip
- Retroactive awards: small grey "★ Retroactive" label at bottom of card

**Locked Non-Secret Achievement Card:**
- Desaturated (CSS `filter: grayscale(0.8) opacity(0.7)`)
- Name and emoji visible but muted
- Tier badge visible
- Progress bar if `progressType = 'count'` (e.g., "47/500" with bar)
- Hint text in place of description

**Locked Secret Achievement Card:**
- Solid dark overlay
- Name replaced with "???"
- Emoji replaced with 🔒
- Tier badge visible (tier is not a spoiler)
- Hint text only (deliberately vague)
- No progress bar (would reveal too much)

**Filter bar:**
- Category filter (All / Solo / Social / Consistency / Easter Eggs)
- Status filter (All / Unlocked / Locked)
- Persisted to `localStorage`

**Sort order:** Default — unlocked first (by `unlockedAt` descending), then locked by tier (Platinum → Gold → Silver → Bronze). Toggle available for "by category" grouping.

**Retroactive banner (shown once on first visit post-launch):**
```
┌──────────────────────────────────────────────────────────────┐
│  ✨  We looked back at your history                          │
│  Based on your previous sessions and friendships, we awarded │
│  you 8 achievements. These are marked with a ★ badge.        │
│                                                    [ Got it ] │
└──────────────────────────────────────────────────────────────┘
```
Dismissed state stored in `localStorage` as `trophy-case-retroactive-banner-dismissed`.

---

### 7.3 Gold & Platinum Celebration

For **Gold** and **Platinum** unlocks, if the user is currently on the `/achievements` page, trigger a brief confetti animation (pure CSS, no external library) and a "glow pulse" border animation on the newly unlocked card. Duration: 3 seconds.

If the user is anywhere else in the app, the standard toast suffices. The celebration is reserved for Trophy Case page visits because that's the intentional "looking at my achievements" context — it enhances the experience without being intrusive.

---

### 7.4 Profile Badges (Friend Visibility)

**In the active friends widget** (per the friends system spec — dashboard sidebar showing active friends):
- Show up to 3 emoji badges inline next to the friend's name, drawn from their `pinnedAchievements`
- If no achievements are pinned, show their single highest-tier unlocked achievement automatically
- If no achievements at all: show nothing (no placeholder)
- On hover: tooltip listing the achievement names

**In the friends list / friend's profile view:**
- A "View Trophy Case" link on each friend's profile card navigates to `/achievements/[userId]`
- That page shows only their unlocked achievements, sorted by most recent
- Their summary stats (streak, total pomodoros, achievement count) are shown at the top
- Users can choose to pin up to 3 achievements for this view via `PATCH /api/achievements/pinned`

---

### 7.5 Navbar Integration

Add a 🏆 icon to the main navigation linking to `/achievements`.

**Unviewed indicator:** Show a small colored dot on the icon when `GET /api/achievements/pending` returns ≥ 1 result OR when the user has achievements unlocked since their last visit to the Trophy Case page. Use `localStorage` to track `last-trophy-case-visit` timestamp and compare against the most recently unlocked achievement's `unlocked_at`.

---

### 7.6 Dashboard Integration

Add a "Trophy Case Preview" widget to the analytics dashboard (sidebar or below stats):

```
┌─────────────────────────────────────┐
│  🏆  Your Achievements  →           │
│                                     │
│  12 / 38  ·  🔥 14-day streak       │
│                                     │
│  Closest to unlocking:              │
│  🎵 Finding Your Rhythm   8/10  ██░ │
│  👥 Building Your Circle  3/5   ██░ │
│  📅 Week in the Zone      5/7   ██░ │
└─────────────────────────────────────┘
```

"Closest to unlocking" is computed as the 3 incomplete counted achievements with the highest `currentProgress / progressTarget` ratio. This creates a natural pull toward meaningful milestones without being pushy.

---

### 7.7 Post-Session Hint (Timer Page)

After a session completes and the timer transitions to break, show a subtle one-line hint below the session complete message if the user is within 20% of a meaningful milestone:

> *"3 more sessions until Centurion (100 🥈)"*

This hint:
- Only shows if within 20% (e.g., within 20 sessions of 100, within 10 of 50)
- Only shows for solo count milestones (not streak, not social — those are background-tracked)
- Is dismissible per-session (not stored persistently)
- Can be disabled via a settings toggle ("Show achievement hints after sessions") — default ON

---

## 8. Edge Cases

### 8.1 Multiple Achievements Unlocking Simultaneously

A single session can unlock multiple achievements at once (e.g., completing session #100 on day 7 of a streak, before 7am, after a long hiatus). The server records all unlocks in a single database transaction. The client's next pending poll returns all of them together.

Toast display: queue sequentially (6s apart or on dismiss). Cap at 5 toasts per poll cycle. Remaining achievements show only via the navbar dot indicator and the Trophy Case page.

### 8.2 Offline and Connectivity

PomoPals requires authentication and session recording is server-side. The timer runs client-side, and sessions accumulate in the Zustand store's `sessions` array until posted. If connectivity is lost when a session completes:

- Sessions accumulate locally and flush to the server on reconnection (existing behavior)
- `checkAchievements` fires for each flushed session in order
- Achievements unlock with the correct `session.started_at` timestamp but `unlocked_at` reflects the actual post time
- Toast notifications fire on the next pending poll after reconnection

Achievements are eventually consistent with a small delay on spotty connections. No achievements are silently lost.

### 8.3 Timezone and Streak Boundaries

The streak is currently computed using the `date` field on sessions (stored as `YYYY-MM-DD`, UTC). A user in UTC-8 completing a session at 11:30 PM local time (07:30 UTC next day) has their session attributed to the wrong local date, potentially breaking their streak.

**Short-term:** Accept UTC date boundaries. Document as a known limitation in the UI with a small info tooltip on the streak counter: *"Streak calculated in UTC. Sessions after midnight UTC count for the next day."*

**Medium-term:** Use the `timezone` column added to sessions (§4.1) to compute local-date streaks. When present, derive the local date from `DATETIME(started_at, timezone_offset)`. When absent (legacy sessions), fall back to UTC. This is a non-breaking migration.

**For the backfill:** Apply UTC date boundaries uniformly.

### 8.4 "The Answer" (42) — Exact Count

- **Normal case:** User posts sessions one at a time. Count goes 41 → 42. Achievement fires.
- **Gap case:** User somehow posts two sessions simultaneously, jumping 40 → 42. Use the check: `previousCount < 42 AND newCount >= 42` to still award it.
- **Backfill case:** If user's historical total is exactly 42 at backfill time, award retroactively.
- **If total > 42 at backfill:** The achievement is missed — it cannot be retroactively detected that the user passed through 42. This is an acceptable edge case for an easter egg. Users who are already past 42 when Trophy Case launches simply won't get this one.
- **Revocation:** Never. If a future "delete session" feature is added, The Answer remains awarded.

### 8.5 Hat Trick — Account Creation Day Boundary

"First day" = the UTC calendar date of `users.created_at`. A user who creates their account at 11:50 PM UTC has 10 minutes of "first day" time — a known edge case. Acceptable as the achievement rewards early engagement, and the UTC boundary is consistent.

Hint text reads: *"Complete 3 pomodoros the day you sign up"* — no mention of UTC.

### 8.6 Retroactive Achievement Order and Display

All retroactive awards get `unlocked_at = migration_run_time` (same timestamp). On the Trophy Case page, these appear as a group, sorted after all organically-earned achievements with the `retroactive = 1` flag triggering the "★ Retroactive" label.

The retroactive banner (§7.2) is shown exactly once, triggered by `hasRetroactiveAwards = unlocked.some(a => a.retroactivelyAwarded)` on first page load.

### 8.7 Study Buddy — Non-Friend Co-Participants

The `room_co_sessions` table only records confirmed friends. If User A and User B complete sessions in the same room but are not friends, no co-session row is written. This is intentional — Study Buddy is a friendship achievement. If they later become friends, historical co-sessions are already gone (rooms are ephemeral). Study Buddy is prospective only.

### 8.8 Pomversary Window Behavior

- **User misses the window entirely** (doesn't open PomoPals on days 362–368): Pomversary is not awarded for that year. The window does not roll over to next year. A new window opens at days 727–733.
- **Login check:** Pomversary is also evaluated on login (not just session completion), so a user who visits PomoPals in the window but doesn't focus still has a chance — wait, no: the unlock condition requires a *completed session* within the window. Login check is used to surface a gentle prompt ("Your PomoPals anniversary is coming up — keep focusing!") rather than to actually award the achievement.
- **Idempotency:** The UNIQUE constraint on `user_achievements(user_id, achievement_id)` ensures Pomversary is awarded at most once ever.

### 8.9 Full House — Concurrent Join Race

Two users could theoretically join a room simultaneously, and the server's join handler might process both requests before either increments `max_room_size_hosted`. Use a database transaction with a SELECT-then-UPDATE pattern (or a simple `UPDATE user_stats SET max_room_size_hosted = MAX(max_room_size_hosted, ?) WHERE user_id = ?`) to ensure the counter is always at least as large as the true peak. SQLite's serialized write model makes this safe.

### 8.10 Achievement Revocation Policy

Achievements are **never revoked**. Even if:
- A user unfriends someone (friend count drops below 5): "Building Your Circle" is kept
- A user's streak breaks: All streak achievements previously earned are kept
- A room is deleted before Full House is checked: Not possible — the check runs in the join handler, not retroactively

This is both technically simpler and philosophically correct. Achievements celebrate what you *did*, not what you currently maintain.

### 8.11 Non-Verified Email Users

Users with `email_verified = false` cannot record sessions (existing gate in `POST /api/analytics`). They also cannot access friends features (existing gate). Therefore:
- Non-verified users cannot earn any achievements
- `GET /api/achievements` returns `403` with `{ error: 'email_verification_required' }` for non-verified users
- The `/achievements` page shows a verification prompt instead of the achievement grid
- This is consistent with the existing access model

---

## 9. Acceptance Criteria

### 9.1 Achievement System Fundamentals

- [ ] All 38 achievement definitions exist in `src/lib/achievements.ts` with correct metadata (id, name, emoji, description, hint, tier, category, isSecret, progressType, progressTarget, toastCopy)
- [ ] `user_achievements`, `achievement_progress`, `user_stats`, and `room_co_sessions` tables created via Drizzle migration
- [ ] New columns (`room_id`, `room_participant_count`, `session_run_id`, `timezone`) added to `pomodoro_sessions` via migration
- [ ] `checkAchievements()` function exists in `src/lib/achievement-checker.ts` with all 38 checks implemented
- [ ] Achievement checks never throw unhandled exceptions (all wrapped in try/catch)
- [ ] Achievement check errors do not affect the response of the triggering API route

### 9.2 Session-Triggered Checks (Solo + Consistency + Easter Eggs)

- [ ] Recording any completed work session triggers `checkAchievements`
- [ ] First completed session unlocks "First Step"
- [ ] Sessions #10, #100, #500, #1000 unlock the respective milestones
- [ ] A session payload with `session_run_id` matching 4 prior sessions triggers Long Haul check
- [ ] Non-default `planned_duration` (≠ 1500s) in a completed session unlocks Custom Craftsman
- [ ] 8+ completed sessions on a single `date` unlocks Flow State; 12+ unlocks The Grind
- [ ] Streak computation from `pomodoro_sessions` correctly counts consecutive UTC dates
- [ ] Streaks of 3, 7, 30, 100 days unlock the respective consistency achievements
- [ ] Session `started_at` before 07:00 (user timezone) unlocks Early Bird
- [ ] Session `ended_at` after 23:00 (user timezone) unlocks Night Owl
- [ ] Session on UTC January 1st unlocks Fresh Start
- [ ] 42nd total session unlocks The Answer (and handles "jumped over 42" case)
- [ ] Session after 30+ day gap unlocks Back From the Dead
- [ ] Session recorded when `broadcast_enabled = false` increments `stealth_sessions_count`; count ≥ 10 unlocks Stealth Mode
- [ ] Session on days 362–368 after account creation unlocks Pomversary

### 9.3 Friend-Triggered Checks

- [ ] Confirming a friendship triggers checks for Social Spark, Building Your Circle, The Connector
- [ ] First friendship unlocks Social Spark
- [ ] 5th friendship unlocks Building Your Circle
- [ ] 25th friendship unlocks The Connector

### 9.4 Room-Triggered Checks

- [ ] `POST /api/rooms` (create) increments `rooms_hosted_total` and checks Open Door / Gracious Host / Grand Host
- [ ] 1st / 10th / 50th room hosted unlocks the respective host achievements
- [ ] `POST /api/rooms/[id]` join action where host is a confirmed friend sets `has_joined_friends_room = 1` and unlocks Joining In
- [ ] Join action updates `max_room_size_hosted` for the room's host atomically
- [ ] `max_room_size_hosted ≥ 10` unlocks Pack Leader; ≥ 20 unlocks Full House
- [ ] Session recorded with `room_participant_count ≥ 3` unlocks Better Together
- [ ] Session recorded with `room_participant_count ≥ 5` unlocks Squad Goals
- [ ] `room_co_sessions` rows written for confirmed-friend co-participants on session completion
- [ ] 5 distinct co-session `date` values with the same friend unlocks Study Buddy

### 9.5 API Contracts

- [ ] `GET /api/achievements` returns all 38 entries with correct unlock state per user
- [ ] Secret + locked achievements return `name: "???"`, `emoji: "🔒"`, `description: null`
- [ ] `GET /api/achievements/pending` returns only `notified_at IS NULL` entries
- [ ] `POST /api/achievements/acknowledge` sets `notified_at = NOW()` and is idempotent
- [ ] `GET /api/users/[userId]/achievements` returns `403` if users are not confirmed friends
- [ ] `PATCH /api/achievements/pinned` rejects >3 IDs and unearned achievements with `400`
- [ ] All achievement endpoints return `401` for unauthenticated users
- [ ] All achievement endpoints return `403` for non-email-verified users

### 9.6 UX — Toast Notifications

- [ ] Toast poll (`GET /api/achievements/pending`) pauses while timer `status === 'running'`
- [ ] Toast appears within one 30-second poll cycle after session completes
- [ ] Toast displays emoji, name, tier badge, and toast copy text
- [ ] Multiple toasts display sequentially, not simultaneously
- [ ] Clicking "View Trophy Case" navigates to `/achievements`
- [ ] `POST /api/achievements/acknowledge` fires immediately on toast display (not on dismiss)
- [ ] No more than 5 toasts shown per poll cycle

### 9.7 UX — Trophy Case Page

- [ ] `/achievements` is linked from the navbar with a 🏆 icon
- [ ] All 38 achievements render in the achievement grid
- [ ] Unlocked cards show full color, emoji, name, tier, unlock date
- [ ] Locked non-secret cards show desaturated style, progress bar (if counted), hint text
- [ ] Locked secret cards show dark overlay, "???", 🔒, tier badge, hint text only
- [ ] Category filter (All / Solo / Social / Consistency / Easter Eggs) works correctly
- [ ] Status filter (All / Unlocked / Locked) works correctly
- [ ] Filter state persists to `localStorage`
- [ ] Summary stats (unlocked count, streak, total pomodoros) shown at top
- [ ] Gold/Platinum unlock triggers confetti + glow animation on the Trophy Case page
- [ ] Retroactive banner displays once on first visit if retroactive awards exist
- [ ] Retroactively-awarded cards show "★ Retroactive" label

### 9.8 UX — Profile Badges

- [ ] Up to 3 pinned achievement emoji shown in active friends widget
- [ ] Hover tooltip shows full achievement names
- [ ] Falls back to highest-tier unlocked achievement if no pinned achievements set
- [ ] `/achievements/[userId]` shows only unlocked achievements for confirmed friends
- [ ] Navbar 🏆 icon shows unviewed indicator (dot) when pending achievements exist

### 9.9 Retroactive Backfill

- [ ] Backfill migration runs once on deployment and does not run again
- [ ] Retroactively awarded achievements have `notified_at` pre-set (no toast flood)
- [ ] `retroactive = 1` flag set on all backfill-awarded rows
- [ ] `GET /api/achievements` returns `retroactivelyAwarded: true` for these
- [ ] `user_stats` rows created for all existing users with default values (counters = 0)

### 9.10 Edge Cases

- [ ] Multiple simultaneous unlocks recorded in a single DB transaction
- [ ] "The Answer" awards correctly when session count transitions through 42
- [ ] Achievement check failures (DB error, etc.) do not fail session recording
- [ ] Achievements are never revoked (test: unfriend then refetch — Building Your Circle remains)
- [ ] Pomversary window (days 362–368) evaluated on both login and session completion
- [ ] Hat Trick is not retroactively awardable (confirmed by backfill migration exclusion)
- [ ] Non-email-verified users receive `403` from all achievement endpoints

---

## 10. Implementation Order

Suggested sequence minimizing blocked work and risk:

### Phase 1 — Backend Foundation
1. Drizzle migration: new tables + columns on `pomodoro_sessions`
2. `src/lib/achievements.ts` — all 38 static definitions
3. `src/lib/achievement-checker.ts` — `checkAchievements()` with all 38 checks
4. Wire `checkAchievements` into `POST /api/analytics` (non-blocking)
5. Wire into `POST /api/rooms` (room creation)
6. Wire into `POST /api/rooms/[id]` join handler (also update `user_stats`)
7. Wire into `PATCH /api/friends/requests/[id]` accept handler
8. Wire into NextAuth `jwt` callback for login-triggered checks (Pomversary)
9. `GET /api/achievements` — full response with user state
10. `GET /api/achievements/pending` + `POST /api/achievements/acknowledge`
11. `GET /api/users/[userId]/achievements` (friends-only)
12. `PATCH /api/achievements/pinned`
13. Backfill migration script (run-once, idempotent guard)
14. Performance indexes for streak computation

### Phase 2 — Frontend Trophy Case
1. Trophy Case page `/achievements` — grid layout, all card states
2. Filter bar (category + status) with `localStorage` persistence
3. Summary stats section
4. Retroactive welcome banner (one-time, `localStorage` dismissed state)
5. Gold/Platinum celebration animation on the Trophy Case page

### Phase 3 — Frontend Toasts & Badges
1. `useAchievementPoller` hook — 30s poll, pauses during active timer
2. Toast component + sequential queue logic
3. Acknowledge call on toast display
4. Navbar 🏆 icon with unviewed dot indicator
5. Achievement badges in active friends widget
6. `/achievements/[userId]` friend profile view
7. Pinned achievement selector in user settings

### Phase 4 — Polish
1. Post-session achievement hint on timer page (within 20% of milestone)
2. Dashboard "Trophy Case Preview" widget (closest to unlocking)
3. Toast sound (hook into existing notification sound system)
4. Timezone-aware streak computation (upgrade from UTC-only to local-date via `timezone` column)
5. Performance audit: ensure `checkAchievements` completes in <100ms p99 for power users

---

*End of spec. Questions or scope changes should be discussed before engineering begins.*
