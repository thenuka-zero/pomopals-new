# Spec: Room Timer Initialization Option in Create Room Modal

**Author:** PM Agent
**Date:** 2026-03-01
**Status:** Draft — Pending Engineering Review
**Scope:** `CreateRoomModal` component, `POST /api/rooms`, `src/lib/rooms.ts`

---

## 1. Current Behavior Analysis

### What Happens Today

When a user clicks "Create Room," the `CreateRoomModal` receives the solo timer's current state
as a prop (`timerState: SoloTimerState`). The modal silently decides what to do based on whether
the timer is "active":

```ts
// CreateRoomModal.tsx — current decision logic
const timerActive = timerState.status !== "idle";
const effectiveSettings = timerActive ? timerState.settings : settings;
```

- **If the timer is idle** (`status === "idle"`): The modal shows editable settings fields
  (Focus duration, Break duration). The room is created with a fresh `work` phase at `0` elapsed.
- **If the timer is running or paused** (`status !== "idle"`): The modal disables all settings
  fields, shows a passive amber banner — _"Continuing your current session — settings are
  inherited from your active timer."_ — and automatically forwards the full `timerState` to the
  API. The user has no say in this decision.

### How the Backend Handles It

`POST /api/rooms` accepts an optional `timerState` body field and passes it to `createRoom()` in
`src/lib/rooms.ts`. Inside `createRoom()`:

- **If `initialTimerState` is provided and `status !== "idle"`**: The room's timer is initialized
  with the inherited `phase`, a computed `elapsed` (derived from `timeRemaining`), the forwarded
  `status`, and the `pomodoroCount`. If the solo timer was `running`, the room timer starts in
  `running` state immediately.
- **Otherwise**: The room timer starts fresh — `phase: "work"`, `status: "idle"`, `elapsed: 0`,
  `pomodoroCount: 0`.

### Problems with the Current UX

1. **No user agency.** When the solo timer is active, the outcome is imposed silently. A user who
   wants a clean-slate room has no way to get one without first manually resetting the solo timer,
   closing the modal, and re-opening it.
2. **The amber banner is opaque.** It doesn't tell the user what phase they're in, how much time
   is left, or what their pomodoroCount is — all of which affect the room's initial state.
3. **"Continue" is surprising for break phases.** If the solo timer is mid-shortBreak, the room
   opens in break mode. Collaborators who join the room see a break timer in progress, which is
   confusing if they joined to work.
4. **Inconsistent scope of "active."** The current check (`status !== "idle"`) treats a paused
   timer identically to a running one. Both cases deserve the same choice, but the UX should
   communicate the difference clearly.

---

## 2. Proposed UX

### Overview

When the solo timer is **active** (running or paused), the modal surfaces a new **"Timer
initialization"** radio toggle between two mutually exclusive options:

- **Option A — Continue my session** _(selected by default)_
- **Option B — Start fresh**

When the solo timer is **idle**, this toggle is not shown, the behavior is unchanged, and the
settings fields remain fully editable (as they are today).

---

### Option A — "Continue my session" (default when timer is active)

The modal shows:

- The two-option radio toggle with Option A selected.
- A **context card** (replacing the current amber banner) that shows the user exactly what state
  will be carried over. The card is styled to the existing warm palette.

```
┌──────────────────────────────────────────────────────────────────┐
│  🍅  Continuing your active session                               │
│                                                                   │
│  Phase:     Focus (Work)                                          │
│  Remaining: 18 min 42 sec                                         │
│  Pomodoros: 3 completed                                           │
│                                                                   │
│  Your room will pick up exactly where you left off.              │
└──────────────────────────────────────────────────────────────────┘
```

The phase label maps as:
- `"work"` → **Focus (Work)**
- `"shortBreak"` → **Short Break**
- `"longBreak"` → **Long Break**

If the timer was `"running"`, prepend a ▶ indicator to "Remaining." If `"paused"`, show ⏸.

The settings fields (Focus, Break durations) are **hidden entirely** — they are irrelevant because
the inherited settings already define those values. This is cleaner than the current disabled-field
approach, which invites confusion about why the fields can't be edited.

---

### Option B — "Start fresh"

The modal shows:

- The two-option radio toggle with Option B selected.
- The standard **editable settings fields** (Focus min, Break min) pre-populated with the app's
  default values (25 / 5), **not** the solo session's custom values. This is intentional — fresh
  start means fresh defaults, avoiding the implicit carryover of a custom work duration.
- No context card.

```
┌─────────────────────────────────────────────────────────────────┐
│  ( ) Continue my session   (●) Start fresh                       │
│                                                                   │
│  Focus (min)   [ 25 ]        Break (min)    [  5 ]               │
│                                                                   │
│  [ Create Room ]                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Users may edit these fields freely before creating the room.

---

### Full Modal Wireframe (active timer, Option A selected)

```
┌───────────────────────────────────────────────────────┐
│  Create a Room                                         │
│                                                        │
│  Room Name                                             │
│  [ Study Session                                  ]    │
│                                                        │
│  Timer initialization                                  │
│  (●) Continue my session   ( ) Start fresh             │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  🍅  Continuing your active session             │   │
│  │                                                 │   │
│  │  Phase:     Focus (Work)                        │   │
│  │  Remaining: ▶ 18 min 42 sec                     │   │
│  │  Pomodoros: 3 completed                         │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  [ Create Room ]                                       │
└───────────────────────────────────────────────────────┘
```

---

### Full Modal Wireframe (active timer, Option B selected)

```
┌───────────────────────────────────────────────────────┐
│  Create a Room                                         │
│                                                        │
│  Room Name                                             │
│  [ Study Session                                  ]    │
│                                                        │
│  Timer initialization                                  │
│  ( ) Continue my session   (●) Start fresh             │
│                                                        │
│  Focus (min)          Break (min)                      │
│  [ 25 ]               [ 5  ]                           │
│                                                        │
│  [ Create Room ]                                       │
└───────────────────────────────────────────────────────┘
```

---

### Visual Design Notes

- The radio toggle should use the existing warm-red / warm-brown color scheme. The selected option
  has a `border-[#E54B4B]` ring; unselected options use `border-[#F0E6D3]`.
- The context card uses `bg-[#FFF8F0] border-[#F5D0A0]` (consistent with the existing amber
  banner's tone).
- The "Timer initialization" label uses the same `text-sm text-[#5C4033] font-semibold` style as
  other field labels in the modal.
- No new icons need to be introduced; 🍅 is already part of PomoPals' visual language.

---

## 3. Data Flow

### Solo Timer State Available to the Modal

The modal currently receives the entire solo `SoloTimerState` as a prop:

```ts
interface SoloTimerState {
  phase: TimerPhase;           // "work" | "shortBreak" | "longBreak"
  status: TimerStatus;         // "idle" | "running" | "paused"
  timeRemaining: number;       // seconds remaining in the current phase
  pomodoroCount: number;       // completed pomodoros in this session
  settings: TimerSettings;     // { workDuration, shortBreakDuration, longBreakDuration, longBreakInterval }
}
```

This is already everything the backend needs. No changes to the prop interface are required.

### New Modal-Internal State

The modal needs one additional piece of local state:

```ts
// Default to "continue" when timer is active; ignored when idle
const [timerInitMode, setTimerInitMode] = useState<"continue" | "fresh">("continue");
```

### What Gets Sent to the API

**Option A — Continue:**

```ts
// Same as current behavior when timerActive === true
body = {
  hostId, hostName, name,
  settings: timerState.settings,   // inherit solo settings
  timerState: timerState,          // full solo state passed along
}
```

**Option B — Fresh:**

```ts
// Same as current behavior when timerActive === false
body = {
  hostId, hostName, name,
  settings: freshSettings,         // user-edited settings (defaults: 25/5/15/4)
  // timerState omitted → backend creates a fresh work-phase timer
}
```

### Backend — No Changes Required

The existing `createRoom()` logic already handles both paths correctly:

- **With `timerState`** and `status !== "idle"`: inherits phase, elapsed, pomodoroCount, status.
- **Without `timerState`** (or `status === "idle"`): creates fresh timer.

The API and `rooms.ts` do not need to change for this feature. All new logic lives in the
frontend modal component.

### How `timeRemaining` Is Computed for the Context Card

The context card displays a human-readable `timeRemaining`. The modal already receives this value
directly from the `timerState` prop (it is a computed, real-time value supplied by the store). The
frontend should display:

```ts
const minutes = Math.floor(timerState.timeRemaining / 60);
const seconds = timerState.timeRemaining % 60;
// → "18 min 42 sec"
```

Since the modal is a static snapshot opened at a point in time, the displayed value does **not**
need to tick down while the modal is open. The `timeRemaining` value passed to the API is the
value at the moment the user clicks "Create Room," not the value when the modal opened. This is
correct — `handleCreate` is called on submit, and at that moment it reads the current prop value.

> **Note for implementation:** The `timerState` prop is passed from the parent component. If the
> parent re-renders on each timer tick (which it likely does, since the Zustand store triggers
> re-renders), the `timeRemaining` shown in the card will stay current automatically. If not,
> document this limitation as a known acceptable trade-off.

---

## 4. Edge Cases

### 4.1 Timer Is Idle

**Condition:** `timerState.status === "idle"`

**Behavior:** Show no toggle. Render the existing settings fields (Focus, Break) in editable
form. This is the unchanged existing behavior. The toggle UI should not appear at all — it would
be meaningless noise.

---

### 4.2 Timer Is on a Break Phase (shortBreak or longBreak)

**Condition:** `timerState.status !== "idle"` AND `timerState.phase !== "work"`

**Behavior:** Show the toggle with both options. However, the context card must make the break
phase prominent and legible:

```
┌────────────────────────────────────────────────────────┐
│  ☕  Continuing your active session                     │
│                                                         │
│  Phase:     Short Break                                 │
│  Remaining: ▶ 3 min 10 sec                              │
│  Pomodoros: 4 completed                                 │
│                                                         │
│  Your room will start in break mode. The work phase    │
│  begins after the break completes.                      │
└────────────────────────────────────────────────────────┘
```

A soft explanatory note ("Your room will start in break mode…") sets expectations for both the
host and future joiners. Use ☕ as the icon for break phases to visually distinguish from 🍅.

**Rationale for allowing "Continue" on breaks:** A user mid-break may legitimately want to create
a room and have everyone join during the break, so they're all synchronized when the work phase
starts. This is a valid collaborative use case and should not be blocked.

---

### 4.3 Timer Is Paused

**Condition:** `timerState.status === "paused"`

**Behavior:** Show the toggle with both options. Display ⏸ (instead of ▶) in the context card
next to "Remaining." The room timer will be created in `paused` state, meaning the host will need
to press Start in the room to resume it.

The context card should clarify this:

```
Phase:     Focus (Work)
Remaining: ⏸ 12 min 00 sec  (paused — you'll need to start it in the room)
Pomodoros: 1 completed
```

---

### 4.4 Timer Has 0 or Near-0 Seconds Remaining

**Condition:** `timerState.timeRemaining <= 5` (timer is at the very end of a phase)

**Behavior:** This is a race condition. The solo timer may complete its phase between when the
user opens the modal and when they click "Create Room." The backend `createRoom()` handles the
degenerate case: if `elapsed ≥ duration`, `computeTimeRemaining` returns `0`, and the room timer
immediately enters the next phase on the first `GET /api/rooms/:id` request (via
`resolvePhaseTransitions`). This is acceptable behavior.

**UX Consideration:** Show the context card with whatever `timeRemaining` is in the prop at
render time. Do not add special-case UI for near-zero values. The backend handles the resolution
correctly.

---

### 4.5 Timer Is Running with a Custom `longBreakInterval`

**Condition:** `timerState.settings.longBreakInterval !== 4` (user has changed the default)

**Behavior:** When Option A (Continue) is selected, the full `timerState.settings` object is
forwarded — including the custom `longBreakInterval`. The backend inherits it via
`mergedSettings`. This is correct: the inherited room should follow the same long-break cadence
as the solo session.

When Option B (Fresh) is selected, the modal shows default values. The user can edit these fields
before creating, including any advanced settings if those are surfaced. Do not silently carry over
the custom `longBreakInterval` when the user explicitly chooses "Start fresh."

---

### 4.6 User Switches Between Options Multiple Times Before Submitting

**Condition:** User toggles between "Continue" and "Fresh" before clicking "Create Room."

**Behavior:** Each toggle updates `timerInitMode` local state. The settings fields appear/
disappear accordingly. On submit, `handleCreate` reads the current `timerInitMode` and either
includes or excludes `timerState` from the request body. No side effects accumulate from toggling.

---

### 4.7 Modal Opened and Timer Becomes Idle While Modal Is Open

**Condition:** User opens modal while timer is running. Timer completes its phase while modal is
open (the solo timer transitions to idle). If the parent re-renders with the new `timerState`,
the prop will now show `status: "idle"` and `phase: "work"` (the next phase, post-transition).

**Behavior:** The toggle disappears and the settings fields become editable. This is the correct
behavior — the session the user was intending to "continue" no longer exists. If the parent does
not re-render (because the user is interacting with the modal), the modal will submit stale
`timerState` data; the backend will handle the near-zero `timeRemaining` gracefully per §4.4.

**Recommendation:** No special handling needed beyond the natural re-render behavior. Document
this as "last-write-wins" for the snapshot at submit time.

---

### 4.8 User Is Not Authenticated

This feature requires no changes to authentication. The modal already gates on `userId` and
`userName` being passed as props. Auth is handled upstream.

---

## 5. Acceptance Criteria

### AC-1: Toggle Visibility

- [ ] When the solo timer's `status` is `"idle"`, the "Timer initialization" toggle **does not
  appear** in the modal. Editable settings fields are shown as today.
- [ ] When the solo timer's `status` is `"running"` or `"paused"`, the "Timer initialization"
  toggle **appears** with two radio options: "Continue my session" and "Start fresh."
- [ ] The toggle defaults to **"Continue my session"** when shown.

### AC-2: "Continue my session" Option

- [ ] When "Continue my session" is selected, the editable settings fields (Focus, Break) are
  **hidden** (not merely disabled).
- [ ] A context card is shown with: phase name (human-readable), remaining time (formatted as
  "X min Y sec"), pomodoro count, and a ▶ or ⏸ indicator based on `status`.
- [ ] For break phases (`shortBreak`, `longBreak`), the context card includes an explanatory note
  that the room will start in break mode.
- [ ] Clicking "Create Room" sends the full `timerState` and `settings: timerState.settings` to
  the API, matching the existing "active timer" behavior.
- [ ] The created room's timer state (phase, elapsed, pomodoroCount) matches the solo timer's
  state at the moment of submission.

### AC-3: "Start fresh" Option

- [ ] When "Start fresh" is selected, the context card is **hidden**.
- [ ] The editable settings fields (Focus, Break) appear, pre-populated with **default values**
  (25 min focus, 5 min break) regardless of the solo session's custom settings.
- [ ] Users can edit these fields before submitting.
- [ ] Clicking "Create Room" sends **no `timerState`** to the API. The room is created with a
  fresh `work`-phase timer at `elapsed: 0`, `pomodoroCount: 0`.

### AC-4: Context Card Content Accuracy

- [ ] The phase label in the context card correctly maps: `"work"` → "Focus (Work)",
  `"shortBreak"` → "Short Break", `"longBreak"` → "Long Break."
- [ ] The remaining time is formatted as whole minutes and seconds (e.g., "18 min 42 sec").
  Negative or zero values display as "0 min 0 sec" (no crash).
- [ ] The pomodoro count reflects `timerState.pomodoroCount`.

### AC-5: Visual Consistency

- [ ] The toggle uses the existing warm-red/warm-brown color palette. Selected option has a
  red-tinted ring; unselected uses the muted border.
- [ ] The context card uses the existing `bg-[#FFF8F0] border-[#F5D0A0]` amber styling.
- [ ] The "Timer initialization" section label uses the same text styling as other field labels.
- [ ] No new third-party UI libraries or components are introduced.

### AC-6: No Backend Changes

- [ ] The `POST /api/rooms` request body shape is unchanged (optional `timerState` field).
- [ ] `src/lib/rooms.ts` and `src/app/api/rooms/route.ts` require zero modifications.
- [ ] `src/lib/types.ts` requires zero modifications.

### AC-7: Idle Timer Path — Regression

- [ ] Existing behavior for an idle timer (editable settings, no toggle, fresh room creation) is
  fully preserved and unaffected by this change.

### AC-8: Edge Cases — No Crashes

- [ ] Modal renders and submits without error when `timerState.timeRemaining === 0`.
- [ ] Modal renders and submits without error for all three `phase` values.
- [ ] Modal renders and submits without error for both `"running"` and `"paused"` statuses.
- [ ] Toggling between "Continue" and "Fresh" multiple times before submitting does not cause
  unexpected state accumulation or submission errors.

---

## 6. Out of Scope

The following are explicitly **not** part of this feature:

- Persisting the user's toggle preference across sessions (e.g., "always start fresh").
- Live countdown of `timeRemaining` inside the modal while it is open.
- Surfacing `longBreakDuration` or `longBreakInterval` as editable fields in the "Start fresh"
  path (the modal currently only exposes Focus and Break; this spec does not change that).
- Any changes to the room page or room timer behavior after creation.
- Notifying other room participants of the timer initialization choice.

---

## 7. Open Questions

| # | Question | Impact | Owner |
|---|----------|--------|-------|
| Q1 | Should the context card's `timeRemaining` tick down in real-time while the modal is open (requires a `useEffect` interval), or is a static snapshot at open time acceptable? | Low — modal is typically open for <30 sec | Frontend eng to decide |
| Q2 | Should the "Start fresh" path expose `longBreakDuration` and `longBreakInterval` as editable fields, or keep the current two-field approach? | Medium — UX completeness | PM to decide before implementation |
| Q3 | If the host chooses "Continue" from a break phase, should joiners who load the room see a visual cue explaining why they're in a break timer? | Low — could be a follow-up | PM / UX |
| Q4 | Is "Continue my session" the right default? A case could be made for "Start fresh" as the default to prevent accidentally sharing a personal Pomodoro count with a group. | Medium — influences first impression | PM to validate with users |
