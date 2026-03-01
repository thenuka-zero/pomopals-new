# Browser Notifications — Feature Spec

**Status:** Draft
**Date:** 2026-03-01
**Author:** PM Agent
**Scope:** Solo mode + Room mode; both `CompactTimer` and full-page `Timer`

---

## 1. Current Behavior Analysis

### How Phase Transitions Work Today

Phase transitions are handled entirely in `src/store/timer-store.ts` via two helper functions:

#### `tick()` — natural completion (called every second from components)
```
tick() in timer-store.ts (line 143)
  → computeTimeRemaining() → 0
  → records completed PomodoroSession (completed: true)
  → calls transitionPhase()
```

`tick()` is invoked by a `setInterval(..., 1000)` in two places:
- **`CompactTimer.tsx` (line 36–45):** Always active (the globally mounted widget on every page).
- **`Timer.tsx` (line 20–30):** Active only when **not** in room mode (`if (isRoomMode) return`).

Because `CompactTimer` is mounted globally (in the root layout), it is the effective "clock" for the solo timer on every page.

#### `skip()` — manual skip
```
skip() in timer-store.ts (line 137)
  → recordSessionIfNeeded() — records partial session if applicable
  → calls transitionPhase()
```

#### `transitionPhase()` — shared transition logic (lines 321–360)
Both `tick()` and `skip()` converge on `transitionPhase()`, which:
1. Decides the next phase: `work` → `shortBreak` or `longBreak` (based on `pomodoroCount % longBreakInterval`); `shortBreak`/`longBreak` → `work`
2. Sets `status: "idle"` — the timer **stops** and waits for the user to press Start
3. Resets `timeRemaining`, `elapsed`, `startedAt`, `currentSessionStart`

**Critical detail:** After `transitionPhase()`, the state fields that changed are `phase`, `status` (→ `"idle"`), `timeRemaining` (→ new phase duration), and `pomodoroCount` (incremented when leaving work). There is **no** `"completed"` status — both natural completion and manual skip both end in `status: "idle"`.

#### Cross-tab sync (BroadcastChannel, lines 247–291)
When `phase`, `status`, `pomodoroCount`, `startedAt`, or `elapsed` change in any tab, the updated state is broadcast to all other open tabs. Receiving tabs update via `syncState()` (which calls `set()` with `skipBroadcast = true` to avoid echo loops).

This means: if the user has two tabs open, **only one tab fires `tick()`** (whichever got there first), but **both tabs receive the phase transition** via BroadcastChannel. Any notification logic must fire only once across all tabs — not once per tab.

#### Hydration — timer expired while tab was closed (`onRehydrateStorage`, lines 194–235)
When the user re-opens the app after the timer has expired in the background, `onRehydrateStorage` detects `timeRemaining <= 0` and silently transitions to the next phase (sets it to `idle`). No visible event fires for this case today.

#### Room mode (`RoomView.tsx` / `Timer.tsx` with `isRoomMode=true`)
- `Timer.tsx` with `isRoomMode=true` **skips** its own `setInterval` — it does not call `tick()`.
- The room's timer runs on the server; `RoomView.tsx` polls the API and calls `syncState(phase, status, timeRemaining, pomodoroCount)` to mirror server state into the local store.
- Phase transitions are resolved lazily server-side in `resolvePhaseTransitions()` (`rooms.ts`), and synced back on each poll.

### Current Gap
There is no notification or audio cue when a phase ends. The timer simply resets to `idle` — users who are in another tab, or who have stepped away, receive no alert.

---

## 2. Proposed UX

### 2.1 Permission Request

**When:** Request notification permission the **first time the user presses Start** (not on page load, and not in a passive `useEffect` on mount). Browsers strongly discourage prompts that aren't tied to a direct user gesture — triggering on Start is a clear, intentional action.

**How:**
1. On the first press of Start (solo or room), check `Notification.permission`.
2. If `"default"` (never asked): call `Notification.requestPermission()` asynchronously, then proceed to start the timer normally whether the user grants or denies.
3. If `"granted"`: proceed silently.
4. If `"denied"`: proceed silently; never ask again.

**One-time only:** After the permission prompt has been shown once (regardless of outcome), never show it again in the same session or future sessions. Store the `"asked"` state in `localStorage` (key: `pomo-notif-asked`) to persist across refreshes.

**No banner/modal:** Do not show a custom pre-permission dialog before the browser prompt. The browser prompt itself is sufficient and expected.

### 2.2 Notification Content

#### Work session ends → break begins
- **Title:** `🍅 Pomodoro complete!`
- **Body (short break):** `Time for a 5-minute break. You've earned it.`
- **Body (long break):** `Time for a 15-minute long break. Well done! 🎉`
- **Icon:** `/favicon.ico` (the tomato icon)
- **Tag:** `"pomo-phase"` (prevents stacking duplicate notifications)

#### Break ends → work begins
- **Title:** `☕ Break's over!`
- **Body:** `Ready to focus? Start your next Pomodoro.`
- **Icon:** `/favicon.ico`
- **Tag:** `"pomo-phase"`

#### Manual skip — no notification
When the user presses Skip, they are explicitly choosing to move to the next phase. No notification should fire. It would be redundant and annoying.

#### Timer expired while tab was closed (hydration)
When the user returns to the app and the timer had expired in the background, show a **late notification** to inform them:
- **Title:** `⏰ Timer finished while you were away`
- **Body:** Use the phase that completed: e.g., `Your Pomodoro ended. Ready to take a break?` or `Your break ended. Ready to start a new Pomodoro?`
- Only shown if `Notification.permission === "granted"`.
- This fires once during hydration, before the user interacts.

#### Notification click behavior
Clicking any notification should `window.focus()` the app tab (via the `onclick` handler on the `Notification` object). This is the standard pattern and requires no extra routing logic.

### 2.3 Sound Options

The Web Notifications API does not support custom sounds on all platforms. A separate Web Audio API sound system should complement the visual notification. This is opt-in, stored in settings.

**Options (stored in `TimerSettings.notificationSound`):**
| Value | Description |
|---|---|
| `"none"` | Silent — notifications only (default) |
| `"bell"` | Soft, melodic bell tone (short synthesized chime ~0.5s) |
| `"digital"` | Short digital beep (square wave, ~0.3s) |

**Implementation:** A small `playNotificationSound(type)` utility using the `AudioContext` API — no external audio file dependencies, synthesized inline. Sound plays at the same moment as the notification fires.

**Settings UI:** A new "Notification Sound" dropdown in the existing `Settings` modal (the `Settings.tsx` component already handles timer duration settings; this should be added to the same panel under a "Notifications" section).

---

## 3. Technical Approach

### 3.1 New Hook: `useNotifications`

Create `src/hooks/useNotifications.ts`. This hook:
1. Reads `Notification.permission` (reactive via `navigator.permissions.query("notifications")`)
2. Exposes `requestPermission()` — to be called on the Start button press
3. Exposes `notifyPhaseComplete(completedPhase, nextPhase)` — fires the notification and sound
4. Returns `{ permission, requestPermission, notifyPhaseComplete }`

This keeps all notification logic out of the store (which should remain side-effect-free) and out of individual components.

### 3.2 Distinguishing Natural Completion vs Manual Skip

The store currently does not distinguish between natural completion and manual skip (both call `transitionPhase()`). To detect natural completion for notification purposes, add a new field to the store:

```ts
// In TimerState interface
lastTransitionType: "completed" | "skipped" | "reset" | null;
```

Update the three callers:
- `tick()` when `newTime <= 0`: set `lastTransitionType: "completed"`
- `skip()`: set `lastTransitionType: "skipped"`
- `reset()`: set `lastTransitionType: "reset"`

The notification logic watches for `lastTransitionType === "completed"` changes.

### 3.3 Where to Watch in the Component Layer

In `CompactTimer.tsx` (the globally mounted component, the effective timer clock), add a `useEffect` that observes the `lastTransitionType` field:

```ts
const { phase, lastTransitionType, settings } = useTimerStore();
const prevPhase = useRef(phase);

useEffect(() => {
  if (lastTransitionType === "completed") {
    // The phase that just ended is prevPhase.current
    notifyPhaseComplete(prevPhase.current, phase);
  }
  prevPhase.current = phase;
}, [phase, lastTransitionType]);
```

**Why `CompactTimer` (not `Timer`):** `CompactTimer` is the global clock that's always mounted. `Timer` is only on `/timer` and room pages. By placing notification logic in `CompactTimer`, notifications work on every page including the homepage — even if the user navigated away from the timer page.

### 3.4 Cross-Tab Deduplication

The BroadcastChannel sync means multiple tabs may observe the same phase transition. To prevent duplicate notifications:

Use the `tag: "pomo-phase"` field on the `Notification` constructor. The browser automatically replaces a notification with the same tag — only one notification is shown, regardless of how many tabs fired it.

This is a zero-cost deduplication — no coordination between tabs required.

### 3.5 Room Mode Handling

In room mode, `syncState(phase, status, timeRemaining, pomodoroCount)` is called by `RoomView.tsx` on each poll. The same `lastTransitionType` pattern applies — but `syncState()` must **not** set `lastTransitionType`. Only `tick()` should set it to `"completed"`.

However, in room mode, the local tab does not call `tick()` — `RoomView.tsx` calls `syncState()` instead. This means the `"completed"` event won't be detected by the `lastTransitionType` approach in room mode.

**Solution for room mode:** `RoomView.tsx` polls the server and can detect phase transitions by comparing `prevPhase` to the latest `syncState` phase. If a phase transition is observed during a poll (i.e., `prevPhase !== newPhase` and the timer was running), it should call `notifyPhaseComplete()` directly.

`RoomView.tsx` already has the `prevPhase` context needed to do this. The notification hook's `notifyPhaseComplete` should be callable from any component.

### 3.6 Permission Request Wiring

The Start button in both `Timer.tsx` and `CompactTimer.tsx` calls `start()` (or room callbacks). Before calling `start()`, check:

```ts
if (Notification.permission === "default" && !localStorage.getItem("pomo-notif-asked")) {
  localStorage.setItem("pomo-notif-asked", "1");
  Notification.requestPermission(); // non-blocking, no await needed
}
start();
```

The `requestPermission()` call is intentionally non-blocking here — it should not delay starting the timer.

### 3.7 Sound Synthesis

Use the `AudioContext` API to synthesize tones without external files:

```ts
function playBell() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = 880; // A5
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);
}
```

A digital beep variant uses `"square"` wave type at a lower frequency (~440 Hz) with a shorter decay (~0.3s).

### 3.8 Settings Schema Change

Add `notificationSound` to `TimerSettings` in `src/lib/types.ts`:

```ts
interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  notificationSound: "none" | "bell" | "digital"; // NEW
}
```

Default: `"none"`. This is persisted with the rest of `settings` in localStorage (already handled by the store's `partialize` function).

---

## 4. Edge Cases

### 4.1 Browser Does Not Support Notifications
`typeof Notification === "undefined"` (e.g., some older mobile browsers, certain privacy browsers).

**Handling:** Wrap all notification code in a `if (typeof Notification !== "undefined")` guard. The feature degrades gracefully — no error, no UI change. The sound option still works independently of the Notification API.

### 4.2 User Denies Permission
`Notification.permission === "denied"`.

**Handling:** Silently skip sending notifications. Do **not** show any in-app prompt asking users to re-enable — that is patronizing. The sound option (if configured) still plays regardless of notification permission, since it uses the Web Audio API.

Do not surface a "Notifications are blocked" warning in the UI. The user made a deliberate choice.

### 4.3 Tab Is Focused vs Background

**Background tab (most important case):** Browser notifications appear in the OS notification tray. This is exactly when notifications are most useful.

**Focused tab:** A notification from the focused tab may appear as an OS banner, which can be intrusive if the user is actively looking at the timer.

**Recommendation:** When the page has `document.visibilityState === "visible"` (tab is focused), suppress the OS notification and instead trigger a subtle in-app visual pulse/flash on the `CompactTimer` widget. The sound still plays either way. When the page is hidden, send the full OS notification.

Implementation: Check `document.hidden` inside `notifyPhaseComplete()` before calling `new Notification(...)`.

### 4.4 Multiple Tabs Open
Covered by `tag: "pomo-phase"` deduplication (Section 3.4). The OS will show only one notification regardless of how many tabs fire it.

For sound: all tabs will attempt to play the sound. This can result in stacking. **Solution:** In the BroadcastChannel message, include a `notified: true` flag when the source tab fires the notification. Receiving tabs skip the sound if `notified: true` was received. The source tab plays the sound normally.

### 4.5 Room Mode vs Solo Mode
- **Solo mode:** Notification fires in `CompactTimer` via `lastTransitionType` watch.
- **Room mode (admin/participant):** All participants see the same timer. Notification should fire for **every participant** when the phase changes — not just the room admin.
- `RoomView.tsx` receives the latest room state on each poll. When it detects a phase change (by comparing `prevPhase !== currentPhase`) and the elapsed time indicates this was a natural expiry (not a manual skip — which can be detected if the poll gap is small), it fires the notification.
- In room mode, the Skip button is only available to the room admin. Non-admin participants never call `skip()`. So for non-admins, every phase transition is either a natural completion or an admin skip. To avoid notifying on admin skips: track whether `timeRemaining` was near-zero on the previous poll before the phase change occurred.

### 4.6 Timer Expired While Tab Was Closed (Hydration)
Covered in Section 2.2. Fire the late notification during `onRehydrateStorage`, but only if:
- `Notification.permission === "granted"`, AND
- The store's hydrated state shows `status === "idle"` after a forced transition (i.e., it was running and expired).

Note that `onRehydrateStorage` runs before React mounts, so the notification must be fired from a React `useEffect` that checks a "hydrated and expired" flag — not directly inside `onRehydrateStorage` (which is called synchronously during Zustand setup).

Add a flag: `hydratedAsExpired: boolean` to the store, set to `true` in `onRehydrateStorage` when the expiry-while-closed path is taken. A `useEffect` in `CompactTimer` reads this flag and fires the late notification once, then clears it.

### 4.7 Notification Sound in Safari / iOS
Safari has historically blocked `AudioContext.resume()` until a user gesture. Since the sound fires automatically (on phase complete, no user gesture), test that the `AudioContext` was already unlocked by a prior user interaction (the original Start button press). The Start press is a user gesture that can pre-unlock the context.

**Mitigation:** Create and resume the `AudioContext` during the Start button press (store it in a module-level variable), and reuse that context for all subsequent sounds. This pre-unlocks it for future auto-play.

---

## 5. Acceptance Criteria

### 5.1 Permission
- [ ] No permission prompt appears on page load or any passive action.
- [ ] A browser permission prompt appears the first time the user presses "Start" (solo or room mode).
- [ ] The permission prompt appears at most once per user (persisted in `localStorage`).
- [ ] Pressing Start works normally regardless of grant/deny.

### 5.2 Work Session End Notification
- [ ] When a work session naturally completes (countdown reaches 0), an OS notification fires with title "🍅 Pomodoro complete!" and appropriate body text.
- [ ] The body text reflects whether the next phase is a short break or long break.
- [ ] No notification fires when the user manually skips a work session.

### 5.3 Break End Notification
- [ ] When a short or long break naturally completes, an OS notification fires with title "☕ Break's over!".
- [ ] No notification fires when the user manually skips a break.

### 5.4 Notification Behavior
- [ ] Clicking the notification brings the PomoPals tab into focus.
- [ ] Only one notification appears at a time (no stacking), even if multiple tabs are open.
- [ ] When the tab is focused, the OS notification is suppressed and a subtle in-app visual cue is shown instead.

### 5.5 Sound
- [ ] A new "Notification Sound" setting (`none` / `bell` / `digital`) appears in the Settings modal.
- [ ] With `"none"` selected, no sound plays (default).
- [ ] With `"bell"` or `"digital"` selected, the appropriate synthesized sound plays when a phase completes (whether or not the OS notification was suppressed).
- [ ] Sound plays regardless of whether Notification permission was granted.
- [ ] The sound setting persists across page refreshes.

### 5.6 Cross-Tab
- [ ] With two PomoPals tabs open, exactly one OS notification appears (not two) when a phase completes.
- [ ] Sound plays in at most one tab (not both).

### 5.7 Room Mode
- [ ] All room participants (not just the admin) receive a notification when the phase changes naturally.
- [ ] Room participants do not receive a notification when the admin manually skips.

### 5.8 Hydration / Offline
- [ ] If the timer expired while the tab was closed, a "finished while away" notification fires when the user re-opens the app (permission must be granted).
- [ ] If the browser does not support the Notification API, no errors occur and the app behaves normally.
- [ ] If the user has denied notification permission, no in-app warning or nagging prompt is shown.

### 5.9 Settings Type Safety
- [ ] `TimerSettings` in `src/lib/types.ts` includes `notificationSound: "none" | "bell" | "digital"`.
- [ ] Existing persisted `localStorage` data without `notificationSound` defaults to `"none"` without errors (backward-compatible via Zustand `merge` strategy).

---

## Open Questions for Engineering

1. **`lastTransitionType` in room mode:** `syncState()` is called by `RoomView.tsx` — should `RoomView` be responsible for calling `notifyPhaseComplete()` directly (bypassing the store field), or should a `syncState` variant accept a `transitionType` parameter?

2. **Sound context lifecycle:** Should the `AudioContext` be a singleton at module level, or created fresh for each sound? Module-level is better for Safari unlock, but adds a teardown concern.

3. **In-app visual cue when tab is focused:** What should this look like? Options include: a brief border flash on the `CompactTimer` widget, a title-bar blink (`document.title`), or a toast notification. Recommend `document.title` blink + CompactTimer pulse as the least intrusive combination.

4. **`hydratedAsExpired` flag:** This is a derived/transient state — should it live in the Zustand store (persisted accidentally if not excluded from `partialize`) or in a separate React context/ref?
