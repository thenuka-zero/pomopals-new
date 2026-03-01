ALTER TABLE `pomodoro_sessions` ADD `room_id` text;--> statement-breakpoint
ALTER TABLE `pomodoro_sessions` ADD `room_participant_count` integer;--> statement-breakpoint
ALTER TABLE `pomodoro_sessions` ADD `session_run_id` text;--> statement-breakpoint
ALTER TABLE `pomodoro_sessions` ADD `timezone` text;--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` text NOT NULL,
	`notified_at` text,
	`retroactive` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_achievements_pair` ON `user_achievements` (`user_id`,`achievement_id`);--> statement-breakpoint
CREATE INDEX `idx_user_achievements_user` ON `user_achievements` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_achievements_unnotified` ON `user_achievements` (`user_id`,`notified_at`);--> statement-breakpoint
CREATE TABLE `achievement_progress` (
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`current_value` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_achievement_progress_pk` ON `achievement_progress` (`user_id`,`achievement_id`);--> statement-breakpoint
CREATE TABLE `user_stats` (
	`user_id` text PRIMARY KEY NOT NULL,
	`rooms_hosted_total` integer DEFAULT 0 NOT NULL,
	`rooms_joined_total` integer DEFAULT 0 NOT NULL,
	`max_room_size_hosted` integer DEFAULT 0 NOT NULL,
	`stealth_sessions_count` integer DEFAULT 0 NOT NULL,
	`has_joined_friends_room` integer DEFAULT false NOT NULL,
	`pinned_achievements` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `room_co_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`session_user_id` text NOT NULL,
	`co_user_id` text NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `pomodoro_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`co_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_room_co_sessions_user_date` ON `room_co_sessions` (`session_user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_room_co_sessions_pair` ON `room_co_sessions` (`session_user_id`,`co_user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_achievement` ON `pomodoro_sessions` (`user_id`,`phase`,`completed`,`date`);
