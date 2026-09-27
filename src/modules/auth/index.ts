import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/core/db";
import { usersTable } from "@/modules/users/schema";
import {
	accountsTable,
	sessionsTable,
	verificationsTable,
} from "@/modules/auth/schema";
import { DEFAULT_ROLE, findRoleIdByName } from "@/modules/iam/seed";
import { userRolesTable } from "@/modules/iam/schema";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,
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
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const roleId = await findRoleIdByName(DEFAULT_ROLE);
					if (roleId === null) {
						console.warn(
							`[iam] role "${DEFAULT_ROLE}" belum ada, lewati assignment role untuk user ${user.id}`,
						);
						return;
					}

					await db
						.insert(userRolesTable)
						.values({ userId: user.id, roleId })
						.onDuplicateKeyUpdate({ set: { roleId } });
				},
			},
		},
	},
});
