import { describe, expect, it } from "bun:test";
import { getBaseHttpUrl, postJson } from "../../helpers/auth";

const runHttpSmoke = process.env.AUTH_HTTP_E2E === "1";
const describeHttpSmoke = runHttpSmoke ? describe : describe.skip;
const baseUrl = getBaseHttpUrl();

/**
 * Per-run proxy IPs so re-runs inside rate-limit windows never collide with
 * buckets left over from earlier runs.
 */
const proxyIp = (offset: number): string =>
	`198.51.100.${(Date.now() + offset) % 250 || 1}`;

describeHttpSmoke("auth HTTP smoke", () => {
	it("should expose a healthy HTTP service", async () => {
		const response = await fetch(`${baseUrl}/health`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	it("should reject malformed password sign-in through the mounted route", async () => {
		const response = await postJson({
			path: "/api/auth/sign-in/email",
			body: {
				email: "not-an-email",
				password: "",
			},
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.headers.get("content-type")).toContain("application/json");
	});

	it("should reject unauthenticated session lookups", async () => {
		const response = await postJson({ path: "/api/auth/get-session" });

		expect(response.status).toBeGreaterThanOrEqual(400);
	});

	it("should return a safe success response for an unknown reset email", async () => {
		const email = `http-smoke-${Date.now()}@example.com`;
		const response = await postJson({
			path: "/api/auth/email-otp/request-password-reset",
			body: { email },
			headers: { "x-forwarded-for": proxyIp(-250) },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
	});

	it("should enforce OTP resend cooldown over the real HTTP server", async () => {
		const email = `http-cooldown-${Date.now()}@example.com`;
		const headers = { "x-forwarded-for": proxyIp(-240) };

		const firstResponse = await postJson({
			path: "/api/auth/email-otp/request-password-reset",
			body: { email },
			headers,
		});
		const secondResponse = await postJson({
			path: "/api/auth/email-otp/request-password-reset",
			body: { email },
			headers,
		});

		expect(firstResponse.status).toBe(200);
		expect(secondResponse.status).toBe(429);
	});

	it("should rate limit OTP sign-in per proxy IP", async () => {
		const limitedIp = proxyIp(-230);

		let gotLimited = false;
		for (let attempt = 0; !gotLimited && attempt < 10; attempt++) {
			const response = await postJson({
				path: "/api/auth/sign-in/email-otp",
				body: {
					email: `http-proxy-${Date.now()}-${attempt}@example.com`,
					otp: "000000",
				},
				headers: { "x-forwarded-for": limitedIp },
			});

			if (response.status === 429) {
				gotLimited = true;
			} else {
				expect(response.status).toBeGreaterThanOrEqual(400);
			}
		}
		expect(gotLimited).toBe(true);

		const freshIpResponse = await postJson({
			path: "/api/auth/sign-in/email-otp",
			body: {
				email: `http-proxy-fresh-${Date.now()}@example.com`,
				otp: "000000",
			},
			headers: { "x-forwarded-for": proxyIp(-200) },
		});

		expect(freshIpResponse.status).toBeGreaterThanOrEqual(400);
		expect(freshIpResponse.status).not.toBe(429);
	});

	it("should fall back to x-real-ip when no x-forwarded-for is present", async () => {
		const response = await postJson({
			path: "/api/auth/sign-in/email-otp",
			body: {
				email: `http-real-ip-${Date.now()}@example.com`,
				otp: "000000",
			},
			headers: { "x-real-ip": proxyIp(-220) },
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.status).not.toBe(429);
	});
});
