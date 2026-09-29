import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import { productService } from "@/modules/products";
import { iamMacro } from "@/plugins/iam";
import { buildCheckoutPayload } from "./checkout";
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

			let itemsWithPrice: CheckoutItem[];
			let totalAmount: number;
			try {
				const payload = buildCheckoutPayload(body.items, products);
				itemsWithPrice = payload.itemsWithPrice;
				totalAmount = payload.totalAmount;
			} catch (error) {
				return status(400, {
					status: "error",
					message: error instanceof Error ? error.message : "bad request",
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
				403: errorResponse,
				404: errorResponse,
			},
			detail: {
				summary: "Checkout cart into pending order",
				description:
					"Bulk-fetch products once, snapshot prices, create PENDING order, emit ORDER_CREATE_PENDING for async stock reservation.",
				tags: ["Orders"],
			},
		},
	);
