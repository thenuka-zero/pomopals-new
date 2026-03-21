# Changelog

All notable changes to PomoPals will be documented here.

## [Unreleased]

## [0.3.1] - 2026-03-17

### Added
- **Profile pages** — a dedicated `/profile` page where users can view and update their display name, avatar, and account settings (change email, change password)

### Fixed
- Reflection modal no longer appears for users who have not verified their email — this prevented a "Failed to save reflection" error caused by the batch save endpoint rejecting unverified users
- Added `emailVerified` check to the PATCH intentions endpoint for consistency with the batch save endpoint
- Profile page no longer shows a blank screen — a `<Suspense>` boundary is now wrapping the client component that calls `useSearchParams()`, fixing a Next.js 15/16 hydration requirement
- Profile page now shows a descriptive error message instead of silently rendering blank when the API fetch fails
- Navbar avatar link no longer renders as a pill shape — added explicit `w-[30px] h-[30px]` dimensions to the `<Link>` element to override Tailwind v4's default `<a>` element sizing in flex containers
- Task text in the task list now always renders left-aligned, even when the timer widget is inside a centred layout

## [0.3.0] - 2026-03-16

### Added
- **Multi-task list** replaces the single intention input — add as many tasks as you want before or during a session
- Tasks can be checked off mid-Pomodoro without interrupting the timer
- Session grouping: all tasks from one session are shown together as a block in the journal and dashboard
- New `POST /api/intentions/batch` endpoint to save multiple tasks in a single transaction
- New `POST /api/intentions/batch-skip` endpoint to mark all pending tasks as skipped when resetting or ending early
- Group rooms: each participant can now maintain their own task list, visible on their participant card
- Reflection modal now shows all tasks from the session with individual done/not-done toggles

### Changed
- Intentions journal and dashboard now group tasks by session block (timestamp + task list) instead of individual rows
- Room participant cards show a task list with status icons instead of a single intention text
- Tasks persist across Pomodoro phases (break, long break) and are only cleared on explicit reset or completion

### Removed
- Single-text intention input replaced by the new task list

## [0.2.0] - 2026-03-15

### Fixed
- Room edit button (intention input) now renders centered below the Start/Reset/Skip buttons instead of inline
- Intention confirm button now shows a checkmark icon instead of a duplicate pencil icon
- Email verification link now automatically signs the user in after verifying
- Skip timer no longer increments the Pomodoro count (solo and group rooms)
- "First Step" achievement no longer unlocks after just 1 second of focus — requires at least 90% of the planned duration
- Progress bars no longer shown on unlocked achievements in the Trophy Case
- Homepage "Focus Timer" and "Focus with Friends" cards are now clickable
- Intention input no longer disappears from group rooms once the timer starts — stays visible as a read-only display while running
- Room intentions are now isolated from the solo timer — starting a Pomodoro in a group room no longer pre-fills the intention in the solo compact view
- Delete and discard buttons in the intentions journal, dashboard, and analytics are now always visible instead of hidden until hover
- Discard button now appears on sessions in the Recent Sessions list on the analytics dashboard
- Reflection modal now appears when skipping, resetting, or ending a Pomodoro early — no longer limited to natural completion
- Reflection modal now appears for non-host participants in group rooms — confirming an intention mid-session correctly triggers reflection when the session ends
- Refreshing a group room no longer causes you to lose host status — stale leave beacons sent before the page reload are now ignored
- Co-host assignments are now properly removed when a participant leaves a room
- Room timer phase transitions (e.g. work → break) are now persisted to the database immediately, so rejoining participants see the correct phase
- Room settings are now synced to all participants via polling, keeping the timer progress circle and Pomodoro dots accurate after the host makes changes
- Privileged room actions (start, pause, reset, skip, end room, co-host management) now verify the request comes from the authenticated session, preventing unauthorised timer control

### Changed
- Default notification sound changed from none to bell
- Create Room icon replaced with a broadcast/tower icon titled "Host a Room"
- Join Room icon replaced with a log-in arrow icon titled "Join a Room"
- Adding a friend by name no longer requires entering their email — sends request directly by user ID
- Library articles now include a "Read next" section linking to the other three articles

### Added
- Achievement reset: unlocked achievements now show a Reset button that reverts the unlock and progress
- Intentions journal: trash icon to delete individual intentions (with two-step confirm)
- Open Graph image for social sharing — pomopals.com now shows a branded preview when shared
- Product roadmap tab on the What's New page, showing upcoming features for March and April 2026
- Group room participants list now shows each member's current intention below their name
- Room Settings panel (host and co-hosts only): adjust work duration, short/long break durations, long break interval, and auto-start breaks for the current room
- New `DELETE /api/achievements/[achievementId]` endpoint
- New `DELETE /api/intentions/[intentionId]` endpoint

## [0.1.0] - 2026-03-15

### Added
- Initial launch of PomoPals
- Pomodoro timer with customizable work and break intervals
- Study rooms for focused sessions with friends
- Friends system to connect and study together
- Trophies and achievements to celebrate milestones
- Intentions feature to set session goals
- Library with articles and guides on the Pomodoro technique
- Analytics dashboard to track focus habits
- Guide page with tips for effective Pomodoro technique
