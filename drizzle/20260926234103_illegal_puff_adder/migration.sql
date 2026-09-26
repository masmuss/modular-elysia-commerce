CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`price_at_time` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`user_id` int NOT NULL,
	`status` enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
	`total_amount` real NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` real NOT NULL,
	`stock` int NOT NULL,
	`createdByUserId` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`passwordHash` text NOT NULL,
	CONSTRAINT `email_unique` UNIQUE INDEX(`email`)
);
--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`);