CREATE TABLE `accounts` (
	`id` varchar(36) PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` text,
	`password` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) PRIMARY KEY,
	`expires_at` timestamp NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `token_unique` UNIQUE INDEX(`token`)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` varchar(36) PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `iam_permissions` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`action` varchar(100) NOT NULL,
	CONSTRAINT `action_unique` UNIQUE INDEX(`action`)
);
--> statement-breakpoint
CREATE TABLE `iam_role_permissions` (
	`role_id` int NOT NULL,
	`permission_id` int NOT NULL,
	CONSTRAINT PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `iam_roles` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(50) NOT NULL,
	CONSTRAINT `name_unique` UNIQUE INDEX(`name`)
);
--> statement-breakpoint
CREATE TABLE `iam_user_roles` (
	`user_id` varchar(36) NOT NULL,
	`role_id` int NOT NULL,
	CONSTRAINT PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `user_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `created_by_user_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `image` text;--> statement-breakpoint
ALTER TABLE `users` ADD `created_at` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`);--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`);--> statement-breakpoint
ALTER TABLE `iam_role_permissions` ADD CONSTRAINT `iam_role_permissions_role_id_iam_roles_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `iam_roles`(`id`);--> statement-breakpoint
ALTER TABLE `iam_role_permissions` ADD CONSTRAINT `iam_role_permissions_permission_id_iam_permissions_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `iam_permissions`(`id`);--> statement-breakpoint
ALTER TABLE `iam_user_roles` ADD CONSTRAINT `iam_user_roles_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`);--> statement-breakpoint
ALTER TABLE `iam_user_roles` ADD CONSTRAINT `iam_user_roles_role_id_iam_roles_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `iam_roles`(`id`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password_hash`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `deleted_at`;