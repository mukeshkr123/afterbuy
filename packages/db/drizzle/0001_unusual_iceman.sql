ALTER TABLE `idempotency_keys` ADD `request_hash` text NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_purchases` (
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
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_purchases`("id", "user_id", "title", "merchant", "category", "purchase_date", "amount_minor", "currency", "order_number", "notes", "delivery_status", "tracking_number", "carrier", "warranty_expires_at", "return_deadline_at", "created_at", "updated_at", "deleted_at") SELECT "id", "user_id", "title", "merchant", "category", "purchase_date", "amount_minor", "currency", "order_number", "notes", "delivery_status", "tracking_number", "carrier", "warranty_expires_at", "return_deadline_at", "created_at", "updated_at", "deleted_at" FROM `purchases`;--> statement-breakpoint
DROP TABLE `purchases`;--> statement-breakpoint
ALTER TABLE `__new_purchases` RENAME TO `purchases`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `purchases_user_id_created_at_idx` ON `purchases` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `purchases_user_id_delivery_status_idx` ON `purchases` (`user_id`,`delivery_status`);--> statement-breakpoint
CREATE INDEX `purchases_user_id_category_idx` ON `purchases` (`user_id`,`category`);