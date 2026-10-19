import { describe, expect, it } from "bun:test";
import { ALLOWED_AUTH_PATHS, OpenAPI, auth } from "@/modules/auth";

describe("auth OTP integration", () => {
	it("should require email verification before password sign-in", () => {
		expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(true);
		expect(auth.options.emailVerification?.sendOnSignUp).toBe(true);
		expect(auth.options.emailVerification?.sendOnSignIn).toBe(true);
	});

	it("should include OTP endpoints in ALLOWED_AUTH_PATHS", () => {
		expect(ALLOWED_AUTH_PATHS).toContain("/email-otp/send-verification-otp");
		expect(ALLOWED_AUTH_PATHS).toContain("/sign-in/email-otp");
		expect(ALLOWED_AUTH_PATHS).toContain(
			"/email-otp/request-password-reset",
		);
		expect(ALLOWED_AUTH_PATHS).toContain("/email-otp/reset-password");
	});

	it("should expose OpenAPI documentation with tags and summaries for OTP endpoints", async () => {
		const paths = await OpenAPI.getPaths();

		const sendOtpPath = "/api/auth/email-otp/send-verification-otp";
		const signInOtpPath = "/api/auth/sign-in/email-otp";
		const requestResetPath = "/api/auth/email-otp/request-password-reset";
		const resetPasswordPath = "/api/auth/email-otp/reset-password";

		expect(paths[sendOtpPath]).toBeDefined();
		expect(paths[sendOtpPath]?.post?.tags).toContain("Auth");
		expect(paths[sendOtpPath]?.post?.summary).toBe("Send verification OTP");

		expect(paths[signInOtpPath]).toBeDefined();
		expect(paths[signInOtpPath]?.post?.tags).toContain("Auth");
		expect(paths[signInOtpPath]?.post?.summary).toBe("Sign in with email OTP");

		expect(paths[requestResetPath]?.post?.tags).toContain("Auth");
		expect(paths[requestResetPath]?.post?.summary).toBe(
			"Request password reset OTP",
		);
		expect(paths[resetPasswordPath]?.post?.tags).toContain("Auth");
		expect(paths[resetPasswordPath]?.post?.summary).toBe(
			"Reset password with OTP",
		);
	});

	it("should validate input on send verification OTP endpoint", async () => {
		const req = new Request(
			"http://localhost:3000/api/auth/email-otp/send-verification-otp",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "invalid-email-format" }),
			},
		);

		const res = await auth.handler(req);
		// Invalid request / bad request or validation error
		expect(res.status).toBeGreaterThanOrEqual(400);
	});
});
