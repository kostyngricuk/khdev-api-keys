import { Card, Flex, Table, Text } from "@radix-ui/themes";
import { KEY_STATUSES, type AdminKey, type Paginated } from "@khdev/contracts";
import { useFetcher } from "react-router";
import { EmptyState } from "~/components/EmptyState";
import { Filters } from "~/components/Filters";
import { KeyActions } from "~/components/KeyActions";
import { PageHeader } from "~/components/PageHeader";
import { Pagination } from "~/components/Pagination";
import { PlatformBadge } from "~/components/PlatformBadge";
import { KeyStatusBadge } from "~/components/StatusBadge";
import { StatusMenu } from "~/components/StatusMenu";
import { useActionToast } from "~/components/Toaster";
import type { ActionResult } from "~/lib/actions.server";
import { KEY_STATUS_COLORS } from "~/lib/colors";
import { api } from "~/lib/api.server";
import { requireRole } from "~/lib/auth.server";
import { parseFilters, toApiQuery } from "~/lib/filters";
import { formatDate } from "~/lib/format";
import { handleKeyAction } from "~/lib/key-actions.server";
import type { Route } from "./+types/admin.keys";

export const meta: Route.MetaFunction = () => [{ title: "All API Keys · KHDev Keys" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "admin");
  const filters = parseFilters(new URL(request.url), { statuses: KEY_STATUSES, allowEmail: true });
  const keys = await api<Paginated<AdminKey>>(request, `/admin/keys?${toApiQuery(filters)}`);
  return { keys, filters };
}

export async function action({ request }: Route.ActionArgs) {
  await requireRole(request, "admin");
  return handleKeyAction(request, { allowLimit: true });
}

const SETTABLE_KEY_STATUSES = ["active", "inactive"] as const;

/** Admins change a key's status from its badge; expired keys can only be extended (row menu). */
function KeyStatusCell({ item }: { item: AdminKey }) {
  const fetcher = useFetcher<ActionResult>();
  useActionToast(fetcher.data);
  const optimistic = (fetcher.formData?.get("status") as AdminKey["status"] | undefined) ?? item.status;
  if (optimistic === "expired") return <KeyStatusBadge status="expired" />;
  return (
    <StatusMenu
      label="Key status"
      value={optimistic}
      options={SETTABLE_KEY_STATUSES}
      colors={KEY_STATUS_COLORS}
      disabled={fetcher.state !== "idle"}
      onSelect={(status) => fetcher.submit({ intent: "status", id: item.id, status }, { method: "post" })}
    />
  );
}

export default function AdminKeysPage({ loaderData }: Route.ComponentProps) {
  const { keys, filters } = loaderData;
  return (
    <>
      <PageHeader title="All API Keys" description="Every customer key. Keys are masked: only the first and last 4 characters are shown." />
      <Filters filters={filters} statuses={KEY_STATUSES} showEmail />
      <Card>
        {keys.items.length === 0 ? (
          <EmptyState title="No keys found" hint="Change the filters to see more keys." />
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Key</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Customer</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Platform</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Activations</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Expires</Table.ColumnHeaderCell>
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
                    <PlatformBadge platform={item.platform} />
                  </Table.Cell>
                  <Table.Cell>
                    <KeyStatusCell item={item} />
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
