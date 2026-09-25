import { Box, Flex } from "@radix-ui/themes";
import { Outlet } from "react-router";
import { MobileNav, Sidebar } from "~/components/Sidebar";
import { Toaster } from "~/components/Toaster";
import { TopBar } from "~/components/TopBar";
import { requireUser } from "~/lib/auth.server";
import { env } from "~/lib/env.server";
import { dashboardVersion } from "~/lib/version.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const [user, version] = await Promise.all([requireUser(request), dashboardVersion(request)]);
  return { user, docsUrl: env.docsUrl, version };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { user, docsUrl, version } = loaderData;
  return (
    <Toaster>
    <Flex style={{ minHeight: "100vh" }}>
      <Sidebar role={user.role} docsUrl={docsUrl} version={version} />
      <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
        <TopBar user={user} menu={<MobileNav role={user.role} docsUrl={docsUrl} version={version} />} />
        <Box className="page-content" style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
    </Toaster>
  );
}
