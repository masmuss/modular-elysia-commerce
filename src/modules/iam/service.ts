import { and, eq } from "drizzle-orm";
import { BaseService } from "@/core/service";
import {
	permissionsTable,
	rolePermissionsTable,
	rolesTable,
	userRolesTable,
} from "./schema";

export class IamService extends BaseService {
	async hasPermission(
		userId: string,
		requiredAction: string,
	): Promise<boolean> {
		const result = await this.database
			.select({ permission: permissionsTable.action })
			.from(userRolesTable)
			.innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
			.innerJoin(
				rolePermissionsTable,
				eq(rolesTable.id, rolePermissionsTable.roleId),
			)
			.innerJoin(
				permissionsTable,
				eq(rolePermissionsTable.permissionId, permissionsTable.id),
			)
			.where(
				and(
					eq(userRolesTable.userId, userId),
					eq(permissionsTable.action, requiredAction),
				),
			)
			.limit(1);

		return result.length > 0;
	}
}

export const iamService = new IamService();
