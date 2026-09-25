import { errorText, localeFromCookie, translate, type Locale, type Vars } from "~/i18n";

/** Translator for loaders/actions, using the visitor's `lang` cookie. */
export function serverI18n(request: Request) {
  const locale: Locale = localeFromCookie(request.headers.get("Cookie"));
  return {
    locale,
    t: (key: string, vars?: Vars) => translate(locale, key, vars),
    errorText: (code: string, fallback?: string) => errorText(locale, code, fallback),
  };
}
