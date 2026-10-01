import {
	type CreateEmailOptions,
	type CreateEmailRequestOptions,
	Resend,
} from "resend";

let resendInstance: Resend | null = null;

function getResendClient(): Resend {
	if (!resendInstance) {
		resendInstance = new Resend(
			process.env.RESEND_API_KEY || "re_placeholder_key",
		);
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
