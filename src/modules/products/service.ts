import { eq, sql } from "drizzle-orm";
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

	async updateStock(id: number, qtyToReduce: number): Promise<void> {
		const [result] = await this.database
			.update(productsTable)
			.set({ stock: sql`${productsTable.stock} - ${qtyToReduce}` })
			.where(eq(productsTable.id, id));

		if (result.affectedRows === 0)
			throw new Error("product not found or insufficient stock");
	}

	async restoreStock(id: number, qtyToRestore: number): Promise<void> {
		const [result] = await this.database
			.update(productsTable)
			.set({ stock: sql`${productsTable.stock} + ${qtyToRestore}` })
			.where(eq(productsTable.id, id));

		if (result.affectedRows === 0) throw new Error("product not found");
	}
}
