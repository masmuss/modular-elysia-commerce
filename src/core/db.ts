import { env } from "bun";
import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const connectionString = env.DB_FILE_NAME;
const sqlite = new Database(connectionString);
sqlite.run(`PRAGMA journal_mode = WAL;`);

export const db = drizzle({ client: sqlite });
