import { Badge } from "@radix-ui/themes";
import type { KeyStatus, UserStatus } from "@khdev/contracts";
import { KEY_STATUS_COLORS, USER_STATUS_COLORS } from "~/lib/colors";
import { statusLabel } from "~/lib/format";

export function KeyStatusBadge({ status }: { status: KeyStatus }) {
  return (
    <Badge color={KEY_STATUS_COLORS[status]} variant="soft" radius="full">
      {statusLabel(status)}
    </Badge>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge color={USER_STATUS_COLORS[status]} variant="soft" radius="full">
      {statusLabel(status)}
    </Badge>
  );
}
