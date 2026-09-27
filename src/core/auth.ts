import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import {
	accountsTable,
	sessionsTable,
	usersTable,
	verificationsTable,
} from "../modules/users/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "mysql",
		schema: {
			usersTable,
			sessionsTable,
			accountsTable,
			verificationsTable,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
});
