import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { errorResponse } from "@/plugins/error";
import {
	NO_CLIENT_IP_KEY,
	trustedProxyKeyGenerator,
} from "@/plugins/rate-limit";

const buildApp = () =>
	new Elysia().use(
		rateLimit({
			duration: 60_000,
			max: 2,
			generator: trustedProxyKeyGenerator,
			errorResponse: new Response(
				JSON.stringify({ status: "error", message: "too many requests" }),
				{ status: 429, headers: { "Content-Type": "application/json" } },
			),
		}),
	).get("/ping", () => ({ status: "ok" as const }));

describe("rate limit", () => {
	it("should allow requests under the limit", async () => {
		const app = buildApp();
		const first = await app.handle(new Request("http://localhost/ping"));
		const second = await app.handle(new Request("http://localhost/ping"));
		expect(first.status).toBe(200);
		expect(second.status).toBe(200);
	});

	it("should return 429 matching the error contract when exceeded", async () => {
		const app = buildApp();
		await app.handle(new Request("http://localhost/ping"));
		await app.handle(new Request("http://localhost/ping"));
		const limited = await app.handle(new Request("http://localhost/ping"));

		expect(limited.status).toBe(429);
		const body = await limited.json();
		expect(body).toEqual({ status: "error", message: "too many requests" });
		expect(Value.Check(errorResponse, body)).toBe(true);
	});

	it("should key by proxy headers without console warnings", async () => {
		const warnings: unknown[] = [];
		const originalWarn = console.warn;
		console.warn = ((...args: unknown[]) => {
			warnings.push(...args);
		}) as typeof console.warn;

		try {
			const app = new Elysia().use(
				rateLimit({
					duration: 60_000,
					max: 1,
					generator: trustedProxyKeyGenerator,
					errorResponse: new Response(
						JSON.stringify({ status: "error", message: "too many requests" }),
						{ status: 429, headers: { "Content-Type": "application/json" } },
					),
				}),
			).get("/ping", () => ({ status: "ok" as const }));

			const forwarded = new Request("http://localhost/ping", {
				headers: { "x-forwarded-for": "203.0.113.9, 70.41.3.18" },
			});
			const realIp = new Request("http://localhost/ping", {
				headers: { "x-real-ip": "198.18.0.5" },
			});
			const direct = new Request("http://localhost/ping");

			expect(await app.handle(forwarded)).toHaveProperty("status", 200);
			expect(await app.handle(forwarded)).toHaveProperty("status", 429);
			expect(await app.handle(realIp)).toHaveProperty("status", 200);
			expect(await app.handle(direct)).toHaveProperty("status", 200);
			expect(await app.handle(direct)).toHaveProperty("status", 429);
			expect(warnings).toEqual([]);
		} finally {
			console.warn = originalWarn;
		}
	});

	it("should fall back to a shared key when no client IP is available", () => {
		expect(
			trustedProxyKeyGenerator(new Request("http://localhost/ping")),
		).toBe(NO_CLIENT_IP_KEY);
		expect(
			trustedProxyKeyGenerator(
				new Request("http://localhost/ping", {
					headers: { "x-forwarded-for": "203.0.113.10" },
				}),
			),
		).toBe("203.0.113.10");
		expect(
			trustedProxyKeyGenerator(
				new Request("http://localhost/ping", {
					headers: { "x-real-ip": "198.18.0.7" },
				}),
			),
		).toBe("198.18.0.7");
	});
});
