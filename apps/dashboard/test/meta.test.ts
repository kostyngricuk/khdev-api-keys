import { describe, expect, it } from "vitest";
import { pageTitle } from "~/lib/meta";

describe("pageTitle", () => {
  it("uses the locale from the root loader data", () => {
    expect(pageTitle([{ id: "root", loaderData: { locale: "en" } }], "nav.support")).toEqual([
      { title: "Support · KHDev API Keys" },
    ]);
  });

  it("falls back to Russian", () => {
    expect(pageTitle([undefined], "nav.support")).toEqual([{ title: "Поддержка · KHDev API Keys" }]);
  });
});
