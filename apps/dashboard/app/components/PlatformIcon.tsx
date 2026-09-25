import { Tooltip } from "@radix-ui/themes";
import type { Platform } from "@khdev/contracts";
import { useI18n } from "~/i18n/context";
import { PLATFORM_COLORS } from "~/lib/colors";
import { platformLabel } from "~/lib/format";

/**
 * One universal (bold cube) icon for every platform, drawn in the platform's brand color.
 * The platform name is shown in a tooltip and is the accessible label.
 */
export function PlatformIcon({
  platform,
  size = 18,
  focusable = true,
}: {
  platform: Platform;
  size?: number;
  /** Set false inside links/buttons, which already take focus. */
  focusable?: boolean;
}) {
  const { locale } = useI18n();
  const label = platformLabel(platform, locale);
  return (
    <Tooltip content={label}>
      <span
        role="img"
        aria-label={label}
        tabIndex={focusable ? 0 : undefined}
        style={{ display: "inline-flex", flexShrink: 0, color: PLATFORM_COLORS[platform], cursor: "default" }}
      >
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 2.5 3.5 7v10l8.5 4.5 8.5-4.5V7z" />
          <path d="M3.5 7 12 11.5 20.5 7" />
          <path d="M12 11.5v10" />
        </svg>
      </span>
    </Tooltip>
  );
}
