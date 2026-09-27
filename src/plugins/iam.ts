import Elysia from "elysia";
import { iamService } from "@/modules/iam/service";
import { auth } from "@/modules/auth";

export const iamMacro = new Elysia({ name: "plugin.iam" }).macro({
	requirePermission: (action: string) => ({
		async beforeHandle({ status, request: { headers } }) {
			const session = await auth.api.getSession({ headers });
			if (!session)
				return status(401, { status: "error", message: "unauthorized" });

			const isAllowed = await iamService.hasPermission(session.user.id, action);
			if (!isAllowed)
				return status(403, { status: "error", message: "forbidden" });
		},
	}),
});
