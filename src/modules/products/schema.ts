import {
	mysqlTable,
	int,
	decimal,
	text,
	varchar,
	timestamp,
} from "drizzle-orm/mysql-core";

export const productsTable = mysqlTable("products", {
	id: int("id").primaryKey().autoincrement(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	price: decimal("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
	stock: int("stock").notNull(),
	createdByUserId: varchar("created_by_user_id", { length: 36 }).notNull(),
	deletedAt: timestamp("deleted_at"),
});
