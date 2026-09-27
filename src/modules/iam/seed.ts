import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { permissionsTable, rolePermissionsTable, rolesTable } from "./schema";

export const PERMISSIONS = [
	"product:read",
	"product:create",
	"product:update",
	"product:delete",
	"user:read",
] as const;

export const ROLES = {
	admin: [
		"product:read",
		"product:create",
		"product:update",
		"product:delete",
		"user:read",
	],
	user: ["product:read"],
} as const satisfies Record<string, readonly string[]>;

export const DEFAULT_ROLE = "user";

export const seedIam = async (): Promise<void> => {
	for (const action of PERMISSIONS)
		await db
			.insert(permissionsTable)
			.values({ action })
			.onDuplicateKeyUpdate({ set: { action } });

	for (const name of Object.keys(ROLES))
		await db
			.insert(rolesTable)
			.values({ name })
			.onDuplicateKeyUpdate({ set: { name } });

	const permissions = await db
		.select({ id: permissionsTable.id, action: permissionsTable.action })
		.from(permissionsTable);
	const roles = await db
		.select({ id: rolesTable.id, name: rolesTable.name })
		.from(rolesTable);

	const permissionIdByAction = new Map(
		permissions.map((row) => [row.action, row.id]),
	);
	const roleIdByName = new Map(roles.map((row) => [row.name, row.id]));

	for (const [name, actions] of Object.entries(ROLES)) {
		const roleId = roleIdByName.get(name);
		if (roleId === undefined) continue;

		for (const action of actions) {
			const permissionId = permissionIdByAction.get(action);
			if (permissionId === undefined) continue;

			await db
				.insert(rolePermissionsTable)
				.values({ roleId, permissionId })
				.onDuplicateKeyUpdate({ set: { roleId } });
		}
	}
};

export const findRoleIdByName = async (
	name: string,
): Promise<number | null> => {
	const [role] = await db
		.select({ id: rolesTable.id })
		.from(rolesTable)
		.where(eq(rolesTable.name, name))
		.limit(1);

	return role?.id ?? null;
};
