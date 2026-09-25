import { describe, expect, it } from "vitest";
import { errorMessage } from "~/lib/errors";

describe("errorMessage", () => {
  it("maps known API codes to friendly copy", () => {
    expect(errorMessage("USER_NOT_FOUND")).toBe("User not found");
    expect(errorMessage("USER_BLOCKED")).toMatch(/blocked/i);
  });

  it("falls back to the API message, then to a generic one", () => {
    expect(errorMessage("SOMETHING_NEW", "Server said no")).toBe("Server said no");
    expect(errorMessage("SOMETHING_NEW")).toBe("Something went wrong. Please try again.");
  });
});
