import { Card, Text } from "@radix-ui/themes";
import { intlLocale } from "~/i18n";
import { useI18n } from "~/i18n/context";

/** A single number tile. */
export function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const { locale } = useI18n();
  return (
    <Card size="2">
      <Text as="div" size="2" color="gray">
        {label}
      </Text>
      <Text as="div" size="8" weight="bold" mt="1">
        {value.toLocaleString(intlLocale(locale))}
      </Text>
      {hint && (
        <Text as="div" size="1" color="gray" mt="1">
          {hint}
        </Text>
      )}
    </Card>
  );
}
