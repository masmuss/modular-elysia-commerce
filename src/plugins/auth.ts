import Elysia from "elysia";
import { auth } from "../core/auth";

export const authMiddleware = new Elysia({ name: "core.auth" }).derive(
	async ({ request, status }) => {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session)
			return status(401, { status: "error", message: "unauthorized" });

		return {
			userContext: {
				id: session.user.id,
				email: session.user.email,
			},
		};
	},
);
