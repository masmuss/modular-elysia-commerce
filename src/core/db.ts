import { env } from "bun";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";

export const poolConnection = mysql.createPool({
	host: env.DB_HOST,
	user: env.DB_USER,
	database: env.DB_DATABASE,
});

export const closeDatabase = (): Promise<void> =>
	poolConnection.promise().end();

export const db = drizzle({ client: poolConnection });
