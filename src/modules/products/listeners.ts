import { eventBus } from "@/core/event-bus";
import type { ProductService } from "./service";

export const registerProductListeners = (
	productService: ProductService,
): void => {
	eventBus.on("ORDER_CREATE_PENDING", async (payload) => {
		try {
			await productService.reserveStock(payload.items);

			eventBus.emit("STOCK_RESERVED", { orderId: payload.orderId });
		} catch (error: unknown) {
			eventBus.emit("STOCK_RESERVATION_FAILED", {
				orderId: payload.orderId,
				reason: error instanceof Error ? error.message : String(error),
			});
		}
	});
};
