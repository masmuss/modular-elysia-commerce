import { eventBus } from "@/core/event-bus";
import { ProductService } from "./service";

const productService = new ProductService();

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
