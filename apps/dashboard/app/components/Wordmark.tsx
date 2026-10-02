import { HStack, Text } from "@astryxdesign/core";
import { useI18n } from "~/i18n/context";

// Astryx text scale: base=14px, lg=17px, 3xl=29px, 4xl=35px.
const SIZES = {
  md: { mark: "base", name: "lg", padding: "3px 8px", radius: 6 },
  lg: { mark: "3xl", name: "4xl", padding: "2px 10px", radius: 8 },
} as const;

/** "KHDev" on the accent background, followed by "API Keys" — used in the sidebar and on the login page. */
export function Wordmark({ size = "md", style }: { size?: keyof typeof SIZES; style?: React.CSSProperties }) {
  const { t } = useI18n();
  const s = SIZES[size];
  return (
    <HStack as="span" gap={1.5} style={{ whiteSpace: "nowrap", verticalAlign: "middle", ...style }}>
      <Text
        size={s.mark}
        weight="bold"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-on-accent)",
          padding: s.padding,
          borderRadius: s.radius,
          letterSpacing: "0.02em",
          lineHeight: 1.3,
        }}
      >
        {t("common.brandMark")}
      </Text>
      <Text size={s.name} weight="bold">
        {t("common.brandName")}
      </Text>
    </HStack>
  );
}
