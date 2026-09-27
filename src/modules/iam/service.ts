import { and, eq } from "drizzle-orm";
import { db } from "../../core/db";
import {
	permissionsTable,
	rolePermissionsTable,
	rolesTable,
	userRolesTable,
} from "./schema";

export class IamService {
	constructor(private readonly database = db) {}

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
