import Elysia, { t } from "elysia";
import { userModule } from "../users";
import { productModule } from "../products";
import { OrderService } from "./service";
import { CheckoutItem } from "./types";
import { createInsertSchema } from "drizzle-typebox";
import { orderItemsTable } from "./schema";
import { User } from "../users/types";

const { id, orderId, priceAtTimeOfOrder, ...checkoutColumns } =
	createInsertSchema(orderItemsTable).properties;

const checkoutItemSchema = t.Object(checkoutColumns);

const checkoutBody = t.Object({
	userId: t.Number(),
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
			const validatedItems: CheckoutItem[] = [];

			for (const item of body.items) {
				const product = await productService.getById(item.productId);

				if (!product)
					return status(400, {
						status: "error",
						message: `product ${item.productId} not found`,
					});

				if (product.stock < item.quantity)
					return status(400, {
						status: "error",
						message: `insufficient stock for ${product.name}`,
					});

				totalAmount += product.price * item.quantity;

				validatedItems.push({
					productId: product.id,
					quantity: item.quantity,
					priceAtTimeOfOrder: product.price,
				});
			}

			const successfullyDeductedItems: CheckoutItem[] = [];

			try {
				for (const item of validatedItems) {
					await productService.updateStock(item.productId, item.quantity);
					successfullyDeductedItems.push(item);
				}

				const order = await orderService.create(
					user,
					validatedItems,
					totalAmount,
				);

				return status(200, {
					status: "success",
					data: order,
				});
			} catch (e) {
				console.error("checkout failed mid-process:", e);

				for (const item of successfullyDeductedItems) {
					try {
						await productService.restoreStock(item.productId, item.quantity);
						console.log(`restored stock for ${item.productId}`);
					} catch (rollbackError) {
						console.error(
							`CRITICAL: rollback failed for ${item.productId}`,
							rollbackError,
						);
					}
				}

				return status(500, {
					status: "error",
					message: "checkout failed, system rolled back safely",
				});
			}
		},
		{
			body: checkoutBody,
		},
	);
