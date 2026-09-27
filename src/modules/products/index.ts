import Elysia, { t } from "elysia";
import { userModule } from "../users";
import { ProductService } from "./service";
import { createInsertSchema } from "drizzle-typebox";
import { productsTable } from "./schema";

const createProductBody = t.Composite([
	t.Omit(createInsertSchema(productsTable), ["id", "createdByUserId"]),
	t.Object({ userId: t.Number() }),
]);

export const productModule = new Elysia({ prefix: "/products" })
	.use(userModule)
	.decorate("productService", new ProductService())
	.post(
		"/",
		async ({ body, productService, userService, status }) => {
			const isUserValid = await userService.findById(body.userId);

			if (!isUserValid) {
				return status(400, { status: "error", message: "invalid user" });
			}

			const product = await productService.create({
				name: body.name,
				description: body.description,
				price: body.price,
				stock: body.stock,
				createdByUserId: body.userId,
			});
			return status(201, { status: "success", data: product });
		},
		{
			body: createProductBody,
		},
	)
	.get(
		"/:id",
		async ({ params, productService, status }) => {
			const product = await productService.getById(params.id);
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
