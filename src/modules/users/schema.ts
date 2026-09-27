import {
	mysqlTable,
	int,
	text,
	varchar,
	timestamp,
} from "drizzle-orm/mysql-core";

export const usersTable = mysqlTable("users", {
	id: int().primaryKey().autoincrement(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	name: varchar("name", { length: 255 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	deletedAt: timestamp("deleted_at").$default(() => new Date()),
});
