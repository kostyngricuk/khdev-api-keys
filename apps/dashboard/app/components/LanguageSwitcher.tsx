import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core";
import { useLocation, useSubmit } from "react-router";
import { ENABLED_LOCALES, LOCALE_LABELS, type Locale } from "~/i18n";
import { useI18n } from "~/i18n/context";

/**
 * Language switch; the choice is stored in the `lang` cookie by the /locale action.
 * Hidden while only one language is enabled (ENABLED_LOCALES).
 */
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const submit = useSubmit();
  const location = useLocation();
  if (ENABLED_LOCALES.length < 2) return null;
  return (
    <SegmentedControl
      label={t("common.language")}
      value={locale}
      onChange={(value) =>
        submit(
          { locale: value as Locale, redirectTo: `${location.pathname}${location.search}` },
          { method: "post", action: "/locale" },
        )
      }
    >
      {ENABLED_LOCALES.map((code) => (
        <SegmentedControlItem key={code} value={code} label={LOCALE_LABELS[code]} />
      ))}
    </SegmentedControl>
  );
}
