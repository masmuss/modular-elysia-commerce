import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import { iamMacro } from "@/plugins/iam";
import { productsTable } from "./schema";
import { ProductService } from "./service";

const { id, createdByUserId, deletedAt, ...clientColumns } =
	createInsertSchema(productsTable).properties;

const createProductBody = t.Object(clientColumns);

const errorResponse = t.Object({
	status: t.Literal("error"),
	message: t.String(),
});

const productResponse = t.Object(
	{
		id: t.Number(),
		name: t.String(),
		price: t.Number(),
		stock: t.Number(),
	},
	{ additionalProperties: true },
);

const createProductResponse = t.Object({
	status: t.Literal("success"),
	data: productResponse,
});

const getProductResponse = t.Object({
	status: t.Literal("success"),
	data: productResponse,
});

export const productService = new ProductService();

export const productModule = new Elysia({ prefix: "/products" })
	.use(iamMacro)
	.decorate("productService", productService)
	.post(
		"/",
		async ({ body, productService, user, status }) => {
			const product = await productService.create({
				...body,
				createdByUserId: user.id,
			});
			return status(201, { status: "success", data: product });
		},
		{
			body: createProductBody,
			requirePermission: "product:create",
			response: {
				201: createProductResponse,
				401: errorResponse,
				403: errorResponse,
				422: errorResponse,
			},
			detail: {
				summary: "Create product",
				description:
					"Requires product:create permission. Sets createdByUserId from session.",
				tags: ["Products"],
			},
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
			response: {
				200: getProductResponse,
				404: errorResponse,
			},
			detail: {
				summary: "Get product by id",
				description: "Public catalog read. No auth required.",
				tags: ["Products"],
			},
		},
	);
