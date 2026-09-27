import { EventEmitter } from "node:events";
import { CheckoutItem } from "@/modules/orders/types";
import { User } from "@/modules/users/types";

export type AppEvents = {
	ORDER_CREATE_PENDING: {
		orderId: number;
		user: User;
		items: Omit<CheckoutItem, "priceAtTimeOfOrder">[];
	};
	STOCK_RESERVED: { orderId: number };
	STOCK_RESERVATION_FAILED: { orderId: number; reason: string };
};

class TypedEventBus extends EventEmitter {
	emit<K extends keyof AppEvents>(
		eventName: K,
		payload: AppEvents[K],
	): boolean {
		return super.emit(eventName, payload);
	}

	on<K extends keyof AppEvents>(
		eventName: K,
		listener: (payload: AppEvents[K]) => void,
	): this {
		return super.on(eventName, listener);
	}
}

export const eventBus = new TypedEventBus();
