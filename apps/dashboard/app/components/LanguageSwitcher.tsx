import { SegmentedControl } from "@radix-ui/themes";
import { useLocation, useSubmit } from "react-router";
import { LOCALE_LABELS, LOCALES, type Locale } from "~/i18n";
import { useI18n } from "~/i18n/context";

/** RU / EN switch; the choice is stored in the `lang` cookie by the /locale action. */
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const submit = useSubmit();
  const location = useLocation();
  return (
    <SegmentedControl.Root
      size="1"
      value={locale}
      aria-label={t("common.language")}
      onValueChange={(value) =>
        submit(
          { locale: value as Locale, redirectTo: `${location.pathname}${location.search}` },
          { method: "post", action: "/locale" },
        )
      }
    >
      {LOCALES.map((code) => (
        <SegmentedControl.Item key={code} value={code}>
          {LOCALE_LABELS[code]}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl.Root>
  );
}
