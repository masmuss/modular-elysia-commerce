import Elysia, { t } from "elysia";
import { UserService } from "./service";
import { password } from "bun";
import { User } from "./types";

export const userModule = new Elysia({ prefix: "/users" })
	.decorate("userService", new UserService())
	.post(
		"/",
		async ({ body, userService, status }) => {
			const hash = await password.hash(body.password);
			const user: User = await userService.create({
				...body,
				passwordHash: hash,
			});

			return status(201, {
				status: "success",
				data: {
					id: user.id,
					email: user.email,
					name: user.name,
				},
			});
		},
		{
			body: t.Object({
				email: t.String({ format: "email" }),
				name: t.String(),
				password: t.String({ minLength: 8 }),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params, status, userService }) => {
			const user: User = await userService.findById(params.id);
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
				id: t.Number(),
			}),
		},
	);
