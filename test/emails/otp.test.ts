import { describe, expect, it } from "bun:test";
import { render } from "react-email";
import OTPEmail from "@/emails/otp";

describe("OTPEmail template", () => {
	it("should render OTP code in HTML output", async () => {
		const html = await render(OTPEmail({ otp: "987654" }));

		expect(html).toContain("987654");
		expect(html).toContain("Use this one-time code to continue:");
	});

	it("should render magic link when url is provided", async () => {
		const targetUrl = "https://example.com/magic-login?token=abc123xyz";
		const html = await render(OTPEmail({ url: targetUrl }));

		expect(html).toContain(targetUrl);
		expect(html).toContain("Continue securely");
	});

	it("should render both OTP and magic link when both props are passed", async () => {
		const targetUrl = "https://example.com/verify?token=123";
		const otpCode = "123456";
		const html = await render(OTPEmail({ otp: otpCode, url: targetUrl }));

		expect(html).toContain(otpCode);
		expect(html).toContain(targetUrl);
	});
});
