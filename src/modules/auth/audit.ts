import { randomUUID } from "node:crypto";
import { db } from "@/core/db";
import { logger } from "@/core/logger";
import { authAuditLogsTable } from "@/modules/auth/schema";

export const AUTH_AUDIT_EVENTS = {
	EMAIL_VERIFIED: "auth.email.verified",
	PASSWORD_RESET: "auth.password.reset",
	SESSION_CREATED: "auth.session.created",
	SESSION_REVOKED: "auth.session.revoked",
} as const;

type AuthAuditEvent =
	(typeof AUTH_AUDIT_EVENTS)[keyof typeof AUTH_AUDIT_EVENTS];

type AuthAuditContext = {
	request?: Request;
};

type AuthAuditEntry = {
	event: AuthAuditEvent;
	userId?: string;
	context?: AuthAuditContext | null;
	metadata?: Record<string, string | number | boolean | null>;
};

const getRequestMetadata = (request?: Request) => ({
	ipAddress:
		request?.headers.get("x-forwarded-for") ??
		request?.headers.get("x-real-ip"),
	userAgent: request?.headers.get("user-agent"),
});

export const recordAuthAuditEvent = async ({
	event,
	userId,
	context,
	metadata,
}: AuthAuditEntry): Promise<void> => {
	const requestMetadata = getRequestMetadata(context?.request);

	await db.insert(authAuditLogsTable).values({
		id: randomUUID(),
		event,
		userId,
		ipAddress: requestMetadata.ipAddress,
		userAgent: requestMetadata.userAgent,
		metadata,
	});

	logger.info({ event, userId }, "auth audit event recorded");
};
