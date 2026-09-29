import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import { productService } from "@/modules/products";
import { iamMacro } from "@/plugins/iam";
import { orderItemsTable } from "./schema";
import { OrderService } from "./service";
import type { CheckoutItem } from "./types";

const { id, orderId, priceAtTimeOfOrder, ...checkoutColumns } =
	createInsertSchema(orderItemsTable).properties;

const checkoutItemSchema = t.Object(checkoutColumns);

const checkoutBody = t.Object({
	items: t.Array(checkoutItemSchema, { minItems: 1 }),
});

const errorResponse = t.Object({
	status: t.Literal("error"),
	message: t.String(),
});

const checkoutResponse = t.Object({
	status: t.Literal("processing"),
	message: t.String(),
	data: t.Object(
		{
			id: t.Number(),
		},
		{ additionalProperties: true },
	),
});

export const orderService = new OrderService();

export const orderModule = new Elysia({ prefix: "/orders" })
	.use(iamMacro)
	.decorate("productService", productService)
	.decorate("orderService", orderService)
	.post(
		"/checkout",
		async ({ body, productService, orderService, user, status }) => {
			const productIds = body.items.map((item) => item.productId);
			const products = await productService.getByIds(productIds);
			const productById = new Map(products.map((p) => [p.id, p]));

			let totalAmount = 0;
			const itemsWithPrice: CheckoutItem[] = [];

			for (const item of body.items) {
				const product = productById.get(item.productId);

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
			isAuth: true,
			response: {
				202: checkoutResponse,
				400: errorResponse,
				401: errorResponse,
			},
		},
	);
