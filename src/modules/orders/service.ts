import { db } from "../../core/db";
import { User } from "../users/types";
import { orderItemsTable, ordersTable } from "./schema";
import { CheckoutItem } from "./types";

export class OrderService {
	constructor(private readonly database = db) {}

	async create(user: User, items: CheckoutItem[], totalAmount: number) {
		return await this.database.transaction(async (tx) => {
			const [order] = await tx
				.insert(ordersTable)
				.values({
					snapShotUserName: user.name,
					snapshotUserEmail: user.email,
					userId: user.id,
					totalAmount,
					status: "PENDING",
				})
				.$returningId();

			await tx
				.insert(orderItemsTable)
				.values(items.map((item) => ({ ...item, orderId: order.id })));

			return order;
		});
	}
}
