import Elysia, { status } from "elysia";
import { auth } from "@/modules/auth";
import { IamService } from "@/modules/iam/service";

const iamService = new IamService();

export const iamMacro = new Elysia({ name: "plugin.iam" }).macro({
	isAuth: {
		async resolve({ request: { headers } }) {
			const session = await auth.api.getSession({ headers });
			if (!session)
				return status(401, { status: "error", message: "unauthorized" });

			return {
				session,
				user: session.user,
			};
		},
	},
	requirePermission: (action: string) => ({
		async resolve({ request: { headers } }) {
			const session = await auth.api.getSession({ headers });
			if (!session)
				return status(401, { status: "error", message: "unauthorized" });

			const isAllowed = await iamService.hasPermission(session.user.id, action);
			if (!isAllowed)
				return status(403, { status: "error", message: "forbidden" });

			return {
				session,
				user: session.user,
			};
		},
	}),
});
