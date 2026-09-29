import { openapi } from "@elysia/openapi";
import { Elysia } from "elysia";
import { validateEnvOrThrow } from "@/core/env";
import { logger, requestLogger } from "@/core/logger";
import { OpenAPI } from "@/modules/auth";
import { orderModule, orderService } from "@/modules/orders";
import { registerOrderListeners } from "@/modules/orders/listeners";
import { productModule, productService } from "@/modules/products";
import { registerProductListeners } from "@/modules/products/listeners";
import { userModule } from "@/modules/users";
import { authRoutes } from "@/plugins/auth";
import { statusFromCode, toErrorResponse } from "@/plugins/error";
import { iamMacro } from "@/plugins/iam";

validateEnvOrThrow();

registerProductListeners(productService);
registerOrderListeners(orderService);

export const app = new Elysia()
	.use(
		openapi({
			path: "/docs",
			documentation: {
				info: {
					title: "Ecommerce Modular Monolith",
					version: "1.0.0",
					description: "Elysia modular monolith: orders, products, users, IAM",
				},
				tags: [
					{ name: "Health", description: "Service status" },
					{ name: "Auth", description: "Sign-up, sign-in, session" },
					{ name: "Orders", description: "Checkout and order flow" },
					{ name: "Products", description: "Product catalog and stock" },
					{ name: "Users", description: "User profile" },
				],
				components: (await OpenAPI.components) as never,
				paths: (await OpenAPI.getPaths()) as never,
			},
		}),
	)
	.onError(({ code, error, set }) => {
		logger.error({ code, err: error }, "request failed");
		set.status = statusFromCode(code);
		return toErrorResponse(code, error);
	})
	.get("/health", () => ({ status: "ok" }), {
		detail: { summary: "Health check", tags: ["Health"], hide: true },
	})
	.use(authRoutes)
	.use(requestLogger)
	.use(iamMacro)
	.use(userModule)
	.use(productModule)
	.use(orderModule);

if (import.meta.main) {
	app.listen(3000);
	logger.info(
		`Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
	);
}
