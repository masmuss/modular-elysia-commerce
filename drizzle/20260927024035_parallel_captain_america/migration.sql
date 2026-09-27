ALTER TABLE `products` RENAME COLUMN `createdByUserId` TO `created_by_user_id`;--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN `passwordHash` TO `password_hash`;--> statement-breakpoint
ALTER TABLE `products` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` timestamp;