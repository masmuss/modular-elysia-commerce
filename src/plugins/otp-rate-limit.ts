import { createHash } from "node:crypto";
import Elysia from "elysia";
import { logger } from "@/core/logger";
import { redis } from "@/core/redis";

const OTP_PATHS = {
	request: new Set([
		"/auth/email-otp/send-verification-otp",
		"/auth/email-otp/request-password-reset",
	]),
	verify: new Set([
		"/auth/sign-in/email-otp",
		"/auth/email-otp/verify-email",
		"/auth/email-otp/reset-password",
	]),
} as const;

const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`;

const COOLDOWN_SCRIPT = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  return 0
end
redis.call("SET", KEYS[1], "1", "EX", ARGV[1])
return 1
`;

const EMAIL_WINDOW_SECONDS = 600;
const IP_WINDOW_SECONDS = 600;
const RESEND_COOLDOWN_SECONDS = 60;
const REQUEST_EMAIL_LIMIT = 5;
const REQUEST_IP_LIMIT = 20;
const VERIFY_EMAIL_LIMIT = 10;
const VERIFY_IP_LIMIT = 30;

const limitedResponse = () =>
	new Response(
		JSON.stringify({
			status: "error",
			message: "too many OTP requests",
		}),
		{
			status: 429,
			headers: { "Content-Type": "application/json" },
		},
	);

const hashIdentifier = (value: string): string =>
	createHash("sha256").update(value).digest("hex");

const getClientIp = (request: Request): string =>
	request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
	request.headers.get("x-real-ip") ??
	"unknown";

const getEmail = async (request: Request): Promise<string | null> => {
	try {
		const body = (await request.clone().json()) as { email?: unknown };
		return typeof body.email === "string"
			? body.email.trim().toLowerCase()
			: null;
	} catch {
		return null;
	}
};

const increment = async (key: string, ttlSeconds: number): Promise<number> =>
	Number(await redis?.eval(RATE_LIMIT_SCRIPT, 1, key, ttlSeconds));

const checkBucket = async (
	key: string,
	limit: number,
	ttlSeconds: number,
): Promise<boolean> => (await increment(key, ttlSeconds)) <= limit;

const checkResendCooldown = async (emailHash: string): Promise<boolean> =>
	(await redis?.eval(
		COOLDOWN_SCRIPT,
		1,
		`otp:cooldown:${emailHash}`,
		RESEND_COOLDOWN_SECONDS,
	)) === 1;

const shouldLimitRequest = (pathname: string): boolean =>
	OTP_PATHS.request.has(pathname) || OTP_PATHS.verify.has(pathname);

export const checkOtpRateLimit = async (
	request: Request,
): Promise<Response | undefined> => {
	if (!redis) return;

	const pathname = new URL(request.url).pathname;
	if (!shouldLimitRequest(pathname)) return;

	const email = await getEmail(request);
	if (!email) return;

	try {
		const emailHash = hashIdentifier(email);
		const ipHash = hashIdentifier(getClientIp(request));
		const isRequest = OTP_PATHS.request.has(pathname);
		const emailLimit = isRequest ? REQUEST_EMAIL_LIMIT : VERIFY_EMAIL_LIMIT;
		const ipLimit = isRequest ? REQUEST_IP_LIMIT : VERIFY_IP_LIMIT;

		const [emailAllowed, ipAllowed] = await Promise.all([
			checkBucket(
				`otp:${isRequest ? "request" : "verify"}:email:${emailHash}`,
				emailLimit,
				EMAIL_WINDOW_SECONDS,
			),
			checkBucket(
				`otp:${isRequest ? "request" : "verify"}:ip:${ipHash}`,
				ipLimit,
				IP_WINDOW_SECONDS,
			),
		]);

		if (!emailAllowed || !ipAllowed) return limitedResponse();
		if (isRequest && !(await checkResendCooldown(emailHash))) {
			return limitedResponse();
		}
	} catch (error) {
		logger.error({ error, pathname }, "otp rate limit check failed");
	}
};

export const otpRateLimit = new Elysia({
	name: "plugin.otp-rate-limit",
}).onBeforeHandle(({ request }) => checkOtpRateLimit(request));
