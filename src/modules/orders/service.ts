import { eq } from "drizzle-orm";
import { db } from "../../core/db";
import { eventBus, type AppEvents } from "../../core/event-bus";
import { User } from "../users/types";
import { orderItemsTable, ordersTable } from "./schema";
import { CheckoutItem } from "./types";

export class OrderService {
	constructor(private readonly database = db) {}

	async createPendingOrder(
		user: User,
		items: CheckoutItem[],
		totalAmount: number,
	) {
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

			await tx.insert(orderItemsTable).values(
				items.map((item) => ({
					orderId: order.id,
					...item,
				})),
			);

			eventBus.emit("ORDER_CREATE_PENDING", { orderId: order.id, user, items });
		});
	}

	async updateOrderStatus(orderId: number, status: "PAID" | "FAILED") {
		await this.database
			.update(ordersTable)
			.set({ status })
			.where(eq(ordersTable.id, orderId));
	}
}
