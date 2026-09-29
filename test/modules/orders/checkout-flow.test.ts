import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eventBus } from "@/core/event-bus";
import { registerOrderListeners } from "@/modules/orders/listeners";
import { ordersTable } from "@/modules/orders/schema";
import { OrderService } from "@/modules/orders/service";
import { registerProductListeners } from "@/modules/products/listeners";
import { productsTable } from "@/modules/products/schema";
import { ProductService } from "@/modules/products/service";

const flush = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

type FakeDbOptions = {
	stockAffectedRows: number;
};

const makeFlowDb = (options: FakeDbOptions, orderUpdates: { status: string }[]) => {
	const tx = {
		insert: (table: unknown) => ({
			values: (_values: unknown) => {
				if (table === ordersTable)
					return { $returningId: async () => [{ id: 1 }] };
				return Promise.resolve([]);
			},
		}),
		update: (table: unknown) => ({
			set: (values: { status?: string }) => ({
				where: async (_condition: unknown) => {
					if (table === productsTable)
						return [{ affectedRows: options.stockAffectedRows }];
					if (table === ordersTable) {
						orderUpdates.push({ status: values.status ?? "UNKNOWN" });
						return [{ affectedRows: 1 }];
					}
					return [{ affectedRows: 1 }];
				},
			}),
		}),
	};
	return {
		transaction: (cb: (tx: unknown) => Promise<number>) => cb(tx),
		select: () => ({
			from: (table: unknown) => ({
				where: async (_condition: unknown) => {
					if (table === ordersTable)
						return [{ id: 1, status: "PENDING", totalAmount: 200 }];
					if (table === productsTable)
						return [{ id: 1, price: 100, stock: 10 }];
					return [];
				},
			}),
		}),
		update: tx.update,
	};
};

const setup = (options: FakeDbOptions) => {
	const orderUpdates: { status: string }[] = [];
	const db = makeFlowDb(options, orderUpdates) as never;
	const orderService = new OrderService(db);
	const productService = new ProductService(db);
	registerOrderListeners(orderService);
	registerProductListeners(productService);
	return { orderService, orderUpdates };
};

beforeEach(() => {
	eventBus.removeAllListeners();
});

afterEach(() => {
	eventBus.removeAllListeners();
});

describe("checkout flow", () => {
	it("should transition order from PENDING to PAID when stock is available", async () => {
		const { orderService, orderUpdates } = setup({ stockAffectedRows: 1 });

		const order = await orderService.createPendingOrder(
			{ id: "u1", name: "A", email: "a@x.com" },
			[{ productId: 1, quantity: 2, priceAtTimeOfOrder: 100 }],
			200,
		);

		expect(order.status).toBe("PENDING");
		await flush();
		expect(orderUpdates).toEqual([{ status: "PAID" }]);
	});

	it("should transition order from PENDING to FAILED when stock is insufficient", async () => {
		const { orderService, orderUpdates } = setup({ stockAffectedRows: 0 });

		await orderService.createPendingOrder(
			{ id: "u1", name: "A", email: "a@x.com" },
			[{ productId: 1, quantity: 99, priceAtTimeOfOrder: 100 }],
			9900,
		);

		await flush();
		expect(orderUpdates).toEqual([{ status: "FAILED" }]);
	});
});
