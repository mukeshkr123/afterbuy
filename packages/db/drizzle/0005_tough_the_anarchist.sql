CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purchase_id` text NOT NULL,
	`type` text NOT NULL CHECK (`type` IN ('return', 'refund', 'warranty')),
	`status` text NOT NULL CHECK (`status` IN ('draft', 'submitted', 'in_progress', 'approved', 'rejected', 'completed', 'cancelled')),
	`opened_at` text NOT NULL,
	`resolved_at` text,
	`refund_amount_minor` integer,
	`reference` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `claims_user_id_idx` ON `claims` (`user_id`);--> statement-breakpoint
CREATE INDEX `claims_purchase_id_idx` ON `claims` (`purchase_id`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expo_push_token` text NOT NULL,
	`platform` text NOT NULL CHECK (`platform` IN ('ios', 'android')),
	`last_seen_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_expo_push_token_unique` ON `devices` (`expo_push_token`);--> statement-breakpoint
CREATE INDEX `devices_user_id_idx` ON `devices` (`user_id`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purchase_id` text NOT NULL,
	`kind` text NOT NULL CHECK (`kind` IN ('warranty_expiry', 'return_deadline')),
	`fire_on` text NOT NULL,
	`sent_at` text,
	`dismissed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reminders_fire_on_sent_at_idx` ON `reminders` (`fire_on`,`sent_at`);--> statement-breakpoint
CREATE INDEX `reminders_user_id_idx` ON `reminders` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reminders_purchase_id_kind_unique` ON `reminders` (`purchase_id`,`kind`);