import { db } from "../../core/db";
import { orderItemsTable, ordersTable } from "./schema";
import { CheckoutItem } from "./types";

export class OrderService {
	constructor(private readonly database = db) {}

	async create(userId: number, items: CheckoutItem[], totalAmount: number) {
		return await this.database.transaction(async (tx) => {
			const [order] = await tx
				.insert(ordersTable)
				.values({
					userId,
					totalAmount,
					status: "PAID",
				})
				.$returningId();

			await tx.insert(orderItemsTable).values(
				items.map((item) => ({ ...item, orderId: order.id })),
			);

			return order;
		});
	}
}
