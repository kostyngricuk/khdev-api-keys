import { Text } from "@radix-ui/themes";
import type { Platform } from "@khdev/contracts";
import { useI18n } from "~/i18n/context";
import { PLATFORM_COLORS } from "~/lib/colors";
import { platformLabel } from "~/lib/format";

/** Platform label tinted with the brand color (background + border). */
export function PlatformBadge({ platform }: { platform: Platform }) {
  const { locale } = useI18n();
  const color = PLATFORM_COLORS[platform];
  return (
    <Text
      size="1"
      weight="medium"
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
      }}
    >
      {platformLabel(platform, locale)}
    </Text>
  );
}
