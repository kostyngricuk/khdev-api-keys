import { Box, Flex } from "@radix-ui/themes";
import { Outlet } from "react-router";
import { Sidebar } from "~/components/Sidebar";
import { Toaster } from "~/components/Toaster";
import { TopBar } from "~/components/TopBar";
import { requireUser } from "~/lib/auth.server";
import { env } from "~/lib/env.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user, docsUrl: env.docsUrl };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { user, docsUrl } = loaderData;
  return (
    <Toaster>
    <Flex style={{ minHeight: "100vh" }}>
      <Sidebar role={user.role} docsUrl={docsUrl} />
      <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
        <TopBar user={user} />
        <Box p="5" style={{ flex: 1 }}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
    </Toaster>
  );
}
