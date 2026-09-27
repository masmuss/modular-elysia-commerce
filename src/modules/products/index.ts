import Elysia, { t } from "elysia";
import { userModule } from "../users";
import { ProductService } from "./service";
import { User } from "../users/types";
import { Product } from "./types";

export const productModule = new Elysia({ prefix: "/products" })
	.use(userModule)
	.decorate("productService", new ProductService())
	.post(
		"/",
		async ({ body, productService, userService, status }) => {
			const isUserValid: User = await userService.findById(body.userId);

			if (!isUserValid) {
				return status(400, { status: "error", message: "invalid user" });
			}

			const product = await productService.create({
				...body,
				createdByUserId: body.userId,
			});
			return status(201, { status: "success", data: product });
		},
		{
			body: t.Object({
				name: t.String(),
				description: t.String(),
				price: t.Number(),
				stock: t.Number(),
				userId: t.Number(),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params, productService, status }) => {
			const product: Product = await productService.getById(params.id);
			if (!product)
				return status(404, { status: "error", message: "product not found" });
			return status(200, { status: "success", data: product });
		},
		{
			params: t.Object({
				id: t.Number(),
			}),
		},
	);
