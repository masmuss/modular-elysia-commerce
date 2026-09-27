import Elysia, { t } from "elysia";
import { UserService } from "./service";
import { password } from "bun";
import { createInsertSchema } from "drizzle-typebox";
import { usersTable } from "./schema";

const insertUserSchema = createInsertSchema(usersTable, {
	email: t.String({ format: "email" }),
});

const createUserBody = t.Composite([
	t.Omit(insertUserSchema, ["id", "passwordHash"]),
	t.Object({ password: t.String({ minLength: 8 }) }),
]);

export const userModule = new Elysia({ prefix: "/users" })
	.decorate("userService", new UserService())
	.post(
		"/",
		async ({ body, userService, status }) => {
			const hash = await password.hash(body.password);
			const user = await userService.create({
				email: body.email,
				name: body.name,
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
			body: createUserBody,
		},
	)
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
				id: t.Number(),
			}),
		},
	);
