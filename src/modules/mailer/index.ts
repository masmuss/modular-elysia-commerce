import {
	type CreateEmailOptions,
	type CreateEmailRequestOptions,
	Resend,
} from "resend";
import { getRequiredEnv } from "@/core/env";

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
