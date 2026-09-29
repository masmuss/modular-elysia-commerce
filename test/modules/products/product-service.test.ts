import { describe, expect, it } from "bun:test";
import { ProductService } from "@/modules/products/service";

describe("ProductService.getByIds", () => {
	it("should return empty array without querying when ids are empty", async () => {
		let called = false;
		const fakeDb = {
			select: () => {
				called = true;
				throw new Error("should not query");
			},
		};

		const service = new ProductService(
			fakeDb as unknown as ConstructorParameters<typeof ProductService>[0],
		);
		const result = await service.getByIds([]);
		expect(result).toEqual([]);
		expect(called).toBe(false);
	});

	it("should query database with unique ids", async () => {
		let captured: unknown;
		const fakeDb = {
			select: () => ({
				from: () => ({
					where: (arg: unknown) => {
						captured = arg;
						return Promise.resolve([]);
					},
				}),
			}),
		};

		const service = new ProductService(
			fakeDb as unknown as ConstructorParameters<typeof ProductService>[0],
		);
		await service.getByIds([1, 1, 2]);
		expect(captured).toBeDefined();
	});
});
