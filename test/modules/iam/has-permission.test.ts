import { describe, expect, it } from "bun:test";
import { IamService } from "@/modules/iam/service";

const makeIamDb = (rows: unknown[]) => {
	const chain = {
		innerJoin: () => chain,
		where: () => chain,
		limit: () => Promise.resolve(rows),
	};
	return {
		select: () => ({
			from: () => chain,
		}),
	};
};

const makeService = (rows: unknown[]) =>
	new IamService(
		makeIamDb(rows) as unknown as ConstructorParameters<
			typeof IamService
		>[0],
	);

describe("IamService.hasPermission", () => {
	it("should return true when permission row exists", async () => {
		const service = makeService([{ permission: "product:create" }]);
		const result = await service.hasPermission("user-1", "product:create");
		expect(result).toBe(true);
	});

	it("should return false when no permission row exists", async () => {
		const service = makeService([]);
		const result = await service.hasPermission("user-1", "product:create");
		expect(result).toBe(false);
	});
});
