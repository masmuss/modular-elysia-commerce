import { describe, expect, it } from "bun:test";
import {
	REQUIRED_ENV_KEYS,
	findMissingEnvKeys,
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
});
