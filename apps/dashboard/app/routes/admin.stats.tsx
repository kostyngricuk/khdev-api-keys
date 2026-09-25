import { Card, Flex, Grid, Text } from "@radix-ui/themes";
import { KEY_STATUSES, USER_STATUSES, type StatsResponse } from "@khdev/contracts";
import { ChartCard, type ChartRow } from "~/components/ChartCard";
import { CategoryBarChart, StatusBarChart, TrendLineChart } from "~/components/Charts";
import { Filters } from "~/components/Filters";
import { PageHeader } from "~/components/PageHeader";
import { api } from "~/lib/api.server";
import { requireRole } from "~/lib/auth.server";
import { CHART_PLATFORM_ORDER, KEY_STATUS_COLORS, PLATFORM_COLORS, statusHex, USER_STATUS_COLORS } from "~/lib/colors";
import { parseFilters, toApiQuery } from "~/lib/filters";
import { platformLabel, statusLabel } from "~/lib/format";
import type { Route } from "./+types/admin.stats";

export const meta: Route.MetaFunction = () => [{ title: "Statistics · KHDev Keys" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "admin");
  const filters = parseFilters(new URL(request.url), { statuses: [] });
  const stats = await api<StatsResponse>(request, `/admin/stats?${toApiQuery(filters)}`);
  return { stats, filters };
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card size="2">
      <Text as="div" size="2" color="gray">
        {label}
      </Text>
      <Text as="div" size="8" weight="bold" mt="1">
        {value.toLocaleString("en-US")}
      </Text>
      {hint && (
        <Text as="div" size="1" color="gray" mt="1">
          {hint}
        </Text>
      )}
    </Card>
  );
}

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return new Date(Date.UTC(Number(year), Number(m) - 1, 1)).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export default function StatsPage({ loaderData }: Route.ComponentProps) {
  const { stats, filters } = loaderData;

  const platformRows: ChartRow[] = CHART_PLATFORM_ORDER.map((p) => ({
    label: platformLabel(p),
    value: stats.keysByPlatform[p],
    color: PLATFORM_COLORS[p],
  }));
  const keyStatusRows: ChartRow[] = KEY_STATUSES.map((s) => ({
    label: statusLabel(s),
    value: stats.keysByStatus[s],
    color: statusHex(KEY_STATUS_COLORS[s]),
  }));
  const customerStatusRows: ChartRow[] = USER_STATUSES.map((s) => ({
    label: statusLabel(s),
    value: stats.customersByStatus[s],
    color: statusHex(USER_STATUS_COLORS[s]),
  }));
  const solutionRows: ChartRow[] = stats.keysBySolution.map((s) => ({
    label: s.name,
    value: s.count,
    color: PLATFORM_COLORS[s.platform],
  }));
  const monthRows: ChartRow[] = stats.keysPerMonth.map((m) => ({ label: formatMonth(m.month), value: m.count }));
  const activeCustomers = stats.customersByStatus.active;

  return (
    <>
      <PageHeader title="Statistics" description="Keys and customers for the selected period. Dates filter by creation date." />
      <Filters filters={filters} statuses={[]} showStatus={false} />
      <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4" mb="4">
        <Kpi label="Customers" value={stats.totalCustomers} hint={`${activeCustomers} active`} />
        <Kpi label="API keys" value={stats.totalKeys} hint={`${stats.keysByStatus.active} active`} />
        <Kpi label="Expired keys" value={stats.keysByStatus.expired} />
        <Kpi label="Activations" value={stats.totalActivations} hint="Domains activated in the period" />
      </Grid>
      <Grid columns={{ initial: "1", lg: "2" }} gap="4">
        <ChartCard title="Keys by platform" rows={platformRows} valueLabel="Keys">
          <CategoryBarChart rows={platformRows} />
        </ChartCard>
        <ChartCard title="Keys created per month" rows={monthRows} valueLabel="Keys">
          {monthRows.length === 0 ? (
            <Flex align="center" justify="center" style={{ height: "100%" }}>
              <Text color="gray">No keys in this period</Text>
            </Flex>
          ) : (
            <TrendLineChart rows={monthRows} />
          )}
        </ChartCard>
        <ChartCard title="Keys by solution" description="Bars use the solution's platform color" rows={solutionRows} valueLabel="Keys">
          {solutionRows.length === 0 ? (
            <Flex align="center" justify="center" style={{ height: "100%" }}>
              <Text color="gray">No keys in this period</Text>
            </Flex>
          ) : (
            <CategoryBarChart rows={solutionRows} />
          )}
        </ChartCard>
        <ChartCard title="Keys by status" rows={keyStatusRows} valueLabel="Keys">
          <StatusBarChart rows={keyStatusRows} />
        </ChartCard>
        <ChartCard title="Customers by status" rows={customerStatusRows} valueLabel="Customers">
          <StatusBarChart rows={customerStatusRows} />
        </ChartCard>
      </Grid>
    </>
  );
}
