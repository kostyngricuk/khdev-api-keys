import { ExitIcon } from "@radix-ui/react-icons";
import { Avatar, Badge, Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import type { AuthUser } from "@khdev/contracts";
import { Form } from "react-router";
import { avatarLetter, statusLabel } from "~/lib/format";

export function TopBar({ user }: { user: AuthUser }) {
  return (
    <Flex
      align="center"
      justify="end"
      gap="3"
      px="5"
      style={{ height: 60, background: "var(--color-panel-solid)", borderBottom: "1px solid var(--gray-a5)" }}
    >
      <Badge color={user.role === "admin" ? "indigo" : "cyan"} variant="soft" size="2">
        {statusLabel(user.role)}
      </Badge>
      <Avatar size="2" radius="full" fallback={avatarLetter(user.email)} color="indigo" variant="solid" />
      <Text size="2" weight="medium">
        {user.email}
      </Text>
      <Form method="post" action="/logout">
        <Tooltip content="Sign out">
          <IconButton type="submit" variant="ghost" color="gray" aria-label="Sign out">
            <ExitIcon />
          </IconButton>
        </Tooltip>
      </Form>
    </Flex>
  );
}
