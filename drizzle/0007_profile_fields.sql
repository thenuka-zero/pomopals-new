ALTER TABLE `users` ADD `avatar_url` text;--> statement-breakpoint
ALTER TABLE `users` ADD `allow_friend_requests` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `pending_email` text;--> statement-breakpoint
ALTER TABLE `users` ADD `pending_email_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `pending_email_expires_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_pending_email_token_unique` ON `users` (`pending_email_token`);
