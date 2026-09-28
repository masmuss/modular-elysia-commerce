import type { MySql2Database } from "drizzle-orm/mysql2";
import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations";
import { db } from "./db";

export type Database<T extends AnyRelations = EmptyRelations> =
	MySql2Database<T>;

export abstract class BaseService {
	constructor(protected readonly database: Database = db) {}
}
