import { Elysia } from "elysia";
import { userModule } from "./modules/users";
import { productModule } from "./modules/products";
import { orderModule } from "./modules/orders";
import { auth } from "./core/auth";

const app = new Elysia()
	.onError(({ code, error }) => {
		console.error(`[${code}]`, error);
		return {
			status: "error",
			message: error,
		};
	})
	.get("/health", () => ({ status: "ok" }))
	.mount("/auth", auth.handler)
	.use(userModule)
	.use(productModule)
	.use(orderModule)
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
