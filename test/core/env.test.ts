import { describe, expect, it } from "bun:test";
import {
	REQUIRED_ENV_KEYS,
	findMissingEnvKeys,
	getEnvList,
	getRequiredEnv,
	validateEnvOrThrow,
} from "@/core/env";

const fullEnv = Object.fromEntries(
	REQUIRED_ENV_KEYS.map((key) => [key, "test-value"]),
);

describe("env guard", () => {
	it("should report no missing keys when env is complete", () => {
		expect(findMissingEnvKeys(fullEnv)).toEqual([]);
	});

	it("should list every missing key", () => {
		expect(findMissingEnvKeys({})).toEqual([...REQUIRED_ENV_KEYS]);
	});

	it("should pass validation when env is complete", () => {
		expect(() => validateEnvOrThrow(fullEnv)).not.toThrow();
	});

	it("should throw naming the missing keys", () => {
		expect(() => validateEnvOrThrow({})).toThrow(
			"missing required env: DB_HOST",
		);
	});

	it("should return a required value", () => {
		expect(
			getRequiredEnv("RESEND_EMAIL_FROM", {
				RESEND_EMAIL_FROM: "auth@example.com",
			}),
		).toBe("auth@example.com");
	});

	it("should throw when a required value is missing", () => {
		expect(() => getRequiredEnv("RESEND_EMAIL_FROM", {})).toThrow(
			"missing required env: RESEND_EMAIL_FROM",
		);
	});

	it("should parse comma-separated environment values", () => {
		expect(
			getEnvList("BETTER_AUTH_TRUSTED_ORIGINS", {
				BETTER_AUTH_TRUSTED_ORIGINS:
					" https://app.example.com, https://admin.example.com, ",
			}),
		).toEqual(["https://app.example.com", "https://admin.example.com"]);
	});
});
