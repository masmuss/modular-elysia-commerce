import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	boolean,
} from "drizzle-orm/mysql-core";

export const usersTable = mysqlTable("users", {
	id: varchar("id", { length: 36 }).primaryKey(),
	name: text("name").notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const sessionsTable = mysqlTable("sessions", {
	id: varchar("id", { length: 36 }).primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: varchar("user_id", { length: 36 })
		.notNull()
		.references(() => usersTable.id),
});

export const accountsTable = mysqlTable("accounts", {
	id: varchar("id", { length: 36 }).primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: varchar("user_id", { length: 36 })
		.notNull()
		.references(() => usersTable.id),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	expiresAt: timestamp("expires_at"),
	password: text("password"),
});

export const verificationsTable = mysqlTable("verifications", {
	id: varchar("id", { length: 36 }).primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
});
