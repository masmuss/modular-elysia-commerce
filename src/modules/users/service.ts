import { eq } from "drizzle-orm";
import { db } from "../../core/db";
import { usersTable } from "./schema";
import { CreateUser, User } from "./types";

export class UserService {
	constructor(private readonly database = db) {}

	async create(data: CreateUser): Promise<User> {
		const [result] = await this.database.insert(usersTable).values(data);

		const [user] = await this.database
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, result.insertId));

		return user;
	}

	async findById(id: number): Promise<User | undefined> {
		const [user] = await this.database
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, id));

		return user;
	}

	async isExists(id: number): Promise<boolean> {
		const user = await this.findById(id);

		return !!user;
	}
}
