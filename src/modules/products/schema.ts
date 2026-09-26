import { integer, real, text } from "drizzle-orm/sqlite-core/columns";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";

export const productsTable = sqliteTable("products", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	description: text("description"),
	price: real("price").notNull(),
	stock: integer("stock").notNull(),
	createdByUserId: integer("createdByUserId").notNull(),
});
