import { rateLimit } from "elysia-rate-limit";
import { logger } from "@/core/logger";

const SKIP_PREFIXES = ["/docs", "/health"];

/**
 * Fallback key when neither proxy headers nor a direct socket address are
 * available (e.g. `app.handle()` in tests with no bound server). Keeping it a
 * constant means all such requests share one bucket instead of warning per
 * request or bypassing the limit.
 */
export const NO_CLIENT_IP_KEY = "no-client-ip";

type RateLimitServer =
	| {
			requestIP: (request: Request) => { address?: string } | null;
	  }
	| null
	| undefined;

/**
 * Resolve the rate limit key the same way Better Auth and the OTP limiter do:
 * trust standard proxy headers first, then fall back to the direct socket
 * address. Never calls `console.warn`, so `app.handle()` in tests stays quiet.
 */
export const trustedProxyKeyGenerator = (
	request: Request,
	server?: RateLimitServer,
): string => {
	const forwarded = request.headers
		.get("x-forwarded-for")
		?.split(",")[0]
		?.trim();
	if (forwarded) return forwarded;

	const realIp = request.headers.get("x-real-ip")?.trim();
	if (realIp) return realIp;

	try {
		const direct = server?.requestIP?.(request)?.address;
		if (direct) return direct;
	} catch (error) {
		logger.debug({ error }, "rate limit could not read direct client IP");
	}

	return NO_CLIENT_IP_KEY;
};

const shouldSkip = (request: Request): boolean => {
	const { pathname } = new URL(request.url);
	return SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

const limitedResponse = () =>
	new Response(
		JSON.stringify({ status: "error", message: "too many requests" }),
		{ status: 429, headers: { "Content-Type": "application/json" } },
	);

export const globalRateLimit = rateLimit({
	duration: 60_000,
	max: 100,
	generator: trustedProxyKeyGenerator,
	errorResponse: limitedResponse(),
	skip: (request) => shouldSkip(request),
});

export const authRateLimit = rateLimit({
	duration: 60_000,
	max: 10,
	generator: trustedProxyKeyGenerator,
	errorResponse: limitedResponse(),
	countFailedRequest: true,
});
