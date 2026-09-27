import { eventBus } from "../../core/event-bus";
import { OrderService } from "./service";

const orderService = new OrderService();

eventBus.on("STOCK_RESERVED", async ({ orderId }) => {
	await orderService.updateOrderStatus(orderId, "PAID");
});

eventBus.on("STOCK_RESERVATION_FAILED", async ({ orderId, reason }) => {
	console.error(`order ${orderId} failed: ${reason}`);
	await orderService.updateOrderStatus(orderId, "FAILED");
});
