import { rateLimit } from "elysia-rate-limit";

const SKIP_PREFIXES = ["/docs", "/health"];

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
	errorResponse: limitedResponse(),
	skip: (request) => shouldSkip(request),
});

export const authRateLimit = rateLimit({
	duration: 60_000,
	max: 10,
	errorResponse: limitedResponse(),
	countFailedRequest: true,
});
