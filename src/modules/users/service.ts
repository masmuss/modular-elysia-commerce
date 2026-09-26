import { eq } from "drizzle-orm";
import { db } from "../../core/db";
import { usersTable } from "./schema";

export class UserService {
	constructor(private readonly database = db) {}

	async create(email: string, name: string, passwordHash: string) {
		const [user] = await this.database
			.insert(usersTable)
			.values({
				email,
				name,
				passwordHash,
			})
			.returning();

		return user;
	}

	async findById(id: number) {
		const [user] = await this.database
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, id));

		return user;
	}

	async isExists(id: number) {
		const user = await this.findById(id);

		return !!user;
	}
}
