import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/modules/**/schema.ts",
	dialect: "mysql",
	dbCredentials: {
		database: process.env.DB_DATABASE ?? "ecommerce",
		host: process.env.DB_HOST ?? "localhost",
		user: process.env.DB_USER ?? "root",
		password: process.env.DB_PASSWORD,
	},
});
