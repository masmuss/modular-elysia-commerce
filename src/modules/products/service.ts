import { eq } from "drizzle-orm";
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
		const [product] = await this.database
			.insert(productsTable)
			.values({
				...data,
				createdByUserId: data.userId,
			})
			.returning();

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
		const product = await this.getById(id);
		if (!product) throw new Error("product not found");
		if (product.stock < qtyToReduce) throw new Error("insufficient stock");

		const [updatedProduct] = await this.database
			.update(productsTable)
			.set({ stock: product.stock - qtyToReduce })
			.where(eq(productsTable.id, id))
			.returning();

		return updatedProduct;
	}
}
