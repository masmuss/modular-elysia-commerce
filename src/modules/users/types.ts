import { usersTable } from "./schema";

export type User = typeof usersTable.$inferSelect;
export type CreateUser = typeof usersTable.$inferInsert;
