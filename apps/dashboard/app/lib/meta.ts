import { DEFAULT_LOCALE, isLocale, translate, type Locale } from "~/i18n";

type Match = { id: string; loaderData?: unknown } | undefined;

function localeOf(matches: Match[]): Locale {
  const root = matches.find((m) => m?.id === "root");
  const value = (root?.loaderData as { locale?: unknown } | undefined)?.locale;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Page title in the visitor's language (the root loader provides the locale). */
export function pageTitle(matches: Match[], key: string): { title: string }[] {
  const locale = localeOf(matches);
  return [{ title: `${translate(locale, key)} · ${translate(locale, "common.appName")}` }];
}

/** Title for pages without their own title. */
export function appTitle(matches: Match[]): { title: string }[] {
  return [{ title: translate(localeOf(matches), "common.appName") }];
}
