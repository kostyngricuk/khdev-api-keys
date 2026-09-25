import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, dictionaryFor, errorText, solutionName, translate, type Locale, type Vars } from "./index";

type I18n = {
  locale: Locale;
  t: (key: string, vars?: Vars) => string;
  /** Translates an API error code, falling back to the API's own message. */
  errorText: (code: string, fallback?: string) => string;
  solutionName: (solution: { slug: string; name: string }) => string;
  dict: ReturnType<typeof dictionaryFor>;
};

function make(locale: Locale): I18n {
  return {
    locale,
    t: (key, vars) => translate(locale, key, vars),
    errorText: (code, fallback) => errorText(locale, code, fallback),
    solutionName: (solution) => solutionName(locale, solution.slug, solution.name),
    dict: dictionaryFor(locale),
  };
}

const I18nContext = createContext<I18n>(make(DEFAULT_LOCALE));

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => make(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
