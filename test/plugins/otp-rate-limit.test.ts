import { describe, expect, it } from "bun:test";
import { checkOtpRateLimit } from "@/plugins/otp-rate-limit";

describe("OTP rate limit", () => {
	it("should ignore non-OTP endpoints", async () => {
		const response = await checkOtpRateLimit(
			new Request("http://localhost:3000/auth/sign-in/email", {
				method: "POST",
				body: JSON.stringify({ email: "user@example.com" }),
			}),
		);

		expect(response).toBeUndefined();
	});

	it("should ignore malformed OTP bodies", async () => {
		const response = await checkOtpRateLimit(
			new Request(
				"http://localhost:3000/auth/email-otp/send-verification-otp",
				{
					method: "POST",
					body: JSON.stringify({ email: 123 }),
				},
			),
		);

		expect(response).toBeUndefined();
	});
});
