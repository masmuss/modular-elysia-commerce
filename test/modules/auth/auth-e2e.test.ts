import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import {
	cleanupAuthUsers,
	createHandlerPoster,
	createOtpCapture,
	getAuthAuditEvents,
	getSessionCookie,
} from "../../helpers/auth";
import { db } from "@/core/db";
import { redis } from "@/core/redis";
import { createAuth } from "@/modules/auth";
import { AUTH_AUDIT_EVENTS } from "@/modules/auth/audit";
import { authAuditLogsTable } from "@/modules/auth/schema";

const runAuthE2E = process.env.AUTH_E2E === "1";
const describeAuthE2E = runAuthE2E ? describe : describe.skip;

const email = `auth-e2e-${Date.now()}@example.com`;
const password = "correct horse battery staple";
const resetPassword = "new correct horse battery staple";

let requestCount = 0;
let previousSessionCookie = "";

const capture = createOtpCapture();

const auth = createAuth(async (recipient, otp, type) => {
	if (recipient !== email) return;
	await capture.send(recipient, otp, type);
});

/** Better Auth is mounted at /api/auth by the Elysia auth plugin. */
const postToAuth = createHandlerPoster(
	(req) => auth.handler(req),
	"http://localhost:3000/api/auth",
);

/**
 * Every call gets a unique client IP so Better Auth session IP tracking and
 * rate limit keys stay separate per request.
 */
const request = async (
	path: string,
	body: Record<string, string> = {},
	headers?: Record<string, string>,
): Promise<Response> =>
	postToAuth({
		path,
		body,
		headers: {
			"x-forwarded-for": `192.0.2.${++requestCount}`,
			...headers,
		},
	});

const postIdToApp = (app: { handle: (request: Request) => Promise<Response> }) =>
	createHandlerPoster((req) => app.handle(req));

describeAuthE2E("auth end-to-end", () => {
	afterAll(async () => {
		await cleanupAuthUsers([email]);
	});

	it("should require verification before password login", async () => {
		const signUpResponse = await request("/sign-up/email", {
			name: "Auth E2E User",
			email,
			password,
		});

		expect(signUpResponse.status).toBe(200);
		expect(capture.latest("email-verification")).toBeUndefined();

		const sendOtpResponse = await request("/email-otp/send-verification-otp", {
			email,
			type: "email-verification",
		});

		expect(sendOtpResponse.status).toBe(200);
		expect(capture.latest("email-verification")).toMatch(/^\d+$/);

		const signInResponse = await request("/sign-in/email", {
			email,
			password,
		});

		expect(signInResponse.status).toBeGreaterThanOrEqual(400);
	});

	it("should verify email and allow password login", async () => {
		const verificationOtp = capture.latest("email-verification");
		expect(verificationOtp).toBeDefined();

		const invalidVerifyResponse = await request("/email-otp/verify-email", {
			email,
			otp: "000000",
		});

		expect(invalidVerifyResponse.status).toBeGreaterThanOrEqual(400);

		const verifyResponse = await request("/email-otp/verify-email", {
			email,
			otp: capture.requireLatest("email-verification"),
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
			otp: capture.requireLatest("email-verification"),
		});

		expect(reusedVerifyResponse.status).toBeGreaterThanOrEqual(400);
	});

	it("should sign in with a valid OTP", async () => {
		const sendOtpResponse = await request("/email-otp/send-verification-otp", {
			email,
			type: "sign-in",
		});

		expect(sendOtpResponse.status).toBe(200);
		expect(capture.latest("sign-in")).toMatch(/^\d+$/);

		const invalidSignInResponse = await request("/sign-in/email-otp", {
			email,
			otp: "000000",
		});

		expect(invalidSignInResponse.status).toBeGreaterThanOrEqual(400);

		const signInResponse = await request("/sign-in/email-otp", {
			email,
			otp: capture.requireLatest("sign-in"),
		});

		expect(signInResponse.status).toBe(200);
		expect(signInResponse.headers.get("set-cookie")).toContain(
			"better-auth.session_token",
		);
	});

	it("should reset the password and revoke previous sessions", async () => {
		const sendOtpResponse = await request("/email-otp/request-password-reset", {
			email,
		});

		expect(sendOtpResponse.status).toBe(200);
		const passwordResetOtp = capture.requireLatest("forget-password");
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
		const replacementOtp = capture.requireLatest("forget-password");
		expect(replacementOtp).not.toBe(passwordResetOtp);

		const invalidResetResponse = await request("/email-otp/reset-password", {
			email,
			otp: "000000",
			password: resetPassword,
		});

		expect(invalidResetResponse.status).toBeGreaterThanOrEqual(400);

		const resetResponse = await request("/email-otp/reset-password", {
			email,
			otp: replacementOtp,
			password: resetPassword,
		});

		expect(resetResponse.status).toBe(200);

		const reusedResetResponse = await request("/email-otp/reset-password", {
			email,
			otp: replacementOtp,
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
	});

	it("should audit password reset without storing the OTP or password", async () => {
		const auditEvents = await getAuthAuditEvents([email]);

		const events = auditEvents.map(({ event }) => event);
		expect(events).toContain(AUTH_AUDIT_EVENTS.PASSWORD_RESET);
		expect(events).toContain(AUTH_AUDIT_EVENTS.SESSION_REVOKED);
		expect(JSON.stringify(auditEvents)).not.toContain(
			capture.requireLatest("forget-password"),
		);
		expect(JSON.stringify(auditEvents)).not.toContain(resetPassword);
	});

	it("should record the reverse proxy IP on session creation", async () => {
		const auditEvents = (await getAuthAuditEvents([email])).filter(
			({ event }) => event === AUTH_AUDIT_EVENTS.SESSION_CREATED,
		);

		expect(auditEvents.length).toBeGreaterThan(0);
		expect(
			auditEvents.every(({ ipAddress }) => ipAddress?.startsWith("192.0.2.")),
		).toBe(true);
	});

	it("should enforce OTP resend cooldown through the HTTP app layer", async () => {
		const { app } = await import("@/index");
		const postToApp = postIdToApp(app);
		const unknownEmail = `missing-${Date.now()}@example.com`;
		const headers = {
			"x-forwarded-for": `198.51.100.${++requestCount}`,
		};

		const firstResponse = await postToApp({
			path: "/api/auth/email-otp/request-password-reset",
			body: { email: unknownEmail },
			headers,
		});
		const secondResponse = await postToApp({
			path: "/api/auth/email-otp/request-password-reset",
			body: { email: unknownEmail },
			headers,
		});

		expect(firstResponse.status).toBe(200);
		expect(secondResponse.status).toBe(429);

		const verificationEmail = `missing-verify-${Date.now()}@example.com`;
		const verificationResponses = await Promise.all(
			Array.from({ length: 11 }, (_, index) =>
				postToApp({
					path: "/api/auth/sign-in/email-otp",
					headers: {
						"x-forwarded-for": `203.0.113.${index + 1}`,
					},
					body: {
						email: verificationEmail,
						otp: "000000",
					},
				}),
			),
		);

		expect(
			verificationResponses[verificationResponses.length - 1]?.status,
		).toBe(429);
	});

	it("should audit OTP delivery failures without storing the OTP", async () => {
		const failureEmail = `auth-delivery-failure-${Date.now()}@example.com`;
		const previousFailureEvents = await db
			.select({ event: authAuditLogsTable.event })
			.from(authAuditLogsTable)
			.where(eq(authAuditLogsTable.event, AUTH_AUDIT_EVENTS.OTP_DELIVERY_FAILED));
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
			.where(
				eq(authAuditLogsTable.event, AUTH_AUDIT_EVENTS.OTP_DELIVERY_FAILED),
			);
		const newFailureEvents = auditEvents.slice(previousFailureEvents.length);
		const latestFailure = newFailureEvents[newFailureEvents.length - 1];

		expect(latestFailure?.metadata).toEqual({ type: "sign-in" });
		expect(JSON.stringify(latestFailure)).not.toContain(failureEmail);
	});
});
