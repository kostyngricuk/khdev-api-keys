import { Text } from "@radix-ui/themes";
import { useI18n } from "~/i18n/context";

const SIZES = {
  md: { mark: "2", name: "3", padding: "3px 8px", radius: 6, gap: "0.4em" },
  lg: { mark: "5", name: "6", padding: "2px 10px", radius: 8, gap: "0.2em" },
} as const;

/** "KHDev" on the accent background, followed by "API Keys" — used in the sidebar and on the login page. */
export function Wordmark({ size = "md", style }: { size?: keyof typeof SIZES; style?: React.CSSProperties }) {
  const { t } = useI18n();
  const s = SIZES[size];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: s.gap, whiteSpace: "nowrap", verticalAlign: "middle", ...style }}
    >
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
