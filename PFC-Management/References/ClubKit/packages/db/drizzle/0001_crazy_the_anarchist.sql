DROP INDEX "event_categories_name_unique";--> statement-breakpoint
DROP INDEX "semesters_name_unique";--> statement-breakpoint
DROP INDEX "users_clerk_id_unique";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "users_university_id_unique";--> statement-breakpoint
ALTER TABLE `checkins` ALTER COLUMN "time" TO "time" integer NOT NULL DEFAULT (current_timestamp);--> statement-breakpoint
CREATE UNIQUE INDEX `event_categories_name_unique` ON `event_categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `semesters_name_unique` ON `semesters` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_id_unique` ON `users` (`clerk_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_university_id_unique` ON `users` (`university_id`);