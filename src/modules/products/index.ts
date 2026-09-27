import Elysia, { t } from "elysia";
import { createInsertSchema } from "drizzle-typebox";
import { getSession } from "@/plugins/auth";
import { ProductService } from "./service";
import { productsTable } from "./schema";
import "./listeners";

const { id, createdByUserId, deletedAt, ...clientColumns } =
	createInsertSchema(productsTable).properties;

const createProductBody = t.Object(clientColumns);

export const productModule = new Elysia({ prefix: "/products" })
	.decorate("productService", new ProductService())
	.post(
		"/",
		async ({ body, productService, request, status }) => {
			const session = await getSession(request.headers);
			if (!session)
				return status(401, { status: "error", message: "unauthorized" });

			const product = await productService.create({
				...body,
				createdByUserId: session.user.id,
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
