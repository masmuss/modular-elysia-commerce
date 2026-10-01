import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, openAPI } from "better-auth/plugins";
import { render } from "react-email";
import { db } from "@/core/db";
import { logger } from "@/core/logger";
import OTPEmail from "@/emails/otp";
import {
	accountsTable,
	sessionsTable,
	verificationsTable,
} from "@/modules/auth/schema";
import { userRolesTable } from "@/modules/iam/schema";
import { DEFAULT_ROLE, findRoleIdByName } from "@/modules/iam/seed";
import { sendEmail } from "@/modules/mailer";
import { usersTable } from "@/modules/users/schema";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	secret:
		process.env.BETTER_AUTH_SECRET ??
		"test-secret-key-that-is-at-least-32-chars-long",
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
	plugins: [
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				const subject =
					type === "sign-in"
						? "Your sign in OTP code"
						: type === "email-verification"
							? "Your email verification code"
							: "Your password reset code";

				const html = await render(OTPEmail({ otp }));
				const { error } = await sendEmail({
					from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
					to: email,
					subject,
					html,
				});

				if (error) {
					logger.error(
						{ error, email, type },
						"failed to send verification OTP email",
					);
					throw new Error("failed to send OTP email");
				}

				logger.info(
					{ email, type },
					"verification OTP email sent successfully",
				);
			},
		}),
		openAPI(),
	],
	databaseHooks: {
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
