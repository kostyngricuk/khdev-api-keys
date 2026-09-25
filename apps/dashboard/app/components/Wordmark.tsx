import { Text } from "@radix-ui/themes";
import { useI18n } from "~/i18n/context";

const SIZES = {
  md: { mark: "2", name: "3", padding: "3px 8px", radius: 6 },
  lg: { mark: "5", name: "6", padding: "2px 10px", radius: 8 },
} as const;

/** "KHDev" on the accent background, followed by "API Keys" — used in the sidebar and on the login page. */
export function Wordmark({ size = "md" }: { size?: keyof typeof SIZES }) {
  const { t } = useI18n();
  const s = SIZES[size];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4em", whiteSpace: "nowrap", verticalAlign: "middle" }}>
      <Text
        size={s.mark}
        weight="bold"
        style={{
          background: "var(--accent-9)",
          color: "white",
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
    </span>
  );
}
