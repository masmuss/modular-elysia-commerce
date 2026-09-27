import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/core/db";
import { usersTable } from "@/modules/users/schema";
import {
	accountsTable,
	sessionsTable,
	verificationsTable,
} from "@/modules/auth/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "mysql",
		usePlural: true,
		schema: {
			users: usersTable,
			sessions: sessionsTable,
			accounts: accountsTable,
			verifications: verificationsTable,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
});
