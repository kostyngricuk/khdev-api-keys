import { describe, expect, it } from "vitest";
import { decodeDay, encodeDay, generateKey, isKeyFormat, maskKey, parseKey, rebuildKeyExpiry } from "../../src/lib/key.js";

const KEY_RE = /^[0-9A-F]{4}(-[0-9A-F]{4}){3}-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

describe("encodeDay / decodeDay", () => {
  it("encodes a date as 4-char base36 days since epoch", () => {
    expect(encodeDay(new Date("2026-09-25T00:00:00Z"))).toBe("0FZL");
  });

  it("ignores the time of day", () => {
    expect(encodeDay(new Date("2026-09-25T23:59:59Z"))).toBe("0FZL");
  });

  it("round-trips to the UTC start of the day", () => {
    expect(decodeDay("0FZL").toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });
});

describe("generateKey", () => {
  const createdAt = new Date("2026-09-25T10:00:00Z");
  const expiresAt = new Date("2027-09-25T10:00:00Z");

  it("produces the QQQQ-WWWW-EEEE-RRRR-TTTT-YYYY format", () => {
    expect(generateKey(createdAt, expiresAt)).toMatch(KEY_RE);
  });

  it("encodes created and expiry days in the last two segments", () => {
    const segments = generateKey(createdAt, expiresAt).split("-");
    expect(segments[4]).toBe(encodeDay(createdAt));
    expect(segments[5]).toBe(encodeDay(expiresAt));
  });

  it("produces unique keys", () => {
    const keys = new Set(Array.from({ length: 1000 }, () => generateKey(createdAt, expiresAt)));
    expect(keys.size).toBe(1000);
  });
});

describe("rebuildKeyExpiry", () => {
  it("replaces only the expiry segment", () => {
    const key = "A1B2-C3D4-E5F6-0789-0FZL-0G0Y";
    expect(rebuildKeyExpiry(key, new Date("2028-01-01T00:00:00Z"))).toBe(`A1B2-C3D4-E5F6-0789-0FZL-${encodeDay(new Date("2028-01-01"))}`);
  });
});

describe("parseKey / isKeyFormat", () => {
  it("parses a valid key", () => {
    const parsed = parseKey("A1B2-C3D4-E5F6-0789-0FZL-0G0Y");
    expect(parsed?.random).toEqual(["A1B2", "C3D4", "E5F6", "0789"]);
    expect(parsed?.createdAt.toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("accepts lowercase and surrounding whitespace", () => {
    expect(parseKey("  a1b2-c3d4-e5f6-0789-0fzl-0g0y ")?.key).toBe("A1B2-C3D4-E5F6-0789-0FZL-0G0Y");
  });

  it.each(["", "A1B2-C3D4", "A1B2-C3D4-E5F6-0789-0FZL-0G0Y-XXXX", "G1B2-C3D4-E5F6-0789-0FZL-0G0Y", "A1B2C3D4E5F607890FZL0G0Y"])(
    "rejects %j",
    (value) => {
      expect(parseKey(value)).toBeNull();
      expect(isKeyFormat(value)).toBe(false);
    },
  );
});

describe("maskKey", () => {
  it("keeps only the first and last four characters", () => {
    expect(maskKey("A1B2-C3D4-E5F6-0789-0FZL-0G3K")).toBe("A1B2…0G3K");
  });
});
