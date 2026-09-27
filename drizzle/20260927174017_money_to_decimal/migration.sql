ALTER TABLE `order_items` MODIFY COLUMN `price_at_time` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `total_amount` decimal(14,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `price` decimal(12,2) NOT NULL;