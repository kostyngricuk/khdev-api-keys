import { Badge } from "@astryxdesign/core";
import type { KeyStatus, UserStatus } from "@khdev/contracts";
import { useI18n } from "~/i18n/context";
import { KEY_STATUS_COLORS, USER_STATUS_COLORS, type StatusColor } from "~/lib/colors";

// The old soft Radix badges (gray/green/amber/red) map onto Astryx's semantic variants.
const VARIANT: Record<StatusColor, "neutral" | "success" | "warning" | "error"> = {
  gray: "neutral",
  green: "success",
  amber: "warning",
  red: "error",
};

export function KeyStatusBadge({ status }: { status: KeyStatus }) {
  const { t } = useI18n();
  return <Badge variant={VARIANT[KEY_STATUS_COLORS[status]]} label={t(`status.${status}`)} />;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { t } = useI18n();
  return <Badge variant={VARIANT[USER_STATUS_COLORS[status]]} label={t(`status.${status}`)} />;
}
