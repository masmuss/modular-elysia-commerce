import { mysqlTable, int, text, varchar } from "drizzle-orm/mysql-core";

export const usersTable = mysqlTable("users", {
	id: int().primaryKey().autoincrement(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	name: varchar("name", { length: 255 }).notNull(),
	passwordHash: text("passwordHash").notNull(),
});

export const table = {
	usersTable,
} as const;

export type Table = typeof table;
