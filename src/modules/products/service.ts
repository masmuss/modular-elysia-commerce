import { and, eq, gte, sql } from "drizzle-orm";
import { BaseService } from "@/core/service";
import { productsTable } from "./schema";
import { CreateProduct, Product } from "./types";

export class ProductService extends BaseService {
	async create(data: CreateProduct): Promise<Product> {
		const [result] = await this.database
			.insert(productsTable)
			.values(data)
			.$returningId();

		const [product] = await this.database
			.select()
			.from(productsTable)
			.where(eq(productsTable.id, result.id));

		return product;
	}

	async getById(id: number): Promise<Product> {
		const [product] = await this.database
			.select()
			.from(productsTable)
			.where(eq(productsTable.id, id));

		return product;
	}

	async reserveStock(items: { productId: number; quantity: number }[]): Promise<void> {
		await this.database.transaction(async (tx) => {
			for (const item of items) {
				const [result] = await tx
					.update(productsTable)
					.set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
					.where(
						and(
							eq(productsTable.id, item.productId),
							gte(productsTable.stock, item.quantity),
						),
					);

				if (result.affectedRows === 0)
					throw new Error(`insufficient stock for product ${item.productId}`);
			}
		});
	}

	async restoreStock(id: number, qtyToRestore: number): Promise<void> {
		const [result] = await this.database
			.update(productsTable)
			.set({ stock: sql`${productsTable.stock} + ${qtyToRestore}` })
			.where(eq(productsTable.id, id));

		if (result.affectedRows === 0) throw new Error("product not found");
	}
}
