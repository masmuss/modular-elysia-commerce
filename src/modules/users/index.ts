import Elysia, { t } from "elysia";
import { getSession } from "@/plugins/auth";
import { IamService } from "@/modules/iam/service";
import { UserService } from "./service";

const iamService = new IamService();

export const userModule = new Elysia({ prefix: "/users" })
	.decorate("userService", new UserService())
	.get(
		"/:id",
		async ({ params, request, status, userService }) => {
			const session = await getSession(request.headers);
			if (!session)
				return status(401, { status: "error", message: "unauthorized" });

			const isSelf = session.user.id === params.id;
			if (
				!isSelf &&
				!(await iamService.hasPermission(session.user.id, "user:read"))
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
		},
	);
