CREATE TABLE `friend_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`responded_at` text,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_friend_requests_pair` ON `friend_requests` (`requester_id`,`recipient_id`);--> statement-breakpoint
CREATE INDEX `idx_friend_requests_recipient` ON `friend_requests` (`recipient_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_friend_requests_requester` ON `friend_requests` (`requester_id`,`status`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id_a` text NOT NULL,
	`user_id_b` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id_a`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id_b`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_friendships_pair` ON `friendships` (`user_id_a`,`user_id_b`);--> statement-breakpoint
CREATE INDEX `idx_friendships_user_a` ON `friendships` (`user_id_a`);--> statement-breakpoint
CREATE INDEX `idx_friendships_user_b` ON `friendships` (`user_id_b`);--> statement-breakpoint
CREATE TABLE `room_join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`host_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`responded_at` text,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`host_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_room_join_requests_pair` ON `room_join_requests` (`room_id`,`requester_id`);--> statement-breakpoint
CREATE INDEX `idx_room_join_requests_host` ON `room_join_requests` (`host_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_room_join_requests_requester` ON `room_join_requests` (`requester_id`,`status`);--> statement-breakpoint
CREATE TABLE `user_presence` (
	`user_id` text PRIMARY KEY NOT NULL,
	`is_active` integer DEFAULT 0 NOT NULL,
	`room_id` text,
	`room_name` text,
	`phase` text,
	`started_at` text,
	`expires_at` text NOT NULL,
	`broadcast_enabled` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`broadcast_enabled` integer DEFAULT 1 NOT NULL,
	`friend_limit` integer DEFAULT 50 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
