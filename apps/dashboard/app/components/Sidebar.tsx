import { BarChartIcon, ExternalLinkIcon, LockClosedIcon, PersonIcon, QuestionMarkCircledIcon, ReaderIcon } from "@radix-ui/react-icons";
import { Box, Flex, Separator, Text } from "@radix-ui/themes";
import type { UserRole } from "@khdev/contracts";
import { NavLink } from "react-router";

type NavItem = { to: string; label: string; icon: React.ReactNode };

const NAV: Record<UserRole, NavItem[]> = {
  customer: [
    { to: "/keys", label: "API Keys", icon: <LockClosedIcon /> },
    { to: "/support", label: "Support", icon: <QuestionMarkCircledIcon /> },
  ],
  admin: [
    { to: "/admin/keys", label: "All API Keys", icon: <LockClosedIcon /> },
    { to: "/admin/customers", label: "Customers", icon: <PersonIcon /> },
    { to: "/admin/stats", label: "Statistics", icon: <BarChartIcon /> },
  ],
};

export function Sidebar({ role, docsUrl }: { role: UserRole; docsUrl: string }) {
  return (
    <Flex
      direction="column"
      justify="between"
      p="4"
      style={{
        width: 240,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--color-panel-solid)",
        borderRight: "1px solid var(--gray-a5)",
      }}
    >
      <Flex direction="column" gap="4">
        <Flex align="center" gap="2" px="3" pt="1">
          <Flex
            align="center"
            justify="center"
            style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-9)", color: "white" }}
          >
            <LockClosedIcon />
          </Flex>
          <Text weight="bold" size="3">
            KHDev Keys
          </Text>
        </Flex>
        <nav aria-label="Main">
          <Flex direction="column" gap="1">
            {NAV[role].map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link">
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </Flex>
        </nav>
      </Flex>
      <Box>
        <Separator size="4" mb="3" />
        <a href={docsUrl} target="_blank" rel="noreferrer" className="nav-link">
          <ReaderIcon />
          <Box style={{ flex: 1 }}>Documentation</Box>
          <ExternalLinkIcon color="var(--gray-9)" />
        </a>
      </Box>
    </Flex>
  );
}
