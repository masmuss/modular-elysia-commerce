import { MySql2Database } from "drizzle-orm/mysql2";
import { db } from "./db";

export type Database = MySql2Database;

export abstract class BaseService {
	constructor(protected readonly database: Database = db) {}
}
