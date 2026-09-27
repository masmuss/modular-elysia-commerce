import Elysia, { t } from "elysia";
import { UserService } from "./service";

export const userModule = new Elysia({ prefix: "/users" })
	.decorate("userService", new UserService())
	.get(
		"/:id",
		async ({ params, status, userService }) => {
			const user = await userService.findById(params.id);
			if (!user)
				return status(404, { status: "error", message: "user not found" });

			return status(200, {
				status: "success",
				data: {
					id: user.id,
					email: user.email,
					name: user.name,
				},
			});
		},
		{
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);
