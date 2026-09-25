import { describe, expect, it } from "vitest";
import { KEY_STATUSES, PLATFORMS, USER_STATUSES } from "@khdev/contracts";
import { KEY_STATUS_COLORS, PLATFORM_COLORS, USER_STATUS_COLORS, statusHex } from "~/lib/colors";

describe("color maps", () => {
  it("cover every platform with its brand color", () => {
    expect(Object.keys(PLATFORM_COLORS).sort()).toEqual([...PLATFORMS].sort());
    expect(PLATFORM_COLORS.wordpress).toBe("#21759B");
    expect(PLATFORM_COLORS.shopify).toBe("#95BF47");
  });

  it("cover every user and key status", () => {
    expect(Object.keys(USER_STATUS_COLORS).sort()).toEqual([...USER_STATUSES].sort());
    expect(Object.keys(KEY_STATUS_COLORS).sort()).toEqual([...KEY_STATUSES].sort());
  });

  it("uses green for active and red for removed and expired", () => {
    expect(USER_STATUS_COLORS.active).toBe("green");
    expect(USER_STATUS_COLORS.removed).toBe("red");
    expect(KEY_STATUS_COLORS.expired).toBe("red");
  });

  it("maps statuses to chart hex colors", () => {
    expect(statusHex("green")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("CHART_PLATFORM_ORDER", () => {
  it("lists every platform once and keeps the two blue brands apart", async () => {
    const { CHART_PLATFORM_ORDER } = await import("~/lib/colors");
    expect([...CHART_PLATFORM_ORDER].sort()).toEqual([...PLATFORMS].sort());
    const wp = CHART_PLATFORM_ORDER.indexOf("wordpress");
    const oc = CHART_PLATFORM_ORDER.indexOf("opencart");
    expect(Math.abs(wp - oc)).toBeGreaterThan(1);
  });
});
