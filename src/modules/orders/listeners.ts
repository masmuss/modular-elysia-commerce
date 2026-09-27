import { eventBus } from "@/core/event-bus";
import { OrderService } from "./service";

export const registerOrderListeners = (orderService: OrderService): void => {
	eventBus.on("STOCK_RESERVED", async ({ orderId }) => {
		try {
			await orderService.updateOrderStatus(orderId, "PAID");
		} catch (error: unknown) {
			console.error(
				`failed to mark order ${orderId} as paid: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	});

	eventBus.on("STOCK_RESERVATION_FAILED", async ({ orderId, reason }) => {
		console.error(`order ${orderId} failed: ${reason}`);

		try {
			await orderService.updateOrderStatus(orderId, "FAILED");
		} catch (error: unknown) {
			console.error(
				`failed to mark order ${orderId} as failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	});
};
