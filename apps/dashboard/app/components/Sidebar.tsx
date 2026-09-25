import {
  BarChartIcon,
  Cross2Icon,
  ExternalLinkIcon,
  HamburgerMenuIcon,
  LockClosedIcon,
  PersonIcon,
  QuestionMarkCircledIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { Box, Flex, IconButton, Separator, Text } from "@radix-ui/themes";
import type { UserRole } from "@khdev/contracts";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useI18n } from "~/i18n/context";
import { versionLabel } from "~/lib/format";

type NavItem = { to: string; labelKey: string; icon: React.ReactNode };

const NAV: Record<UserRole, NavItem[]> = {
  customer: [
    { to: "/keys", labelKey: "nav.apiKeys", icon: <LockClosedIcon /> },
    { to: "/support", labelKey: "nav.support", icon: <QuestionMarkCircledIcon /> },
  ],
  admin: [
    { to: "/admin/keys", labelKey: "nav.allApiKeys", icon: <LockClosedIcon /> },
    { to: "/admin/customers", labelKey: "nav.customers", icon: <PersonIcon /> },
    { to: "/admin/stats", labelKey: "nav.statistics", icon: <BarChartIcon /> },
  ],
};

export type SidebarProps = { role: UserRole; docsUrl: string; version: string };

function Brand() {
  const { t } = useI18n();
  return (
    <Flex align="center" gap="2" px="3" pt="1">
      <Flex
        align="center"
        justify="center"
        style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-9)", color: "white" }}
      >
        <LockClosedIcon />
      </Flex>
      <Text weight="bold" size="3">
        {t("common.appName")}
      </Text>
    </Flex>
  );
}

/** Navigation, version and documentation link; shared by the desktop sidebar and the mobile drawer. */
function SidebarContent({ role, docsUrl, version, header }: SidebarProps & { header?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <Flex direction="column" justify="between" p="4" style={{ height: "100%" }}>
      <Flex direction="column" gap="4">
        {header ?? <Brand />}
        <nav aria-label={t("common.mainNavigation")}>
          <Flex direction="column" gap="1">
            {NAV[role].map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link">
                {item.icon}
                {t(item.labelKey)}
              </NavLink>
            ))}
          </Flex>
        </nav>
      </Flex>
      <Box>
        <Box px="3" mb="2">
          <Text size="1" color="gray">
            {t("common.dashboardVersion", { version: versionLabel(version) })}
          </Text>
        </Box>
        <Separator size="4" mb="3" />
        <a href={docsUrl} target="_blank" rel="noreferrer" className="nav-link">
          <ReaderIcon />
          <Box style={{ flex: 1 }}>{t("common.documentation")}</Box>
          <ExternalLinkIcon color="var(--gray-9)" />
        </a>
      </Box>
    </Flex>
  );
}

/** Static sidebar on desktop (≥1024px); hidden on tablets and phones, where MobileNav is used instead. */
export function Sidebar(props: SidebarProps) {
  return (
    <aside className="sidebar-desktop">
      <SidebarContent {...props} />
    </aside>
  );
}

/** Burger button (tablets and phones) that opens the navigation as a drawer above the page. */
export function MobileNav(props: SidebarProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <IconButton className="burger-button" variant="ghost" color="gray" size="3" aria-label={t("common.openMenu")}>
          <HamburgerMenuIcon width={20} height={20} />
        </IconButton>
      </Dialog.Trigger>
      {/* Rendered in place (no portal) so the drawer stays inside the Radix Theme and gets its styles. */}
      <Dialog.Overlay className="drawer-overlay" />
      <Dialog.Content className="drawer-content" aria-describedby={undefined}>
        <SidebarContent
          {...props}
          header={
            <Flex align="center" justify="between">
              <Dialog.Title asChild>
                <div>
                  <Brand />
                </div>
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton variant="ghost" color="gray" aria-label={t("common.closeMenu")}>
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            </Flex>
          }
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
