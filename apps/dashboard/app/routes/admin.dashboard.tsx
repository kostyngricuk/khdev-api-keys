import { Grid } from "@radix-ui/themes";
import type { StatsResponse } from "@khdev/contracts";
import { Kpi } from "~/components/Kpi";
import { PageHeader } from "~/components/PageHeader";
import { useI18n } from "~/i18n/context";
import { api } from "~/lib/api.server";
import { requireRole } from "~/lib/auth.server";
import { pageTitle } from "~/lib/meta";
import type { Route } from "./+types/admin.dashboard";

export const meta: Route.MetaFunction = ({ matches }) => pageTitle(matches, "dashboard.title");

/** Admin landing page: all-time totals and the last 24 hours, without filters. */
export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "admin");
  return { stats: await api<StatsResponse>(request, "/admin/stats") };
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} />
      <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4">
        <Kpi
          label={t("stats.customers")}
          value={stats.totalCustomers}
          hint={t("stats.activeHint", { n: stats.customersByStatus.active })}
        />
        <Kpi label={t("stats.apiKeys")} value={stats.totalKeys} hint={t("stats.activeHint", { n: stats.keysByStatus.active })} />
        <Kpi label={t("stats.newCustomers24h")} value={stats.newCustomers24h} hint={t("stats.last24hHint")} />
        <Kpi label={t("stats.newKeys24h")} value={stats.newKeys24h} hint={t("stats.last24hHint")} />
      </Grid>
    </>
  );
}
