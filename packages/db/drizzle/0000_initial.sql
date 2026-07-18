CREATE TABLE `example_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `message` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
