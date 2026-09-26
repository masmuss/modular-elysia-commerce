import { eq, sql } from "drizzle-orm";
import { db } from "../../core/db";
import { productsTable } from "./schema";

export class ProductService {
	constructor(private readonly database = db) {}

	async create(data: {
		name: string;
		description: string;
		price: number;
		stock: number;
		userId: number;
	}) {
		const [result] = await this.database
			.insert(productsTable)
			.values({
				name: data.name,
				description: data.description,
				price: data.price,
				stock: data.stock,
				createdByUserId: data.userId,
			})
			.$returningId();

		const [product] = await this.database
			.select()
			.from(productsTable)
			.where(eq(productsTable.id, result.id));

		return product;
	}

	async getById(id: number) {
		const [product] = await this.database
			.select()
			.from(productsTable)
			.where(eq(productsTable.id, id));

		return product;
	}

	async updateStock(id: number, qtyToReduce: number) {
		const [result] = await this.database
			.update(productsTable)
			.set({ stock: sql`${productsTable.stock} - ${qtyToReduce}` })
			.where(eq(productsTable.id, id));

		if (result.affectedRows === 0) throw new Error("product not found or insufficient stock");
	}

	async restoreStock(id: number, qtyToRestore: number) {
		const [result] = await this.database
			.update(productsTable)
			.set({ stock: sql`${productsTable.stock} + ${qtyToRestore}` })
			.where(eq(productsTable.id, id));

		if (result.affectedRows === 0) throw new Error("product not found");
	}
}
