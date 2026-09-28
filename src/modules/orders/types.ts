import type { orderItemsTable, ordersTable } from "./schema";

export type Order = typeof ordersTable.$inferSelect;
export type CreateOrder = typeof ordersTable.$inferInsert;

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type CreateOrderItem = typeof orderItemsTable.$inferInsert;

export type CheckoutItem = Pick<
	CreateOrderItem,
	"productId" | "quantity" | "priceAtTimeOfOrder"
>;
