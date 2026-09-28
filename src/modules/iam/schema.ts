import { int, mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";
import { usersTable } from "@/modules/users/schema";

export const rolesTable = mysqlTable("iam_roles", {
	id: int("id").primaryKey().autoincrement(),
	name: varchar("name", { length: 50 }).notNull().unique(),
});

export const permissionsTable = mysqlTable("iam_permissions", {
	id: int("id").primaryKey().autoincrement(),
	action: varchar("action", { length: 100 }).notNull().unique(),
});

export const rolePermissionsTable = mysqlTable(
	"iam_role_permissions",
	{
		roleId: int("role_id")
			.notNull()
			.references(() => rolesTable.id),
		permissionId: int("permission_id")
			.notNull()
			.references(() => permissionsTable.id),
	},
	(t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRolesTable = mysqlTable(
	"iam_user_roles",
	{
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => usersTable.id),
		roleId: int("role_id")
			.notNull()
			.references(() => rolesTable.id),
	},
	(t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);
