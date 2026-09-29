import Elysia from "elysia";
import pino from "pino";

const level =
	process.env.LOG_LEVEL ??
	(process.env.NODE_ENV === "test" ? "silent" : "info");

export const logger = pino({
	level,
	redact: {
		paths: [
			"req.headers.cookie",
			"req.headers.authorization",
			"headers.cookie",
			"headers.authorization",
			"password",
			"*.password",
		],
		censor: "[REDACTED]",
	},
	...(process.env.NODE_ENV === "production"
		? {}
		: {
				transport: {
					target: "pino-pretty",
					options: { colorize: true, singleLine: true },
				},
			}),
});

export const withOrderId = (orderId: number) => logger.child({ orderId });

const SKIP_PREFIXES = ["/docs", "/health"];
const startTimes = new WeakMap<Request, number>();

export const requestLogger = new Elysia({ name: "plugin.request-logger" })
	.onRequest(({ request }) => {
		startTimes.set(request, Date.now());
	})
	.onAfterHandle(({ request, set }) => {
		const { pathname } = new URL(request.url);
		if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
		const startedAt = startTimes.get(request);
		logger.info(
			{
				method: request.method,
				path: pathname,
				status: set.status ?? 200,
				durationMs: startedAt ? Date.now() - startedAt : undefined,
			},
			"request completed",
		);
	});
