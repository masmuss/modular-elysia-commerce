import { afterAll, describe, expect, it } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/core/db";
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

const auth = createAuth(async (recipient, otp) => {
	if (recipient === email) verificationOtp = otp;
});

const request = async (
	path: string,
	body: Record<string, string>,
	headers?: Record<string, string>,
): Promise<Response> =>
	auth.handler(
		new Request(`http://localhost:3000/api/auth${path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: JSON.stringify(body),
		}),
	);

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

		const reusedVerifyResponse = await request("/email-otp/verify-email", {
			email,
			otp: verificationOtp,
		});

		expect(reusedVerifyResponse.status).toBeGreaterThanOrEqual(400);
	});
});
