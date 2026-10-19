import { afterAll, describe, expect, it } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/core/db";
import { redis } from "@/core/redis";
import { createAuth } from "@/modules/auth";
import {
	accountsTable,
	authAuditLogsTable,
	sessionsTable,
	verificationsTable,
} from "@/modules/auth/schema";
import { usersTable } from "@/modules/users/schema";

const runAuthE2E = process.env.AUTH_E2E === "1";
const describeAuthE2E = runAuthE2E ? describe : describe.skip;
const email = `auth-e2e-${Date.now()}@example.com`;
const password = "correct horse battery staple";
let verificationOtp = "";
let passwordResetOtp = "";
let previousSessionCookie = "";
const resetPassword = "new correct horse battery staple";
let otpSenderType = "";
let requestCount = 0;

const auth = createAuth(async (recipient, otp) => {
	if (recipient !== email) return;
	if (otpSenderType === "forget-password") {
		passwordResetOtp = otp;
		return;
	}
	verificationOtp = otp;
});

const request = async (
	path: string,
	body: Record<string, string> = {},
	headers?: Record<string, string>,
	method = "POST",
): Promise<Response> =>
	auth.handler(
		new Request(`http://localhost:3000/api/auth${path}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				"x-forwarded-for": `192.0.2.${++requestCount}`,
				...headers,
			},
			body: method === "GET" ? undefined : JSON.stringify(body),
		}),
	);

const getSessionCookie = (response: Response): string => {
	const cookie = response.headers.get("set-cookie");
	if (!cookie) throw new Error("Expected auth session cookie");
	return cookie.split(";", 1)[0];
};

describeAuthE2E("auth end-to-end", () => {
	afterAll(async () => {
		const user = await db
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(eq(usersTable.email, email));
		const userIds = user.map(({ id }) => id);

		if (userIds.length > 0) {
			await db
				.delete(sessionsTable)
				.where(inArray(sessionsTable.userId, userIds));
			await db
				.delete(accountsTable)
				.where(inArray(accountsTable.userId, userIds));
			await db
				.delete(authAuditLogsTable)
				.where(inArray(authAuditLogsTable.userId, userIds));
			await db
				.delete(usersTable)
				.where(inArray(usersTable.id, userIds));
		}

		await db
			.delete(verificationsTable)
			.where(eq(verificationsTable.identifier, email));
	});

	it("should require verification before password login", async () => {
		const signUpResponse = await request("/sign-up/email", {
			name: "Auth E2E User",
			email,
			password,
		});

		expect(signUpResponse.status).toBe(200);

		otpSenderType = "email-verification";
		const sendOtpResponse = await request("/email-otp/send-verification-otp", {
			email,
			type: "email-verification",
		});

		expect(sendOtpResponse.status).toBe(200);
		expect(verificationOtp).toMatch(/^\d+$/);

		const signInResponse = await request("/sign-in/email", {
			email,
			password,
		});

		expect(signInResponse.status).toBeGreaterThanOrEqual(400);
	});

	it("should verify email and allow password login", async () => {
		const invalidVerifyResponse = await request("/email-otp/verify-email", {
			email,
			otp: "000000",
		});

		expect(invalidVerifyResponse.status).toBeGreaterThanOrEqual(400);

		const verifyResponse = await request("/email-otp/verify-email", {
			email,
			otp: verificationOtp,
		});

		expect(verifyResponse.status).toBe(200);

		const signInResponse = await request("/sign-in/email", {
			email,
			password,
		});

		expect(signInResponse.status).toBe(200);
		expect(signInResponse.headers.get("set-cookie")).toContain(
			"better-auth.session_token",
		);
		previousSessionCookie = getSessionCookie(signInResponse);

		const reusedVerifyResponse = await request("/email-otp/verify-email", {
			email,
			otp: verificationOtp,
		});

		expect(reusedVerifyResponse.status).toBeGreaterThanOrEqual(400);
	});

	it("should sign in with a valid OTP", async () => {
		otpSenderType = "sign-in";
		const sendOtpResponse = await request("/email-otp/send-verification-otp", {
			email,
			type: "sign-in",
		});

		expect(sendOtpResponse.status).toBe(200);
		expect(verificationOtp).toMatch(/^\d+$/);

		const invalidSignInResponse = await request("/sign-in/email-otp", {
			email,
			otp: "000000",
		});

		expect(invalidSignInResponse.status).toBeGreaterThanOrEqual(400);

		const signInResponse = await request("/sign-in/email-otp", {
			email,
			otp: verificationOtp,
		});

		expect(signInResponse.status).toBe(200);
		expect(signInResponse.headers.get("set-cookie")).toContain(
			"better-auth.session_token",
		);
	});

	it("should reset the password and revoke previous sessions", async () => {
		otpSenderType = "forget-password";
		const sendOtpResponse = await request("/email-otp/request-password-reset", {
			email,
		});

		expect(sendOtpResponse.status).toBe(200);
		expect(passwordResetOtp).toMatch(/^\d+$/);

		const verificationKey = `ecommerce:auth:verification:forget-password-otp-${email}`;
		const storedVerification = await redis?.get(verificationKey);
		if (!storedVerification) throw new Error("Expected OTP in Redis");
		const expiredVerification = JSON.parse(storedVerification) as {
			expiresAt: string;
		};
		expiredVerification.expiresAt = new Date(0).toISOString();
		await redis?.set(verificationKey, JSON.stringify(expiredVerification));

		const expiredResetResponse = await request("/email-otp/reset-password", {
			email,
			otp: passwordResetOtp,
			password: resetPassword,
		});

		expect(expiredResetResponse.status).toBeGreaterThanOrEqual(400);

		const replacementOtpResponse = await request(
			"/email-otp/request-password-reset",
			{ email },
		);

		expect(replacementOtpResponse.status).toBe(200);
		expect(passwordResetOtp).toMatch(/^\d+$/);

		const invalidResetResponse = await request("/email-otp/reset-password", {
			email,
			otp: "000000",
			password: resetPassword,
		});

		expect(invalidResetResponse.status).toBeGreaterThanOrEqual(400);

		const resetResponse = await request("/email-otp/reset-password", {
			email,
			otp: passwordResetOtp,
			password: resetPassword,
		});

		expect(resetResponse.status).toBe(200);

		const reusedResetResponse = await request("/email-otp/reset-password", {
			email,
			otp: passwordResetOtp,
			password: resetPassword,
		});

		expect(reusedResetResponse.status).toBeGreaterThanOrEqual(400);

		const previousSessionResponse = await request(
			"/get-session",
			{},
			{ Cookie: previousSessionCookie },
		);

		expect(previousSessionResponse.status).toBeGreaterThanOrEqual(400);

		const oldPasswordResponse = await request("/sign-in/email", {
			email,
			password,
		});

		expect(oldPasswordResponse.status).toBeGreaterThanOrEqual(400);

		const newPasswordResponse = await request("/sign-in/email", {
			email,
			password: resetPassword,
		});

		expect(newPasswordResponse.status).toBe(200);

		const user = await db
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(eq(usersTable.email, email));
		const auditEvents = await db
			.select({
				event: authAuditLogsTable.event,
				metadata: authAuditLogsTable.metadata,
			})
			.from(authAuditLogsTable)
			.where(eq(authAuditLogsTable.userId, user[0]?.id ?? ""));

		expect(auditEvents.map(({ event }) => event)).toContain(
			"auth.password.reset",
		);
		expect(auditEvents.map(({ event }) => event)).toContain(
			"auth.session.revoked",
		);
		expect(
			JSON.stringify(auditEvents).toLowerCase(),
		).not.toContain(passwordResetOtp);
		expect(JSON.stringify(auditEvents).toLowerCase()).not.toContain(
			resetPassword,
		);
	});

	it("should enforce OTP resend cooldown through the HTTP app layer", async () => {
		const { app } = await import("@/index");
		const unknownEmail = `missing-http-${Date.now()}@example.com`;
		const headers = {
			"Content-Type": "application/json",
			"x-forwarded-for": `198.51.100.${++requestCount}`,
		};
		const body = JSON.stringify({ email: unknownEmail });
		const firstResponse = await app.handle(
			new Request("http://localhost:3000/api/auth/email-otp/request-password-reset", {
				method: "POST",
				headers,
				body,
			}),
		);
		const secondResponse = await app.handle(
			new Request("http://localhost:3000/api/auth/email-otp/request-password-reset", {
				method: "POST",
				headers,
				body,
			}),
		);

		expect(firstResponse.status).toBe(200);
		expect(secondResponse.status).toBe(429);

		const verificationEmail = `missing-verify-${Date.now()}@example.com`;
		const verificationResponses = await Promise.all(
			Array.from({ length: 11 }, (_, index) =>
				app.handle(
					new Request("http://localhost:3000/api/auth/sign-in/email-otp", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-forwarded-for": `203.0.113.${index + 1}`,
						},
						body: JSON.stringify({
							email: verificationEmail,
							otp: "000000",
						}),
					}),
				),
			),
		);

		expect(verificationResponses[verificationResponses.length - 1]?.status).toBe(
			429,
		);
	});

	it("should audit OTP delivery failures without storing the OTP", async () => {
		const failureEmail = `auth-delivery-failure-${Date.now()}@example.com`;
		const previousFailureEvents = await db
			.select({ event: authAuditLogsTable.event })
			.from(authAuditLogsTable)
			.where(eq(authAuditLogsTable.event, "auth.otp.delivery_failed"));
		const failingAuth = createAuth(async () => {
			throw new Error("simulated email provider failure");
		});

		const response = await failingAuth.handler(
			new Request(
				"http://localhost:3000/api/auth/email-otp/send-verification-otp",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: failureEmail,
						type: "sign-in",
					}),
				},
			),
		);

		expect(response.status).toBe(200);
		await new Promise((resolve) => setTimeout(resolve, 50));

		const auditEvents = await db
			.select({
				event: authAuditLogsTable.event,
				metadata: authAuditLogsTable.metadata,
			})
			.from(authAuditLogsTable)
			.where(eq(authAuditLogsTable.event, "auth.otp.delivery_failed"));
		const newFailureEvents = auditEvents.slice(previousFailureEvents.length);
		const latestFailure = newFailureEvents[newFailureEvents.length - 1];

		expect(latestFailure?.metadata).toEqual({ type: "sign-in" });
		expect(JSON.stringify(latestFailure)).not.toContain(failureEmail);
	});
});
