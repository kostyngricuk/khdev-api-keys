import { DEFAULT_LOCALE, isLocale, translate } from "~/i18n";

type Match = { id: string; loaderData?: unknown } | undefined;

/** Page title in the visitor's language (the root loader provides the locale). */
export function pageTitle(matches: Match[], key: string): { title: string }[] {
  const root = matches.find((m) => m?.id === "root");
  const value = (root?.loaderData as { locale?: unknown } | undefined)?.locale;
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  return [{ title: `${translate(locale, key)} · KHDev API Keys` }];
}
