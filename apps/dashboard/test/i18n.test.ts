import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, localeFromCookie, translate } from "~/i18n";
import { en } from "~/i18n/en";
import { ru } from "~/i18n/ru";

function keysOf(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

describe("dictionaries", () => {
  it("Russian is the default language", () => {
    expect(DEFAULT_LOCALE).toBe("ru");
  });

  it("have the same keys in every language", () => {
    expect(keysOf(ru).sort()).toEqual(keysOf(en).sort());
  });

  it("have no empty strings", () => {
    for (const dict of [ru, en]) {
      for (const key of keysOf(dict)) {
        const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], dict);
        expect(value, key).not.toBe("");
      }
    }
  });
});

describe("translate", () => {
  it("looks up nested keys", () => {
    expect(translate("ru", "nav.support")).toBe(ru.nav.support);
    expect(translate("en", "nav.support")).toBe("Support");
  });

  it("fills {placeholders}", () => {
    expect(translate("en", "pagination.range", { from: 1, to: 20, total: 45 })).toBe("1–20 of 45");
  });

  it("returns the key for unknown entries", () => {
    expect(translate("en", "does.not.exist")).toBe("does.not.exist");
  });
});

describe("ENABLED_LOCALES", () => {
  it("only Russian is enabled", async () => {
    const { ENABLED_LOCALES } = await import("~/i18n");
    expect(ENABLED_LOCALES).toEqual(["ru"]);
  });
});

describe("localeFromCookie", () => {
  it("reads the lang cookie when that language is enabled", () => {
    expect(localeFromCookie("a=1; lang=en; b=2", ["ru", "en"])).toBe("en");
  });

  it("ignores a cookie for a language that is not enabled", () => {
    expect(localeFromCookie("lang=en")).toBe("ru");
  });

  it("falls back to Russian for missing or unknown values", () => {
    expect(localeFromCookie(null)).toBe("ru");
    expect(localeFromCookie("lang=de")).toBe("ru");
  });
});

describe("errorText", () => {
  it("translates known API codes", async () => {
    const { errorText } = await import("~/i18n");
    expect(errorText("ru", "USER_NOT_FOUND")).toBe("Пользователь не найден");
    expect(errorText("en", "USER_NOT_FOUND")).toBe("User not found");
  });

  it("falls back to the API message, then to a generic one", async () => {
    const { errorText } = await import("~/i18n");
    expect(errorText("en", "SOMETHING_NEW", "Server said no")).toBe("Server said no");
    expect(errorText("ru", "SOMETHING_NEW")).toBe("Что-то пошло не так. Попробуйте ещё раз.");
  });
});

describe("solutionName", () => {
  it("translates known solutions by slug", async () => {
    const { solutionName } = await import("~/i18n");
    expect(solutionName("ru", "personal-price", "Personal Price")).toBe("Персональные скидки");
    expect(solutionName("en", "personal-price", "Personal Price")).toBe("Personal Price");
  });

  it("falls back to the name stored in the database", async () => {
    const { solutionName } = await import("~/i18n");
    expect(solutionName("ru", "new-solution", "New Solution")).toBe("New Solution");
  });
});
