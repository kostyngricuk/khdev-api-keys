import { describe, expect, it } from "vitest";
import { avatarLetter, formatDate, platformLabel, statusLabel, versionLabel } from "~/lib/format";

describe("formatDate", () => {
  it("formats ISO dates as DD.MM.YYYY in UTC", () => {
    expect(formatDate("2026-09-25T23:30:00.000Z")).toBe("25.09.2026");
  });

  it("shows a dash for missing dates", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("platformLabel", () => {
  it("uses the product names", () => {
    expect(platformLabel("bitrix")).toBe("1С-Битрикс");
    expect(platformLabel("wordpress")).toBe("WordPress");
    expect(platformLabel("opencart")).toBe("OpenCart");
    expect(platformLabel("shopify")).toBe("Shopify");
  });
});

describe("statusLabel", () => {
  it("capitalizes statuses", () => {
    expect(statusLabel("inactive")).toBe("Inactive");
  });
});

describe("avatarLetter", () => {
  it("uses the uppercase first letter of the email", () => {
    expect(avatarLetter("admin@khdev.by")).toBe("A");
    expect(avatarLetter("")).toBe("?");
  });
});

describe("versionLabel", () => {
  it("prefixes the version with v once", () => {
    expect(versionLabel("1.2.0")).toBe("v1.2.0");
    expect(versionLabel("v1.2.0")).toBe("v1.2.0");
    expect(versionLabel("0.0.0-dev")).toBe("v0.0.0-dev");
  });
});
