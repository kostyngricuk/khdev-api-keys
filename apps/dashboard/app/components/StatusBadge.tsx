import { Badge } from "@radix-ui/themes";
import type { KeyStatus, UserStatus } from "@khdev/contracts";
import { useI18n } from "~/i18n/context";
import { KEY_STATUS_COLORS, USER_STATUS_COLORS } from "~/lib/colors";

export function KeyStatusBadge({ status }: { status: KeyStatus }) {
  const { t } = useI18n();
  return (
    <Badge color={KEY_STATUS_COLORS[status]} variant="soft" radius="full">
      {t(`status.${status}`)}
    </Badge>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { t } = useI18n();
  return (
    <Badge color={USER_STATUS_COLORS[status]} variant="soft" radius="full">
      {t(`status.${status}`)}
    </Badge>
  );
}
