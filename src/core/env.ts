export const REQUIRED_ENV_KEYS = [
	"DB_HOST",
	"DB_PORT",
	"DB_DATABASE",
	"DB_USER",
	"DB_PASSWORD",
	"BETTER_AUTH_URL",
	"BETTER_AUTH_SECRET",
	"RESEND_API_KEY",
] as const;

export type EnvRecord = Record<string, string | undefined>;

export const findMissingEnvKeys = (
	env: EnvRecord = process.env,
	required: readonly string[] = REQUIRED_ENV_KEYS,
): string[] => required.filter((key) => !env[key]);

export const validateEnvOrThrow = (
	env: EnvRecord = process.env,
	required: readonly string[] = REQUIRED_ENV_KEYS,
): void => {
	const missing = findMissingEnvKeys(env, required);
	if (missing.length > 0)
		throw new Error(
			`missing required env: ${missing.join(", ")}. copy .env.example to .env and fill the values`,
		);
};
