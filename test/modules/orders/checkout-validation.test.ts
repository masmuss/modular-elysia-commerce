import { describe, expect, it } from "bun:test";
import { Elysia, t } from "elysia";

const checkoutBody = t.Object({
	items: t.Array(
		t.Object({
			productId: t.Number(),
			quantity: t.Number(),
		}),
		{ minItems: 1 },
	),
});

const app = new Elysia().post("/checkout", ({ body }) => body, {
	body: checkoutBody,
});

const postCheckout = (payload: unknown) =>
	app.handle(
		new Request("http://localhost/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}),
	);

describe("checkout validation", () => {
	it("should reject empty items with 422", async () => {
		const res = await postCheckout({ items: [] });
		expect(res.status).toBe(422);
	});

	it("should accept valid items with 200", async () => {
		const res = await postCheckout({
			items: [{ productId: 1, quantity: 2 }],
		});
		expect(res.status).toBe(200);
	});
});
