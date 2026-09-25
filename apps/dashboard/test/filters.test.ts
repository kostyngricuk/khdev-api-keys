import { describe, expect, it } from "vitest";
import { parseFilters, toApiQuery } from "~/lib/filters";

const url = (qs: string) => new URL(`http://localhost/keys?${qs}`);

describe("parseFilters", () => {
  it("reads known filters from the URL", () => {
    expect(parseFilters(url("dateFrom=2026-09-01&dateTo=2026-09-25&platform=shopify&status=active&page=2"))).toEqual({
      dateFrom: "2026-09-01",
      dateTo: "2026-09-25",
      platform: "shopify",
      status: "active",
      page: 2,
    });
  });

  it("drops empty values and the 'all' option", () => {
    expect(parseFilters(url("dateFrom=&platform=all&status=all"))).toEqual({ page: 1 });
  });

  it("ignores unknown platforms, bad dates and bad pages", () => {
    expect(parseFilters(url("platform=joomla&dateFrom=yesterday&page=-3"))).toEqual({ page: 1 });
  });

  it("keeps the email filter only when allowed", () => {
    expect(parseFilters(url("email=alice"))).toEqual({ page: 1 });
    expect(parseFilters(url("email=%20alice%20"), { allowEmail: true })).toEqual({ email: "alice", page: 1 });
  });

  it("validates status against the provided list", () => {
    expect(parseFilters(url("status=blocked"), { statuses: ["active", "inactive", "expired"] })).toEqual({ page: 1 });
    expect(parseFilters(url("status=blocked"), { statuses: ["blocked"] })).toEqual({ status: "blocked", page: 1 });
  });
});

describe("toApiQuery", () => {
  it("serializes set filters only", () => {
    expect(toApiQuery({ platform: "wordpress", page: 1 })).toBe("platform=wordpress&page=1");
    expect(toApiQuery({ page: 3, email: "a b" })).toBe("email=a+b&page=3");
  });
});
