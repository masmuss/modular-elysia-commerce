import Elysia, { t } from "elysia";
import { IamService } from "@/modules/iam/service";
import { iamMacro } from "@/plugins/iam";
import { UserService } from "./service";

const iamService = new IamService();

const errorResponse = t.Object({
	status: t.Literal("error"),
	message: t.String(),
});

const getUserResponse = t.Object({
	status: t.Literal("success"),
	data: t.Object(
		{
			id: t.String(),
			email: t.String(),
			name: t.String(),
		},
		{ additionalProperties: true },
	),
});

export const userModule = new Elysia({ prefix: "/users" })
	.use(iamMacro)
	.decorate("userService", new UserService())
	.get(
		"/:id",
		async ({ params, user: sessionUser, status, userService }) => {
			const isSelf = sessionUser.id === params.id;
			if (
				!isSelf &&
				!(await iamService.hasPermission(sessionUser.id, "user:read"))
			)
				return status(403, { status: "error", message: "forbidden" });

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
				id: t.String({ minLength: 1, maxLength: 36 }),
			}),
			isAuth: true,
			response: {
				200: getUserResponse,
				401: errorResponse,
				403: errorResponse,
				404: errorResponse,
			},
			detail: {
				summary: "Get user by id",
				description:
					"Self read allowed. Other users need user:read permission.",
				tags: ["Users"],
			},
		},
	);
