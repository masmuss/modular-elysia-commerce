import Elysia, { t } from "elysia";
import { userModule } from "../users";
import { CheckoutItem } from "./types";
import { createInsertSchema } from "drizzle-typebox";
import { orderItemsTable } from "./schema";
import { productModule } from "../products";
import { OrderService } from "./service";
import "./listeners";

const { id, orderId, priceAtTimeOfOrder, ...checkoutColumns } =
	createInsertSchema(orderItemsTable).properties;

const checkoutItemSchema = t.Object(checkoutColumns);

const checkoutBody = t.Object({
	userId: t.String({ format: "uuid" }),
	items: t.Array(checkoutItemSchema, { minItems: 1 }),
});

export const orderModule = new Elysia({ prefix: "/orders" })
	.use(userModule)
	.use(productModule)
	.decorate("orderService", new OrderService())
	.post(
		"/checkout",
		async ({ body, userService, productService, orderService, status }) => {
			const user = await userService.findById(body.userId);
			if (!user) {
				return status(400, {
					status: "error",
					message: "user invalid",
				});
			}

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
				user,
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
