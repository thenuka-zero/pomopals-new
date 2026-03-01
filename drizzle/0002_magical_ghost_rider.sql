CREATE TABLE `intentions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`text` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text,
	`started_at` text NOT NULL,
	`reflected_at` text,
	`date` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `pomodoro_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_intentions_user_id` ON `intentions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_intentions_date` ON `intentions` (`date`);--> statement-breakpoint
CREATE INDEX `idx_intentions_user_date` ON `intentions` (`user_id`,`date`);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `intentions_enabled` integer DEFAULT true NOT NULL;