import { sql } from "drizzle-orm";
import {
	mysqlTable,
	mysqlEnum,
	int,
	decimal,
	timestamp,
	varchar,
} from "drizzle-orm/mysql-core";

export const ordersTable = mysqlTable("orders", {
	id: int("id").primaryKey().autoincrement(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	snapShotUserName: varchar("snapshot_user_name", { length: 255 }).notNull(),
	snapshotUserEmail: varchar("snapshot_user_email", { length: 255 }).notNull(),
	status: mysqlEnum("status", ["PENDING", "PAID", "FAILED"])
		.notNull()
		.default("PENDING"),
	totalAmount: decimal("total_amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
	createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItemsTable = mysqlTable("order_items", {
	id: int("id").primaryKey().autoincrement(),
	orderId: int("order_id")
		.notNull()
		.references(() => ordersTable.id),
	productId: int("product_id").notNull(),
	quantity: int("quantity").notNull(),
	priceAtTimeOfOrder: decimal("price_at_time", {
		precision: 12,
		scale: 2,
		mode: "number",
	}).notNull(),
});
