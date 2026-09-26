import { mysqlTable, int, real, text, varchar } from "drizzle-orm/mysql-core";

export const productsTable = mysqlTable("products", {
	id: int("id").primaryKey().autoincrement(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	price: real("price").notNull(),
	stock: int("stock").notNull(),
	createdByUserId: int("createdByUserId").notNull(),
});
