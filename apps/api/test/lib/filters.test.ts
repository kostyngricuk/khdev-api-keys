import { describe, expect, it } from "vitest";
import { containsPattern, dateRange, pageOffset } from "../../src/lib/filters.js";

describe("dateRange", () => {
  it("returns empty bounds when no dates are given", () => {
    expect(dateRange({})).toEqual({ from: undefined, to: undefined });
  });

  it("makes dateTo inclusive by moving it to the next day (exclusive bound)", () => {
    const range = dateRange({ dateFrom: "2026-09-01", dateTo: "2026-09-25" });
    expect(range.from?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(range.to?.toISOString()).toBe("2026-09-26T00:00:00.000Z");
  });
});

describe("pageOffset", () => {
  it("converts page and pageSize to limit and offset", () => {
    expect(pageOffset({ page: 1, pageSize: 20 })).toEqual({ limit: 20, offset: 0 });
    expect(pageOffset({ page: 3, pageSize: 10 })).toEqual({ limit: 10, offset: 20 });
  });
});

describe("containsPattern", () => {
  it("lowercases and escapes LIKE wildcards", () => {
    expect(containsPattern("Shop")).toBe("%shop%");
    expect(containsPattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });
});
