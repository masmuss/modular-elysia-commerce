import { Elysia } from "elysia";
import { orderModule } from "@/modules/orders";
import { productModule } from "@/modules/products";
import { userModule } from "@/modules/users";
import { authRoutes } from "@/plugins/auth";
import { statusFromCode, toErrorResponse } from "@/plugins/error";
import { iamMacro } from "@/plugins/iam";

const app = new Elysia()
	.onError(({ code, error, set }) => {
		console.error(`[${code}]`, error);
		set.status = statusFromCode(code);
		return toErrorResponse(code, error);
	})
	.get("/health", () => ({ status: "ok" }))
	.use(authRoutes)
	.use(iamMacro)
	.use(userModule)
	.use(productModule)
	.use(orderModule)
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
