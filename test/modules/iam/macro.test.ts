import { afterEach, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { auth } from "@/modules/auth";
import { IamService } from "@/modules/iam/service";
import { iamMacro } from "@/plugins/iam";

const sessionValue = {
	user: { id: "u1", name: "A", email: "a@x.com" },
	session: { id: "s1" },
} as never;

const originalGetSession = auth.api.getSession;
const originalHasPermission = IamService.prototype.hasPermission;

afterEach(() => {
	auth.api.getSession = originalGetSession;
	IamService.prototype.hasPermission = originalHasPermission;
});

const buildApp = () =>
	new Elysia()
		.use(iamMacro)
		.get("/private", ({ user }) => ({ id: (user as { id: string }).id }), {
			isAuth: true,
		})
		.get("/admin", () => ({ ok: true }), {
			requirePermission: "product:create",
		});

describe("iam macro", () => {
	it("should return 401 when session is missing", async () => {
		auth.api.getSession = (async () => null) as never;
		const app = buildApp();

		const res = await app.handle(new Request("http://localhost/private"));
		expect(res.status).toBe(401);
	});

	it("should return 200 for authenticated user", async () => {
		auth.api.getSession = (async () => sessionValue) as never;
		const app = buildApp();

		const res = await app.handle(new Request("http://localhost/private"));
		expect(res.status).toBe(200);
	});

	it("should return 403 when permission is missing", async () => {
		auth.api.getSession = (async () => sessionValue) as never;
		IamService.prototype.hasPermission = (async () => false) as never;
		const app = buildApp();

		const res = await app.handle(new Request("http://localhost/admin"));
		expect(res.status).toBe(403);
	});

	it("should return 200 when permission exists", async () => {
		auth.api.getSession = (async () => sessionValue) as never;
		IamService.prototype.hasPermission = (async () => true) as never;
		const app = buildApp();

		const res = await app.handle(new Request("http://localhost/admin"));
		expect(res.status).toBe(200);
	});
});
