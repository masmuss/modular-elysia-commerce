import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "@/core/db";
import {
	accountsTable,
	sessionsTable,
	verificationsTable,
} from "@/modules/auth/schema";
import { userRolesTable } from "@/modules/iam/schema";
import { DEFAULT_ROLE, findRoleIdByName } from "@/modules/iam/seed";
import { usersTable } from "@/modules/users/schema";

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
	plugins: [openAPI()],
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

export const AUTH_DOC_PREFIX = "/api/auth";

export const ALLOWED_AUTH_PATHS = [
	"/sign-in/email",
	"/sign-up/email",
	"/sign-out",
	"/get-session",
];

type AuthOperation = {
	tags?: string[];
	summary?: string;
	description?: string;
};

type AuthOperations = Record<string, AuthOperation>;

const AUTH_DOC_META: Record<string, { summary: string; description: string }> =
	{
		"/sign-up/email": {
			summary: "Sign up with email",
			description:
				"Create account with name, email, password. Assigns default role via database hook.",
		},
		"/sign-in/email": {
			summary: "Sign in with email",
			description:
				"Authenticate with email and password. Returns session cookie used by protected routes.",
		},
		"/sign-out": {
			summary: "Sign out",
			description: "Invalidate current session cookie.",
		},
		"/get-session": {
			summary: "Get current session",
			description: "Return active session and user bound to session cookie.",
		},
	};

export const OpenAPI = {
	getPaths: async (
		prefix = AUTH_DOC_PREFIX,
		allowlist: readonly string[] = ALLOWED_AUTH_PATHS,
	) => {
		const schema = await auth.api.generateOpenAPISchema();
		const paths = schema.paths as Record<string, AuthOperations>;
		const reference: Record<string, AuthOperations> = Object.create(null);
		for (const path of Object.keys(paths)) {
			if (!allowlist.includes(path)) continue;
			const key = prefix + path;
			reference[key] = paths[path];
			const meta = AUTH_DOC_META[path];
			for (const method of Object.keys(paths[path])) {
				reference[key][method].tags = ["Auth"];
				if (meta) {
					reference[key][method].summary = meta.summary;
					reference[key][method].description = meta.description;
				}
			}
		}
		return reference;
	},
	components: (async () => {
		const schema = await auth.api.generateOpenAPISchema();
		return schema.components;
	})(),
} as const;
