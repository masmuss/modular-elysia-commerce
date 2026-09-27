import Elysia, { t } from "elysia";
import { createInsertSchema } from "drizzle-typebox";
import { getSession } from "@/plugins/auth";
import { orderItemsTable } from "./schema";
import { productModule } from "@/modules/products";
import { OrderService } from "./service";
import { CheckoutItem } from "./types";
import { registerOrderListeners } from "./listeners";

const { id, orderId, priceAtTimeOfOrder, ...checkoutColumns } =
	createInsertSchema(orderItemsTable).properties;

const checkoutItemSchema = t.Object(checkoutColumns);

const checkoutBody = t.Object({
	items: t.Array(checkoutItemSchema, { minItems: 1 }),
});

const orderService = new OrderService();
registerOrderListeners(orderService);

export const orderModule = new Elysia({ prefix: "/orders" })
	.use(productModule)
	.decorate("orderService", orderService)
	.post(
		"/checkout",
		async ({ body, productService, orderService, request, status }) => {
			const session = await getSession(request.headers);
			if (!session)
				return status(401, { status: "error", message: "unauthorized" });

			const user = session.user;
			let totalAmount = 0;
			const itemsWithPrice: CheckoutItem[] = [];

			for (const item of body.items) {
				const product = await productService.getById(item.productId);

				if (!product)
					return status(400, {
						status: "error",
						message: `product ${item.productId} not found`,
					});

				totalAmount += product.price * item.quantity;

				itemsWithPrice.push({
					productId: product.id,
					quantity: item.quantity,
					priceAtTimeOfOrder: product.price,
				});
			}

			const order = await orderService.createPendingOrder(
				{ id: user.id, name: user.name, email: user.email },
				itemsWithPrice,
				totalAmount,
			);

			return status(202, {
				status: "processing",
				message: "order is being processed",
				data: order,
			});
		},
		{
			body: checkoutBody,
		},
	);
