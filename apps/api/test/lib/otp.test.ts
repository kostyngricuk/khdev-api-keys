import { describe, expect, it } from "vitest";
import { generateCode, generateToken, hashSecret, safeEqual } from "../../src/lib/crypto.js";

describe("generateCode", () => {
  it("always returns exactly 6 digits", () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashSecret", () => {
  it("is deterministic for the same pepper", () => {
    expect(hashSecret("123456", "pepper")).toBe(hashSecret("123456", "pepper"));
  });

  it("differs by pepper", () => {
    expect(hashSecret("123456", "a")).not.toBe(hashSecret("123456", "b"));
  });

  it("does not contain the secret", () => {
    expect(hashSecret("123456", "pepper")).not.toContain("123456");
  });
});

describe("safeEqual", () => {
  it("compares strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("generateToken", () => {
  it("returns url-safe random tokens", () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(a);
  });
});
