import { describe, expect, it } from "bun:test";
import { ProductService } from "@/modules/products/service";

const makeTxDb = (affectedRowsSequence: number[]) => {
	const queue = [...affectedRowsSequence];
	const tx = {
		update: () => ({
			set: () => ({
				where: () => {
					const affectedRows = queue.shift() ?? 1;
					return Promise.resolve([{ affectedRows }]);
				},
			}),
		}),
	};
	return {
		transaction: (cb: (tx: unknown) => Promise<void>) => cb(tx),
	};
};

const makeService = (sequence: number[]) =>
	new ProductService(
		makeTxDb(sequence) as unknown as ConstructorParameters<
			typeof ProductService
		>[0],
	);

describe("ProductService.reserveStock", () => {
	it("should resolve when all items have stock", async () => {
		const service = makeService([1, 1]);
		await expect(
			service.reserveStock([
				{ productId: 1, quantity: 2 },
				{ productId: 2, quantity: 1 },
			]),
		).resolves.toBeUndefined();
	});

	it("should throw when stock is insufficient", async () => {
		const service = makeService([0]);
		await expect(
			service.reserveStock([{ productId: 1, quantity: 99 }]),
		).rejects.toThrow("insufficient stock for product 1");
	});
});
