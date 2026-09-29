import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eventBus } from "@/core/event-bus";
import { registerProductListeners } from "@/modules/products/listeners";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

beforeEach(() => {
	eventBus.removeAllListeners();
});

afterEach(() => {
	eventBus.removeAllListeners();
});

describe("product listeners", () => {
	it("should emit STOCK_RESERVED when reserve succeeds", async () => {
		let reserved: unknown;
		registerProductListeners({
			reserveStock: async (items: unknown) => {
				reserved = items;
			},
		} as never);

		const emitted: { event: string; payload: unknown }[] = [];
		eventBus.on("STOCK_RESERVED", (payload) =>
			emitted.push({ event: "STOCK_RESERVED", payload }),
		);

		eventBus.emit("ORDER_CREATE_PENDING", {
			orderId: 1,
			user: { id: "u1", name: "A", email: "a@x.com" },
			items: [{ productId: 1, quantity: 2 }],
		});
		await flush();

		expect(reserved).toEqual([{ productId: 1, quantity: 2 }]);
		expect(emitted).toEqual([
			{ event: "STOCK_RESERVED", payload: { orderId: 1 } },
		]);
	});

	it("should emit STOCK_RESERVATION_FAILED when reserve throws", async () => {
		registerProductListeners({
			reserveStock: async () => {
				throw new Error("out of stock");
			},
		} as never);

		const emitted: { event: string; payload: unknown }[] = [];
		eventBus.on("STOCK_RESERVATION_FAILED", (payload) =>
			emitted.push({ event: "STOCK_RESERVATION_FAILED", payload }),
		);

		eventBus.emit("ORDER_CREATE_PENDING", {
			orderId: 2,
			user: { id: "u1", name: "A", email: "a@x.com" },
			items: [{ productId: 1, quantity: 99 }],
		});
		await flush();

		expect(emitted).toEqual([
			{
				event: "STOCK_RESERVATION_FAILED",
				payload: { orderId: 2, reason: "out of stock" },
			},
		]);
	});
});
