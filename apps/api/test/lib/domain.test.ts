import { describe, expect, it } from "vitest";
import { normalizeDomain } from "../../src/lib/domain.js";

describe("normalizeDomain", () => {
  it.each([
    ["shop.com", "shop.com"],
    ["https://www.Shop.com:443/path?q=1", "shop.com"],
    ["http://shop.com/", "shop.com"],
    ["WWW.SHOP.COM", "shop.com"],
    ["sub.shop.com", "sub.shop.com"],
    ["  shop.com  ", "shop.com"],
    ["localhost", "localhost"],
    ["localhost:8080", "localhost"],
    ["магазин.рф", "xn--80aairftm.xn--p1ai"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each(["", "   ", "not a domain", "http://", "-bad-.com", "shop..com"])("rejects %j", (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });
});
