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
	`deleted_at` text,
	CONSTRAINT `purchases_category_check` CHECK(`category` IN ('electronics','appliances','furniture','clothing','vehicle','home_improvement','services','other')),
	CONSTRAINT `purchases_delivery_status_check` CHECK(`delivery_status` IN ('ordered','shipped','delivered','cancelled'))
);
--> statement-breakpoint
CREATE INDEX `purchases_user_id_created_at_idx` ON `purchases` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `purchases_user_id_delivery_status_idx` ON `purchases` (`user_id`,`delivery_status`);
--> statement-breakpoint
CREATE INDEX `purchases_user_id_category_idx` ON `purchases` (`user_id`,`category`);
--> statement-breakpoint
DROP TABLE `example_jobs`;