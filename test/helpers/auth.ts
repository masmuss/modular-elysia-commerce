import { eq, inArray } from "drizzle-orm";
import { db } from "@/core/db";
import {
	accountsTable,
	authAuditLogsTable,
	sessionsTable,
	verificationsTable,
} from "@/modules/auth/schema";
import { userRolesTable } from "@/modules/iam/schema";
import type { OtpEmailType } from "@/modules/mailer";
import { usersTable } from "@/modules/users/schema";

export type JsonBody = Record<string, unknown>;

export type JsonCall = {
	path: string;
	body?: JsonBody;
	headers?: Record<string, string>;
	method?: "GET" | "POST";
};

const serializeBody = (body?: JsonBody) =>
	body === undefined ? undefined : JSON.stringify(body);

export const getBaseHttpUrl = () =>
	process.env.AUTH_HTTP_BASE_URL ?? "http://localhost:3000";

const postJsonCall = (call: JsonCall): JsonCall => ({ method: "POST", ...call });

/** POST/GET JSON against a real HTTP server (Docker app on localhost:3000). */
export const postJson = async (
	call: JsonCall,
	baseUrl = getBaseHttpUrl(),
): Promise<Response> => {
	const { method = "POST", path, body, headers } = postJsonCall(call);
	return fetch(`${baseUrl}${path}`, {
		method,
		headers: { "Content-Type": "application/json", ...headers },
		body: serializeBody(body),
	});
};

/**
 * POST/GET JSON directly through an Elysia/auth `handler`, which is what
 * `app.handle()`/`auth.handler()` expect.
 */
export const createHandlerPoster = (
	handler: (request: Request) => Promise<Response>,
	baseUrl = "http://localhost:3000",
) => async (call: JsonCall): Promise<Response> => {
	const { method = "POST", path, body, headers } = postJsonCall(call);
	return handler(
		new Request(`${baseUrl}${path}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: serializeBody(body),
		}),
	);
};

export const getSessionCookie = (response: Response): string => {
	const cookie = response.headers.get("set-cookie");
	if (!cookie) throw new Error("Expected auth session cookie");
	return cookie.split(";", 1)[0];
};

export type OtpCapture = {
	/** Drop-in `OtpSender` implementation for tests. */
	send: (email: string, otp: string, type: OtpEmailType) => Promise<void>;
	/** The most recent OTP captured for an email type, if any. */
	latest: (type: OtpEmailType) => string | undefined;
	/**
	 * The most recent OTP captured for an email type, or throws. Use when the
	 * earlier flow step guarantees the OTP was sent.
	 */
	requireLatest: (type: OtpEmailType) => string;
	/** Every OTP captured for an email type, in send order. */
	sent: (type: OtpEmailType) => string[];
};

/** Captures OTPs by email type so tests never parse emails or keep flags. */
export const createOtpCapture = (): OtpCapture => {
	const byType = new Map<OtpEmailType, string[]>();
	return {
		send: async (_email, otp, type) => {
			const values = byType.get(type) ?? [];
			values.push(otp);
			byType.set(type, values);
		},
		latest: (type) => {
			const values = byType.get(type);
			return values !== undefined ? values[values.length - 1] : undefined;
		},
		requireLatest: (type) => {
			const values = byType.get(type);
			const latest = values !== undefined ? values[values.length - 1] : undefined;
			if (latest === undefined || latest === "") {
				throw new Error(`Expected a captured OTP of type ${type}`);
			}
			return latest;
		},
		sent: (type) => [...(byType.get(type) ?? [])],
	};
};

export type AuthAuditRow = {
	event: string;
	ipAddress: string | null;
	userAgent: string | null;
	metadata: unknown;
};

/** Fetches audit rows in insertion order by matching test user emails. */
export const getAuthAuditEvents = async (
	emails: readonly string[],
): Promise<AuthAuditRow[]> => {
	const users = await db
		.select({ id: usersTable.id })
		.from(usersTable)
		.where(inArray(usersTable.email, [...emails]));
	const userIds = users.map(({ id }) => id);
	if (userIds.length === 0) return [];
	return db
		.select({
			event: authAuditLogsTable.event,
			ipAddress: authAuditLogsTable.ipAddress,
			userAgent: authAuditLogsTable.userAgent,
			metadata: authAuditLogsTable.metadata,
		})
		.from(authAuditLogsTable)
		.where(inArray(authAuditLogsTable.userId, userIds));
};

/** Removes every database trace of the given test users. */
export const cleanupAuthUsers = async (
	emails: readonly string[],
): Promise<void> => {
	if (emails.length === 0) return;

	const users = await db
		.select({ id: usersTable.id })
		.from(usersTable)
		.where(inArray(usersTable.email, [...emails]));
	const userIds = users.map(({ id }) => id);

	if (userIds.length > 0) {
		await db
			.delete(userRolesTable)
			.where(inArray(userRolesTable.userId, userIds));
		await db
			.delete(sessionsTable)
			.where(inArray(sessionsTable.userId, userIds));
		await db
			.delete(accountsTable)
			.where(inArray(accountsTable.userId, userIds));
		await db
			.delete(authAuditLogsTable)
			.where(inArray(authAuditLogsTable.userId, userIds));
		await db.delete(usersTable).where(inArray(usersTable.id, userIds));
	}

	for (const email of emails) {
		await db
			.delete(verificationsTable)
			.where(eq(verificationsTable.identifier, email));
	}
};
