import { en, type Dictionary } from "./en";
import { ru } from "./ru";

export const LOCALES = ["ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "lang";

export const LOCALE_LABELS: Record<Locale, string> = { ru: "RU", en: "EN" };

const DICTIONARIES: Record<Locale, Dictionary> = { ru, en };

export const dictionaryFor = (locale: Locale): Dictionary => DICTIONARIES[locale];

export type Vars = Record<string, string | number>;

/** Looks up a dotted key ("nav.support") and fills {placeholders}. Unknown keys return the key itself. */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  const value = key.split(".").reduce<unknown>((node, part) => {
    return node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
  }, DICTIONARIES[locale]);
  if (typeof value !== "string") return key;
  return vars ? value.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match)) : value;
}

export function hasTranslation(locale: Locale, key: string): boolean {
  return translate(locale, key) !== key;
}

export const isLocale = (value: unknown): value is Locale => (LOCALES as readonly unknown[]).includes(value);

/** Reads the language from the `lang` cookie; Russian is the default. */
export function localeFromCookie(cookieHeader: string | null): Locale {
  const match = cookieHeader?.match(/(?:^|;\s*)lang=([^;]+)/);
  const value = match?.[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Intl locale tag for dates and numbers. */
export const intlLocale = (locale: Locale) => (locale === "ru" ? "ru-RU" : "en-US");

/** Translates an API error code, falling back to the API's own message, then to a generic one. */
export function errorText(locale: Locale, code: string, fallback?: string): string {
  return hasTranslation(locale, `errors.${code}`)
    ? translate(locale, `errors.${code}`)
    : (fallback ?? translate(locale, "errors.generic"));
}
