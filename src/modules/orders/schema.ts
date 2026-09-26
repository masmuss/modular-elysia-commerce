import { sql } from "drizzle-orm";
import { integer, real, text } from "drizzle-orm/sqlite-core/columns";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";

export const ordersTable = sqliteTable("orders", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	userId: integer("user_id").notNull(),
	status: text("status", { enum: ["PENDING", "PAID", "FAILED"] })
		.notNull()
		.default("PENDING"),
	totalAmount: real("total_amount").notNull(),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItemsTable = sqliteTable("order_items", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	orderId: integer("order_id")
		.notNull()
		.references(() => ordersTable.id),
	productId: integer("product_id").notNull(),
	quantity: integer("quantity").notNull(),
	priceAtTimeOfOrder: real("price_at_time").notNull(),
});
