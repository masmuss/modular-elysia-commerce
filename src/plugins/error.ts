const statusByCode: Record<string, number> = {
	NOT_FOUND: 404,
	VALIDATION: 422,
	PARSE: 400,
	INVALID_FILE_TYPE: 415,
	INVALID_COOKIE_SIGNATURE: 400,
	INTERNAL_SERVER_ERROR: 500,
	UNKNOWN: 500,
};

export type ErrorCode = number | string;

export const statusFromCode = (code: ErrorCode): number =>
	typeof code === "number" ? code : (statusByCode[code] ?? 500);

export const toErrorResponse = (code: ErrorCode, error: unknown) => {
	const message =
		code === "NOT_FOUND"
			? "not found"
			: process.env.NODE_ENV === "production"
				? "internal server error"
				: error instanceof Error
					? error.message
					: String(error);

	return { status: "error" as const, message };
};
