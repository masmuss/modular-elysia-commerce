import { db } from "../../core/db";
import { orderItemsTable, ordersTable } from "./schema";

export class OrderService {
	constructor(private readonly database = db) {}

	async create(
		userId: number,
		items: { productId: number; quantity: number; price: number }[],
		totalAmount: number,
	) {
		return await this.database.transaction(async (tx) => {
			const [order] = await tx
				.insert(ordersTable)
				.values({
					userId,
					totalAmount,
					status: "PAID",
				})
				.$returningId();

			const orderItemsData = items.map((item) => ({
				orderId: order.id,
				productId: item.productId,
				quantity: item.quantity,
				priceAtTimeOfOrder: item.price,
			}));

			tx.insert(orderItemsTable).values(orderItemsData);

			return order;
		});
	}
}
