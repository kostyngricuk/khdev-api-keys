import {
  AppShell,
  Avatar,
  Badge,
  Button,
  HStack,
  Icon,
  Link,
  MobileNavToggle,
  SideNav,
  SideNavItem,
  Text,
  TopNav,
  Tooltip,
} from "@astryxdesign/core";
import type { UserRole } from "@khdev/contracts";
import {
  BarChart3,
  BookOpen,
  CircleHelp,
  ExternalLink,
  LayoutDashboard,
  Lock,
  LogOut,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Outlet, useLocation } from "react-router";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { Toaster } from "~/components/Toaster";
import { Wordmark } from "~/components/Wordmark";
import { useI18n } from "~/i18n/context";
import { requireUser } from "~/lib/auth.server";
import { env } from "~/lib/env.server";
import { versionLabel } from "~/lib/format";
import { dashboardVersion } from "~/lib/version.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const [user, version] = await Promise.all([requireUser(request), dashboardVersion(request)]);
  return { user, docsUrl: env.docsUrl, version };
}

type NavItem = { to: string; labelKey: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };

const NAV: Record<UserRole, NavItem[]> = {
  customer: [
    { to: "/keys", labelKey: "nav.apiKeys", icon: Lock },
    { to: "/support", labelKey: "nav.support", icon: CircleHelp },
  ],
  admin: [
    { to: "/admin/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
    { to: "/admin/stats", labelKey: "nav.statistics", icon: BarChart3 },
    { to: "/admin/keys", labelKey: "nav.allApiKeys", icon: Lock },
    { to: "/admin/customers", labelKey: "nav.customers", icon: User },
  ],
};

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { user, docsUrl, version } = loaderData;
  const { t } = useI18n();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer on navigation (same behavior as the previous MobileNav).
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  return (
    <Toaster>
      {/* "lg" resolves to 1024px in Astryx's default breakpoint map (the khdev theme
          defines no overrides), and equality belongs to the wider layout — so the
          drawer activates at ≤1023px, exactly where the old CSS switched. */}
      <AppShell
        contentPadding={5}
        mobileNav={{ breakpoint: "lg", hasToggle: false, isOpen: mobileNavOpen, onOpenChange: setMobileNavOpen }}
        sideNav={
          <SideNav
            // topContent (not header) so the wordmark also renders in the mobile
            // drawer — SideNav drops `header` when it is drawn inside TopNav's drawer.
            topContent={<Wordmark />}
            footer={
              <>
                <Text size="xsm" color="secondary">
                  {t("common.dashboardVersion", { version: versionLabel(version) })}
                </Text>
                {/* target="_blank" keeps this a plain browser navigation (react-router
                    does not intercept non-_self targets). */}
                <Link href={docsUrl} target="_blank" rel="noreferrer">
                  <HStack gap={2} vAlign="center">
                    <Icon icon={BookOpen} size="sm" color="secondary" />
                    {t("common.documentation")}
                    <Icon icon={ExternalLink} size="xsm" color="disabled" />
                  </HStack>
                </Link>
              </>
            }
          >
            {NAV[user.role].map((item) => (
              <SideNavItem
                key={item.to}
                label={t(item.labelKey)}
                icon={item.icon}
                href={item.to}
                isSelected={location.pathname === item.to || location.pathname.startsWith(item.to + "/")}
              />
            ))}
          </SideNav>
        }
        topNav={
          <TopNav
            startContent={<LanguageSwitcher />}
            endContent={
              <HStack gap={3} vAlign="center">
                <Badge variant={user.role === "admin" ? "purple" : "cyan"} label={t(`roles.${user.role}`)} />
                <Avatar name={user.email} alt={user.email} size="sm" />
                {/* Astryx Text has no truncate prop; keep the old ellipsis behavior. */}
                <Text
                  size="sm"
                  weight="medium"
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {user.email}
                </Text>
                <Form method="post" action="/logout">
                  <Tooltip content={t("common.signOut")}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      icon={<Icon icon={LogOut} size="sm" color="inherit" />}
                      label={t("common.signOut")}
                      isIconOnly
                    />
                  </Tooltip>
                </Form>
                {/* Self-hides at ≥1024px. Rendered here (not AppShell's auto toggle)
                    so the burger keeps the app's i18n label. */}
                <MobileNavToggle label={t("common.openMenu")} />
              </HStack>
            }
          />
        }
      >
        <Outlet />
      </AppShell>
    </Toaster>
  );
}
