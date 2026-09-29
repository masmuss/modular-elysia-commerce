import Elysia from "elysia";
import { auth } from "@/modules/auth";
import { authRateLimit } from "@/plugins/rate-limit";

export const authRoutes = new Elysia({ name: "plugin.auth.routes" })
	.use(authRateLimit)
	.mount(auth.handler);

export const getSession = async (headers: Headers) =>
	auth.api.getSession({ headers });

export const unauthorized = (status: (c: number, b: unknown) => unknown) =>
	status(401, { status: "error" as const, message: "unauthorized" });
