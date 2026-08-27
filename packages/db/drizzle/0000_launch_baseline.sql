CREATE TABLE `account_deletion_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`clerk_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_deletion_jobs_user_id_idx` ON `account_deletion_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `account_deletion_jobs_status_idx` ON `account_deletion_jobs` (`status`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purchase_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
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
	`platform` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_expo_push_token_unique` ON `devices` (`expo_push_token`);--> statement-breakpoint
CREATE INDEX `devices_user_id_idx` ON `devices` (`user_id`);--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`path` text NOT NULL,
	`request_hash` text NOT NULL,
	`status` text NOT NULL,
	`response_code` integer,
	`response_body` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idempotency_keys_user_id_key_idx` ON `idempotency_keys` (`user_id`,`key`);--> statement-breakpoint
CREATE INDEX `idempotency_keys_expires_at_idx` ON `idempotency_keys` (`expires_at`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`merchant` text,
	`category` text DEFAULT 'other' NOT NULL,
	`purchase_date` text NOT NULL,
	`amount_minor` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`order_number` text,
	`notes` text,
	`delivery_status` text DEFAULT 'ordered' NOT NULL,
	`tracking_number` text,
	`carrier` text,
	`warranty_expires_at` text,
	`return_deadline_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `purchases_user_id_created_at_idx` ON `purchases` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `purchases_user_id_delivery_status_idx` ON `purchases` (`user_id`,`delivery_status`);--> statement-breakpoint
CREATE INDEX `purchases_user_id_category_idx` ON `purchases` (`user_id`,`category`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`user_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `receipts_purchase_id_idx` ON `receipts` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `receipts_user_id_idx` ON `receipts` (`user_id`);--> statement-breakpoint
CREATE TABLE `reminder_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`user_id` text NOT NULL,
	`scheduled_for_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_reason` text,
	`sent_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reminder_id`) REFERENCES `reminders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reminder_deliveries_reminder_scheduled_idx` ON `reminder_deliveries` (`reminder_id`,`scheduled_for_date`);--> statement-breakpoint
CREATE INDEX `reminder_deliveries_user_status_idx` ON `reminder_deliveries` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purchase_id` text NOT NULL,
	`kind` text NOT NULL,
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
CREATE UNIQUE INDEX `reminders_purchase_id_kind_unique` ON `reminders` (`purchase_id`,`kind`);--> statement-breakpoint
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
