import { describe, expect, it } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import {
	errorResponse,
	statusFromCode,
	toErrorResponse,
} from "@/plugins/error";

describe("error contract", () => {
	it("should map known codes to HTTP status", () => {
		expect(statusFromCode("VALIDATION")).toBe(422);
		expect(statusFromCode("NOT_FOUND")).toBe(404);
		expect(statusFromCode("UNKNOWN")).toBe(500);
	});

	it("should pass through numeric codes", () => {
		expect(statusFromCode(401)).toBe(401);
		expect(statusFromCode(202)).toBe(202);
	});

	it("should fall back to 500 for unknown codes", () => {
		expect(statusFromCode("SOMETHING_NEW")).toBe(500);
	});

	it("should shape runtime errors like the shared schema", () => {
		const body = toErrorResponse("VALIDATION", new Error("bad items"));
		expect(body).toEqual({ status: "error", message: "bad items" });
		expect(Value.Check(errorResponse, body)).toBe(true);
	});

	it("should hide internals for NOT_FOUND", () => {
		const body = toErrorResponse("NOT_FOUND", new Error("secret detail"));
		expect(body).toEqual({ status: "error", message: "not found" });
		expect(Value.Check(errorResponse, body)).toBe(true);
	});
});
