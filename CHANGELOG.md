# Changelog

All notable changes to PomoPals will be documented here.

## [Unreleased]

## [0.2.3] - 2026-03-15

### Fixed
- Reflection modal now appears when skipping or resetting a Pomodoro early — previously it only showed on natural completion or "Done"
- Discard button now appears on sessions in the Recent Sessions list on the analytics dashboard
- Discard and delete buttons in the intentions journal and dashboard are now always visible instead of hidden until hover

## [0.2.2] - 2026-03-15

### Fixed
- Intention input no longer disappears from group rooms once the timer starts — now stays visible as a read-only display while running
- Delete and discard buttons in the intentions journal and dashboard session rows are now always visible instead of hidden until hover
- Room intentions are now isolated from the solo timer — starting a Pomodoro in a group room no longer pre-fills the intention in the solo compact view

### Added
- Product roadmap tab on the What's New page, showing upcoming features for March and April 2026

## [0.2.0] - 2026-03-15

### Fixed
- Room edit button (intention input) now renders centered below the Start/Reset/Skip buttons instead of inline
- Intention confirm button now shows a checkmark icon instead of a duplicate pencil icon
- Email verification link now automatically signs the user in after verifying
- Skip timer no longer increments the pomodoro count
- "First Step" achievement no longer unlocks after just 1 second of focus — requires at least 90% of the planned duration
- Progress bars no longer shown on unlocked achievements in the Trophy Case
- Homepage "Focus Timer" and "Focus with Friends" cards are now clickable

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
