import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { errorResponse } from "@/plugins/error";

const buildApp = () =>
	new Elysia().use(
		rateLimit({
			duration: 60_000,
			max: 2,
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
});
