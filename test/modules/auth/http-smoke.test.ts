import { describe, expect, it } from "bun:test";

const runHttpSmoke = process.env.AUTH_HTTP_E2E === "1";
const describeHttpSmoke = runHttpSmoke ? describe : describe.skip;
const baseUrl = process.env.AUTH_HTTP_BASE_URL ?? "http://localhost:3000";

const postJson = async (
	path: string,
	body: Record<string, unknown>,
	headers?: Record<string, string>,
): Promise<Response> =>
	fetch(`${baseUrl}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		body: JSON.stringify(body),
	});

describeHttpSmoke("auth HTTP smoke", () => {
	it("should expose a healthy HTTP service", async () => {
		const response = await fetch(`${baseUrl}/health`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	it("should reject malformed password sign-in through the mounted route", async () => {
		const response = await postJson("/api/auth/sign-in/email", {
			email: "not-an-email",
			password: "",
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.headers.get("content-type")).toContain("application/json");
	});

	it("should return a safe success response for an unknown reset email", async () => {
		const email = `http-smoke-${Date.now()}@example.com`;
		const response = await postJson(
			"/api/auth/email-otp/request-password-reset",
			{ email },
			{ "x-forwarded-for": "198.51.100.240" },
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
	});

	it("should enforce OTP resend cooldown over the real HTTP server", async () => {
		const email = `http-cooldown-${Date.now()}@example.com`;
		const headers = { "x-forwarded-for": "198.51.100.241" };

		const firstResponse = await postJson(
			"/api/auth/email-otp/request-password-reset",
			{ email },
			headers,
		);
		const secondResponse = await postJson(
			"/api/auth/email-otp/request-password-reset",
			{ email },
			headers,
		);

		expect(firstResponse.status).toBe(200);
		expect(secondResponse.status).toBe(429);
	});
});
