import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eventBus } from "@/core/event-bus";
import { registerOrderListeners } from "@/modules/orders/listeners";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

beforeEach(() => {
	eventBus.removeAllListeners();
});

afterEach(() => {
	eventBus.removeAllListeners();
});

describe("order listeners", () => {
	it("should mark order as PAID when stock is reserved", async () => {
		const calls: { orderId: number; status: string }[] = [];
		registerOrderListeners({
			updateOrderStatus: async (orderId: number, status: "PAID" | "FAILED") => {
				calls.push({ orderId, status });
			},
		} as never);

		eventBus.emit("STOCK_RESERVED", { orderId: 1 });
		await flush();

		expect(calls).toEqual([{ orderId: 1, status: "PAID" }]);
	});

	it("should mark order as FAILED when reservation fails", async () => {
		const calls: { orderId: number; status: string }[] = [];
		registerOrderListeners({
			updateOrderStatus: async (orderId: number, status: "PAID" | "FAILED") => {
				calls.push({ orderId, status });
			},
		} as never);

		eventBus.emit("STOCK_RESERVATION_FAILED", {
			orderId: 2,
			reason: "out of stock",
		});
		await flush();

		expect(calls).toEqual([{ orderId: 2, status: "FAILED" }]);
	});
});
