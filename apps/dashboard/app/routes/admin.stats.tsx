import { Box, Flex, Grid, Heading, Separator, Text } from "@radix-ui/themes";
import { KEY_STATUSES, USER_STATUSES, type Solution, type StatsResponse } from "@khdev/contracts";
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
  const [stats, solutions] = await Promise.all([
    api<StatsResponse>(request, `/admin/stats?${toApiQuery(filters)}`),
    api<Solution[]>(request, "/solutions"),
  ]);
  return { stats, filters, solutions };
}


/** A titled group of charts ("Keys", "Customers"). */
function StatsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box asChild mb="6">
      <section aria-label={title}>
        <Flex align="center" gap="3" mb="3">
          <Heading as="h2" size="4">
            {title}
          </Heading>
          <Separator size="4" style={{ flex: 1 }} />
        </Flex>
        {children}
      </section>
    </Box>
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
  const { stats, filters, solutions } = loaderData;
  const { t, locale, solutionName } = useI18n();

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
    label: solutionName(s),
    value: s.count,
    color: PLATFORM_COLORS[s.platform],
  }));
  const customerPlatformRows: ChartRow[] = CHART_PLATFORM_ORDER.map((p) => ({
    label: platformLabel(p, locale),
    value: stats.customersByPlatform[p],
    color: PLATFORM_COLORS[p],
  }));
  const monthRows: ChartRow[] = stats.keysPerMonth.map((m) => ({
    label: formatMonth(m.month, locale),
    value: m.count,
  }));

  return (
    <>
      <PageHeader title={t("stats.title")} description={t("stats.description")} />
      <Filters filters={filters} statuses={[]} solutions={solutions} showStatus={false} />
      <StatsSection title={t("stats.sectionKeys")}>
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
        </Grid>
      </StatsSection>
      <StatsSection title={t("stats.sectionCustomers")}>
        <Grid columns={{ initial: "1", lg: "2" }} gap="4">
          <ChartCard
            title={t("stats.customersByStatus")}
            rows={customerStatusRows}
            valueLabel={t("stats.valueCustomers")}
          >
            <StatusBarChart rows={customerStatusRows} />
          </ChartCard>
          <ChartCard
            title={t("stats.customersByPlatform")}
            description={t("stats.customersByPlatformHint")}
            rows={customerPlatformRows}
            valueLabel={t("stats.valueCustomers")}
          >
            <CategoryBarChart rows={customerPlatformRows} />
          </ChartCard>
        </Grid>
      </StatsSection>
    </>
  );
}
