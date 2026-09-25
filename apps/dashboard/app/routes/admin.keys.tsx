import { Card, Flex, Table, Text } from "@radix-ui/themes";
import { KEY_STATUSES, type AdminKey, type Paginated, type Solution } from "@khdev/contracts";
import { EmptyState } from "~/components/EmptyState";
import { Filters } from "~/components/Filters";
import { KeyActions } from "~/components/KeyActions";
import { PageHeader } from "~/components/PageHeader";
import { Pagination } from "~/components/Pagination";
import { SolutionLabel } from "~/components/SolutionLabel";
import { KeyStatusBadge } from "~/components/StatusBadge";
import { api } from "~/lib/api.server";
import { requireRole } from "~/lib/auth.server";
import { parseFilters, toApiQuery } from "~/lib/filters";
import { useI18n } from "~/i18n/context";
import { formatDate } from "~/lib/format";
import { pageTitle } from "~/lib/meta";
import { handleKeyAction } from "~/lib/key-actions.server";
import type { Route } from "./+types/admin.keys";

export const meta: Route.MetaFunction = ({ matches }) => pageTitle(matches, "adminKeys.title");

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "admin");
  const filters = parseFilters(new URL(request.url), { statuses: KEY_STATUSES, allowEmail: true });
  const [keys, solutions] = await Promise.all([
    api<Paginated<AdminKey>>(request, `/admin/keys?${toApiQuery(filters)}`),
    api<Solution[]>(request, "/solutions"),
  ]);
  return { keys, filters, solutions };
}

export async function action({ request }: Route.ActionArgs) {
  await requireRole(request, "admin");
  return handleKeyAction(request, { allowLimit: true });
}

export default function AdminKeysPage({ loaderData }: Route.ComponentProps) {
  const { t } = useI18n();
  const { keys, filters, solutions } = loaderData;
  return (
    <>
      <PageHeader title={t("adminKeys.title")} description={t("adminKeys.description")} />
      <Filters filters={filters} statuses={KEY_STATUSES} solutions={solutions} showEmail />
      <Card>
        {keys.items.length === 0 ? (
          <EmptyState title={t("keys.emptyTitle")} hint={t("adminKeys.emptyHint")} />
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t("keys.colKey")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("keys.colCustomer")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("keys.colSolution")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("keys.colStatus")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("keys.colActivations")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("keys.colCreated")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("keys.colExpires")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {keys.items.map((item) => (
                <Table.Row key={item.id} align="center">
                  <Table.RowHeaderCell>
                    <Text size="2" className="key-mono">
                      {item.key}
                    </Text>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <Text size="2">{item.email}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <SolutionLabel solution={item.solution} platform={item.platform} />
                  </Table.Cell>
                  <Table.Cell>
                    <KeyStatusBadge status={item.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="1">
                      <Text color={item.activationsUsed >= item.activationLimit ? "amber" : undefined}>
                        {item.activationsUsed} / {item.activationLimit}
                      </Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>{formatDate(item.createdAt)}</Table.Cell>
                  <Table.Cell>{formatDate(item.expiresAt)}</Table.Cell>
                  <Table.Cell justify="end">
                    <KeyActions keyItem={item} canEditLimit />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Card>
      <Pagination total={keys.total} page={keys.page} pageSize={keys.pageSize} />
    </>
  );
}
