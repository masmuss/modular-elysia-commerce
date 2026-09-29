import { describe, expect, it } from "bun:test";
import { buildCheckoutPayload } from "@/modules/orders/checkout";

describe("buildCheckoutPayload", () => {
	it("should calculate total amount and snapshot prices", () => {
		const result = buildCheckoutPayload(
			[
				{ productId: 1, quantity: 2 },
				{ productId: 2, quantity: 1 },
			],
			[
				{ id: 1, price: 100 },
				{ id: 2, price: 50 },
			],
		);

		expect(result.totalAmount).toBe(250);
		expect(result.itemsWithPrice).toEqual([
			{ productId: 1, quantity: 2, priceAtTimeOfOrder: 100 },
			{ productId: 2, quantity: 1, priceAtTimeOfOrder: 50 },
		]);
	});

	it("should throw when product is missing", () => {
		expect(() =>
			buildCheckoutPayload([{ productId: 9, quantity: 1 }], []),
		).toThrow("product 9 not found");
	});
});
