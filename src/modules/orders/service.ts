import { eq } from "drizzle-orm";
import { eventBus } from "@/core/event-bus";
import { BaseService } from "@/core/service";
import { orderItemsTable, ordersTable } from "./schema";
import { CheckoutItem, Order } from "./types";

export class OrderService extends BaseService {
	async createPendingOrder(
		user: { id: string; name: string; email: string },
		items: CheckoutItem[],
		totalAmount: number,
	): Promise<Order> {
		const orderId = await this.database.transaction(async (tx) => {
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

			return order.id;
		});

		const [created] = await this.database
			.select()
			.from(ordersTable)
			.where(eq(ordersTable.id, orderId));

		eventBus.emit("ORDER_CREATE_PENDING", { orderId, user, items });

		return created;
	}

	async updateOrderStatus(
		orderId: number,
		status: "PAID" | "FAILED",
	): Promise<void> {
		const [result] = await this.database
			.update(ordersTable)
			.set({ status })
			.where(eq(ordersTable.id, orderId));

		if (result.affectedRows === 0)
			throw new Error(`order ${orderId} not found`);
	}
}
