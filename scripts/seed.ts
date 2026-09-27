import { closeDatabase } from "@/core/db";
import { seedIam } from "@/modules/iam/seed";

try {
	await seedIam();
	console.log("IAM seed selesai: permissions, roles, dan role-permissions ter-sync.");
} catch (error) {
	console.error("IAM seed gagal:", error);
	process.exitCode = 1;
} finally {
	await closeDatabase();
}
