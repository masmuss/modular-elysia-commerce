import { eq } from "drizzle-orm";
import { db } from "../../core/db";
import { usersTable } from "./schema";
import { User } from "./types";

export class UserService {
	constructor(private readonly database = db) {}

	async findById(id: string): Promise<User | undefined> {
		const [user] = await this.database
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, id));

		return user;
	}

	async isExists(id: string): Promise<boolean> {
		const user = await this.findById(id);

		return !!user;
	}
}
