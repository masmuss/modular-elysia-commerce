import { redisStorage } from "@better-auth/redis-storage";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, openAPI } from "better-auth/plugins";
import { db } from "@/core/db";
import { getEnvList } from "@/core/env";
import { logger } from "@/core/logger";
import { redis } from "@/core/redis";
import { AUTH_AUDIT_EVENTS, recordAuthAuditEvent } from "@/modules/auth/audit";
import {
	accountsTable,
	sessionsTable,
	verificationsTable,
} from "@/modules/auth/schema";
import { userRolesTable } from "@/modules/iam/schema";
import { DEFAULT_ROLE, findRoleIdByName } from "@/modules/iam/seed";
import { sendOtpEmail } from "@/modules/mailer";
import { usersTable } from "@/modules/users/schema";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	secret: process.env.BETTER_AUTH_SECRET,
	trustedOrigins: getEnvList("BETTER_AUTH_TRUSTED_ORIGINS"),
	secondaryStorage: redis
		? redisStorage({ client: redis, keyPrefix: "ecommerce:auth:" })
		: undefined,
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		freshAge: 60 * 60,
		storeSessionInDatabase: true,
	},
	advanced: {
		ipAddress: {
			ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
			disableIpTracking: false,
		},
	},
	rateLimit: {
		enabled: true,
		storage: redis ? "secondary-storage" : "memory",
		customRules: {
			"/api/auth/email-otp/send-verification-otp": {
				window: 60,
				max: 3,
			},
			"/api/auth/sign-in/email-otp": {
				window: 60,
				max: 5,
			},
			"/api/auth/email-otp/request-password-reset": {
				window: 60,
				max: 3,
			},
			"/api/auth/email-otp/reset-password": {
				window: 60,
				max: 5,
			},
		},
	},
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
		requireEmailVerification: true,
		revokeSessionsOnPasswordReset: true,
		onPasswordReset: async ({ user }, request) => {
			await recordAuthAuditEvent({
				event: AUTH_AUDIT_EVENTS.PASSWORD_RESET,
				userId: user.id,
				context: { request },
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		sendOnSignIn: true,
		afterEmailVerification: async (user, request) => {
			await recordAuthAuditEvent({
				event: AUTH_AUDIT_EVENTS.EMAIL_VERIFIED,
				userId: user.id,
				context: { request },
			});
		},
	},
	plugins: [
		emailOTP({
			expiresIn: 600,
			allowedAttempts: 3,
			async sendVerificationOTP({ email, otp, type }, context) {
				await recordAuthAuditEvent({
					event: AUTH_AUDIT_EVENTS.OTP_REQUESTED,
					context: { request: context?.request },
					metadata: { type },
				});

				try {
					await sendOtpEmail(email, otp, type);
				} catch (error) {
					await recordAuthAuditEvent({
						event: AUTH_AUDIT_EVENTS.OTP_DELIVERY_FAILED,
						context: { request: context?.request },
						metadata: { type },
					});
					throw error;
				}
			},
		}),
		openAPI(),
	],
	databaseHooks: {
		session: {
			create: {
				after: async (session, context) => {
					await recordAuthAuditEvent({
						event: AUTH_AUDIT_EVENTS.SESSION_CREATED,
						userId: session.userId,
						context,
					});
				},
			},
			delete: {
				after: async (session, context) => {
					await recordAuthAuditEvent({
						event: AUTH_AUDIT_EVENTS.SESSION_REVOKED,
						userId: session.userId,
						context,
					});
				},
			},
		},
		user: {
			create: {
				after: async (user) => {
					const roleId = await findRoleIdByName(DEFAULT_ROLE);
					if (roleId === null) {
						logger.warn(
							{ role: DEFAULT_ROLE, userId: user.id },
							"role missing, skipping role assignment",
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
	"/email-otp/send-verification-otp",
	"/sign-in/email-otp",
	"/email-otp/verify-email",
	"/email-otp/request-password-reset",
	"/email-otp/reset-password",
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
		"/email-otp/send-verification-otp": {
			summary: "Send verification OTP",
			description:
				"Send a one-time password to email for sign-in, verification, or password reset.",
		},
		"/sign-in/email-otp": {
			summary: "Sign in with email OTP",
			description:
				"Authenticate using email and one-time password. Returns session cookie.",
		},
		"/email-otp/verify-email": {
			summary: "Verify email with OTP",
			description: "Verify email address using the received OTP code.",
		},
		"/email-otp/request-password-reset": {
			summary: "Request password reset OTP",
			description:
				"Send a password reset one-time password to the account email.",
		},
		"/email-otp/reset-password": {
			summary: "Reset password with OTP",
			description: "Reset account password using verified OTP code.",
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
