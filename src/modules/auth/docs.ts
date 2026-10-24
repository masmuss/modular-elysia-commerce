import { auth } from "@/modules/auth/config";

export const AUTH_DOC_PREFIX = "/auth";

export const ALLOWED_AUTH_PATHS = [
	"/sign-in/email",
	"/sign-up/email",
	"/sign-out",
	"/get-session",
	"/email-otp/send-verification-otp",
	"/sign-in/email-otp",
	"/email-otp/verify-email",
	"/email-otp/request-password-reset",
	"/email-otp/reset-password",
];

type AuthOperation = {
	tags?: string[];
	summary?: string;
	description?: string;
};

type AuthOperations = Record<string, AuthOperation>;

const AUTH_DOC_META: Record<string, { summary: string; description: string }> =
	{
		"/sign-up/email": {
			summary: "Sign up with email",
			description:
				"Create account with name, email, password. Assigns default role via database hook.",
		},
		"/sign-in/email": {
			summary: "Sign in with email",
			description:
				"Authenticate with email and password. Returns session cookie used by protected routes.",
		},
		"/sign-out": {
			summary: "Sign out",
			description: "Invalidate current session cookie.",
		},
		"/get-session": {
			summary: "Get current session",
			description: "Return active session and user bound to session cookie.",
		},
		"/email-otp/send-verification-otp": {
			summary: "Send verification OTP",
			description:
				"Send a one-time password to email for sign-in, verification, or password reset.",
		},
		"/sign-in/email-otp": {
			summary: "Sign in with email OTP",
			description:
				"Authenticate using email and one-time password. Returns session cookie.",
		},
		"/email-otp/verify-email": {
			summary: "Verify email with OTP",
			description: "Verify email address using the received OTP code.",
		},
		"/email-otp/request-password-reset": {
			summary: "Request password reset OTP",
			description:
				"Send a password reset one-time password to the account email.",
		},
		"/email-otp/reset-password": {
			summary: "Reset password with OTP",
			description: "Reset account password using verified OTP code.",
		},
	};

const generateAuthPaths = async (
	prefix = AUTH_DOC_PREFIX,
	allowlist: readonly string[] = ALLOWED_AUTH_PATHS,
): Promise<Record<string, AuthOperations>> => {
	const schema = await auth.api.generateOpenAPISchema();
	const paths = schema.paths as Record<string, AuthOperations>;
	const reference: Record<string, AuthOperations> = Object.create(null);
	for (const path of Object.keys(paths)) {
		if (!allowlist.includes(path)) continue;
		const key = prefix + path;
		reference[key] = paths[path];
		const meta = AUTH_DOC_META[path];
		for (const method of Object.keys(paths[path])) {
			reference[key][method].tags = ["Auth"];
			if (meta) {
				reference[key][method].summary = meta.summary;
				reference[key][method].description = meta.description;
			}
		}
	}
	return reference;
};

export const OpenAPI = {
	getPaths: generateAuthPaths,
	components: (async () => {
		const schema = await auth.api.generateOpenAPISchema();
		return schema.components;
	})(),
} as const;
