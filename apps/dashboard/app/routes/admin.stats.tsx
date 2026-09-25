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
import { intlLocale, type Locale } from "~/i18n";
import { useI18n } from "~/i18n/context";
import { platformLabel } from "~/lib/format";
import { pageTitle } from "~/lib/meta";
import type { Route } from "./+types/admin.stats";

export const meta: Route.MetaFunction = ({ matches }) => pageTitle(matches, "stats.title");

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "admin");
  const filters = parseFilters(new URL(request.url), { statuses: [] });
  const stats = await api<StatsResponse>(request, `/admin/stats?${toApiQuery(filters)}`);
  return { stats, filters };
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const { locale } = useI18n();
  return (
    <Card size="2">
      <Text as="div" size="2" color="gray">
        {label}
      </Text>
      <Text as="div" size="8" weight="bold" mt="1">
        {value.toLocaleString(intlLocale(locale))}
      </Text>
      {hint && (
        <Text as="div" size="1" color="gray" mt="1">
          {hint}
        </Text>
      )}
    </Card>
  );
}

function formatMonth(month: string, locale: Locale) {
  const [year, m] = month.split("-");
  return new Date(Date.UTC(Number(year), Number(m) - 1, 1)).toLocaleString(intlLocale(locale), {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function StatsPage({ loaderData }: Route.ComponentProps) {
  const { stats, filters } = loaderData;
  const { t, locale } = useI18n();

  const platformRows: ChartRow[] = CHART_PLATFORM_ORDER.map((p) => ({
    label: platformLabel(p, locale),
    value: stats.keysByPlatform[p],
    color: PLATFORM_COLORS[p],
  }));
  const keyStatusRows: ChartRow[] = KEY_STATUSES.map((s) => ({
    label: t(`status.${s}`),
    value: stats.keysByStatus[s],
    color: statusHex(KEY_STATUS_COLORS[s]),
  }));
  const customerStatusRows: ChartRow[] = USER_STATUSES.map((s) => ({
    label: t(`status.${s}`),
    value: stats.customersByStatus[s],
    color: statusHex(USER_STATUS_COLORS[s]),
  }));
  const solutionRows: ChartRow[] = stats.keysBySolution.map((s) => ({
    label: s.name,
    value: s.count,
    color: PLATFORM_COLORS[s.platform],
  }));
  const monthRows: ChartRow[] = stats.keysPerMonth.map((m) => ({ label: formatMonth(m.month, locale), value: m.count }));
  const activeCustomers = stats.customersByStatus.active;

  return (
    <>
      <PageHeader title={t("stats.title")} description={t("stats.description")} />
      <Filters filters={filters} statuses={[]} showStatus={false} />
      <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4" mb="4">
        <Kpi label={t("stats.customers")} value={stats.totalCustomers} hint={t("stats.activeHint", { n: activeCustomers })} />
        <Kpi label={t("stats.apiKeys")} value={stats.totalKeys} hint={t("stats.activeHint", { n: stats.keysByStatus.active })} />
        <Kpi label={t("stats.expiredKeys")} value={stats.keysByStatus.expired} />
        <Kpi label={t("stats.activations")} value={stats.totalActivations} hint={t("stats.activationsHint")} />
      </Grid>
      <Grid columns={{ initial: "1", lg: "2" }} gap="4">
        <ChartCard title={t("stats.keysByPlatform")} rows={platformRows} valueLabel={t("stats.valueKeys")}>
          <CategoryBarChart rows={platformRows} />
        </ChartCard>
        <ChartCard title={t("stats.keysPerMonth")} rows={monthRows} valueLabel={t("stats.valueKeys")}>
          {monthRows.length === 0 ? (
            <Flex align="center" justify="center" style={{ height: "100%" }}>
              <Text color="gray">{t("stats.noKeysInPeriod")}</Text>
            </Flex>
          ) : (
            <TrendLineChart rows={monthRows} />
          )}
        </ChartCard>
        <ChartCard
          title={t("stats.keysBySolution")}
          description={t("stats.keysBySolutionHint")}
          rows={solutionRows}
          valueLabel={t("stats.valueKeys")}
        >
          {solutionRows.length === 0 ? (
            <Flex align="center" justify="center" style={{ height: "100%" }}>
              <Text color="gray">{t("stats.noKeysInPeriod")}</Text>
            </Flex>
          ) : (
            <CategoryBarChart rows={solutionRows} />
          )}
        </ChartCard>
        <ChartCard title={t("stats.keysByStatus")} rows={keyStatusRows} valueLabel={t("stats.valueKeys")}>
          <StatusBarChart rows={keyStatusRows} />
        </ChartCard>
        <ChartCard title={t("stats.customersByStatus")} rows={customerStatusRows} valueLabel={t("stats.valueCustomers")}>
          <StatusBarChart rows={customerStatusRows} />
        </ChartCard>
      </Grid>
    </>
  );
}
