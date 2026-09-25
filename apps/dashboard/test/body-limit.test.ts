import { describe, expect, it } from "vitest";
import { bodyLimitError, SUPPORT_BODY_LIMIT } from "~/lib/body-limit";

const post = (headers: Record<string, string>) => new Request("http://localhost/support", { method: "POST", headers });

describe("bodyLimitError", () => {
  it("accepts bodies within the limit", () => {
    expect(bodyLimitError(post({ "content-length": "1000" }), SUPPORT_BODY_LIMIT)).toBeNull();
  });

  it("rejects bodies over the limit before they are read", () => {
    expect(bodyLimitError(post({ "content-length": String(SUPPORT_BODY_LIMIT + 1) }), SUPPORT_BODY_LIMIT)).toEqual({
      status: 413,
      code: "UPLOAD_TOO_LARGE",
    });
  });

  it("rejects bodies without a length", () => {
    expect(bodyLimitError(post({}), SUPPORT_BODY_LIMIT)).toEqual({ status: 411, code: "UPLOAD_NO_LENGTH" });
  });

  it("allows 3 files of 5 MB plus the form fields", () => {
    expect(SUPPORT_BODY_LIMIT).toBeGreaterThan(3 * 5 * 1024 * 1024);
    expect(SUPPORT_BODY_LIMIT).toBeLessThanOrEqual(16 * 1024 * 1024);
  });
});
