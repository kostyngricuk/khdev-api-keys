import { ExitIcon } from "@radix-ui/react-icons";
import { Avatar, Badge, Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import type { AuthUser } from "@khdev/contracts";
import { Form } from "react-router";
import { useI18n } from "~/i18n/context";
import { avatarLetter } from "~/lib/format";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function TopBar({ user, menu }: { user: AuthUser; menu?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <Flex
      align="center"
      justify="between"
      gap="3"
      className="topbar"
      style={{ height: 60, background: "var(--color-panel-solid)", borderBottom: "1px solid var(--gray-a5)" }}
    >
      <Flex align="center" gap="3">
        {menu}
        <LanguageSwitcher />
      </Flex>
      <Flex align="center" gap="3" style={{ minWidth: 0 }}>
        <Badge color={user.role === "admin" ? "indigo" : "cyan"} variant="soft" size="2">
          {t(`roles.${user.role}`)}
        </Badge>
        <Avatar size="2" radius="full" fallback={avatarLetter(user.email)} color="indigo" variant="solid" />
        <Text size="2" weight="medium" truncate className="topbar-email">
          {user.email}
        </Text>
        {/* A plain block form would sit the icon on the text baseline; flex keeps it vertically centered. */}
        <Form method="post" action="/logout" style={{ display: "flex", alignItems: "center" }}>
          <Tooltip content={t("common.signOut")}>
            <IconButton type="submit" variant="ghost" color="gray" aria-label={t("common.signOut")}>
              <ExitIcon />
            </IconButton>
          </Tooltip>
        </Form>
      </Flex>
    </Flex>
  );
}
