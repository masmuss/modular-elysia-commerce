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
ALTER TABLE `iam_role_permissions` ADD CONSTRAINT `iam_role_permissions_role_id_iam_roles_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `iam_roles`(`id`);--> statement-breakpoint
ALTER TABLE `iam_role_permissions` ADD CONSTRAINT `iam_role_permissions_permission_id_iam_permissions_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `iam_permissions`(`id`);--> statement-breakpoint
ALTER TABLE `iam_user_roles` ADD CONSTRAINT `iam_user_roles_user_id_users_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`);--> statement-breakpoint
ALTER TABLE `iam_user_roles` ADD CONSTRAINT `iam_user_roles_role_id_iam_roles_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `iam_roles`(`id`);