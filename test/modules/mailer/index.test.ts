import { describe, expect, it } from "bun:test";
import { render } from "react-email";
import OTPEmail from "@/emails/otp";
import { getOtpEmailSubject } from "@/modules/mailer";

describe("OTP mailer", () => {
	it.each([
		["sign-in", "Your sign in OTP code"],
		["email-verification", "Your email verification code"],
		["forget-password", "Your password reset code"],
		["change-email", "Your email change verification code"],
	] as const)("should use the right subject for %s", (type, subject) => {
		expect(getOtpEmailSubject(type)).toBe(subject);
	});

	it("should render the OTP template with the supplied code", async () => {
		const html = await render(OTPEmail({ otp: "123456" }));

		expect(html).toContain("123456");
	});
});
