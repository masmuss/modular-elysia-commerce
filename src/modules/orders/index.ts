import Elysia, { t } from "elysia";
import { userModule } from "../users";
import { productModule } from "../products";
import { OrderService } from "./service";

export const orderModule = new Elysia({ prefix: "/orders" })
	.use(userModule)
	.use(productModule)
	.decorate("orderService", new OrderService())
	.post(
		"/checkout",
		async ({ body, userService, productService, orderService, status }) => {
			const isUserValid = await userService.isExists(body.userId);
			if (!isUserValid) {
				return status(400, {
					status: "error",
					message: "user invalid",
				});
			}

			let totalAmount = 0;
			const validatedItems: { productId: number; quantity: number; price: number }[] = [];

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
					price: product.price,
				});
			}

			const successfullyDeductedItems: typeof validatedItems = [];

			try {
				for (const item of validatedItems) {
					await productService.updateStock(item.productId, item.quantity);
					successfullyDeductedItems.push(item);
				}

				const order = await orderService.create(
					body.userId,
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
			body: t.Object({
				userId: t.Number(),
				items: t.Array(
					t.Object({
						productId: t.Number(),
						quantity: t.Number({ minimum: 1 }),
					}),
				),
			}),
		},
	);
