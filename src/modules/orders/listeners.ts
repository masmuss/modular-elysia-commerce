import { eventBus } from "@/core/event-bus";
import { logger, withOrderId } from "@/core/logger";
import type { OrderService } from "./service";

export const registerOrderListeners = (orderService: OrderService): void => {
	eventBus.on("STOCK_RESERVED", async ({ orderId }) => {
		try {
			await orderService.updateOrderStatus(orderId, "PAID");
		} catch (error: unknown) {
			withOrderId(orderId).error(
				{ err: error },
				"failed to mark order as paid",
			);
		}
	});

	eventBus.on("STOCK_RESERVATION_FAILED", async ({ orderId, reason }) => {
		logger.warn({ orderId, reason }, "stock reservation failed");

		try {
			await orderService.updateOrderStatus(orderId, "FAILED");
		} catch (error: unknown) {
			withOrderId(orderId).error(
				{ err: error },
				"failed to mark order as failed",
			);
		}
	});
};
