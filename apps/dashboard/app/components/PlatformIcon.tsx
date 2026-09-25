import { CubeIcon } from "@radix-ui/react-icons";
import { Tooltip } from "@radix-ui/themes";
import type { Platform } from "@khdev/contracts";
import { PLATFORM_COLORS } from "~/lib/colors";
import { platformLabel } from "~/lib/format";

/**
 * One universal platform icon, tinted with the platform's brand color.
 * The platform name is shown in a tooltip on hover/focus and is the accessible label.
 */
export function PlatformIcon({
  platform,
  size = 20,
  focusable = true,
}: {
  platform: Platform;
  size?: number;
  /** Set false inside links/buttons, which already take focus. */
  focusable?: boolean;
}) {
  const label = platformLabel(platform);
  return (
    <Tooltip content={label}>
      <span
        role="img"
        aria-label={label}
        tabIndex={focusable ? 0 : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: 5,
          background: PLATFORM_COLORS[platform],
          color: "white",
          flexShrink: 0,
          cursor: "default",
        }}
      >
        <CubeIcon width={size * 0.65} height={size * 0.65} aria-hidden />
      </span>
    </Tooltip>
  );
}
