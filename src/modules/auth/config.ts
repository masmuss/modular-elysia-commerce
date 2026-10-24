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
import { type OtpEmailType, sendOtpEmail } from "@/modules/mailer";
import { usersTable } from "@/modules/users/schema";

export type OtpSender = (
	email: string,
	otp: string,
	type: OtpEmailType,
) => Promise<void>;

export const defaultOtpSender: OtpSender = sendOtpEmail;

export const createAuth = (otpSender: OtpSender = defaultOtpSender) =>
	betterAuth({
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
				"/auth/email-otp/send-verification-otp": {
					window: 60,
					max: 3,
				},
				"/auth/sign-in/email-otp": {
					window: 60,
					max: 5,
				},
				"/auth/email-otp/request-password-reset": {
					window: 60,
					max: 3,
				},
				"/auth/email-otp/reset-password": {
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
						await otpSender(email, otp, type);
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

export const auth = createAuth();
