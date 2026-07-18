CREATE TABLE `example_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_user_id` text NOT NULL,
	`email` text,
	`reminder_lead_days` integer DEFAULT 7 NOT NULL,
	`push_enabled` integer DEFAULT 1 NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_user_id_unique` ON `users` (`clerk_user_id`);