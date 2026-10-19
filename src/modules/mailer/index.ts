import { render } from "react-email";
import {
	type CreateEmailOptions,
	type CreateEmailRequestOptions,
	Resend,
} from "resend";
import { getRequiredEnv } from "@/core/env";
import { logger } from "@/core/logger";
import OTPEmail from "@/emails/otp";

export type OtpEmailType =
	| "sign-in"
	| "email-verification"
	| "forget-password"
	| "change-email";

let resendInstance: Resend | null = null;

function getResendClient(): Resend {
	if (!resendInstance) {
		resendInstance = new Resend(getRequiredEnv("RESEND_API_KEY"));
	}
	return resendInstance;
}

export async function sendEmail(
	payload: CreateEmailOptions,
	options?: CreateEmailRequestOptions,
) {
	const resend = getResendClient();
	const { data, error, headers } = await resend.emails.send(payload, options);

	return { data, error, headers };
}

export const getOtpEmailSubject = (type: OtpEmailType): string => {
	switch (type) {
		case "sign-in":
			return "Your sign in OTP code";
		case "email-verification":
			return "Your email verification code";
		case "forget-password":
			return "Your password reset code";
		case "change-email":
			return "Your email change verification code";
	}
};

export async function sendOtpEmail(
	email: string,
	otp: string,
	type: OtpEmailType,
): Promise<void> {
	const html = await render(OTPEmail({ otp }));
	const { error } = await sendEmail({
		from: getRequiredEnv("RESEND_EMAIL_FROM"),
		to: email,
		subject: getOtpEmailSubject(type),
		html,
	});

	if (error) {
		logger.error(
			{ error, email, type },
			"failed to send verification OTP email",
		);
		throw new Error("failed to send OTP email");
	}

	logger.info({ email, type }, "verification OTP email sent successfully");
}
