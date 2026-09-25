import { describe, expect, it } from "vitest";
import { AppError, conflict, notFound } from "../../src/lib/errors.js";

describe("AppError helpers", () => {
  it("carry status and code", () => {
    const error = notFound("KEY_NOT_FOUND", "Key not found");
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("KEY_NOT_FOUND");
    expect(conflict("KEY_EXPIRED", "Key expired").statusCode).toBe(409);
  });

  it("serializes to the API error shape", () => {
    expect(notFound("USER_NOT_FOUND", "User not found").toJSON()).toEqual({
      error: { code: "USER_NOT_FOUND", message: "User not found" },
    });
  });
});
