CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`host_id` text NOT NULL,
	`host_name` text NOT NULL,
	`created_at` text NOT NULL,
	`last_activity_at` text NOT NULL,
	`settings` text NOT NULL,
	`timer_state` text NOT NULL,
	`participants` text NOT NULL,
	`expires_at` text NOT NULL
);
