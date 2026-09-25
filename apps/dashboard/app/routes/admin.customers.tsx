import { AlertDialog, Button, Card, Flex, Table, Text } from "@radix-ui/themes";
import { USER_STATUSES, type AdminCustomer, type Paginated, type UserStatus } from "@khdev/contracts";
import { useState } from "react";
import { useFetcher } from "react-router";
import { EmptyState } from "~/components/EmptyState";
import { Filters } from "~/components/Filters";
import { PageHeader } from "~/components/PageHeader";
import { Pagination } from "~/components/Pagination";
import { PlatformBadge } from "~/components/PlatformBadge";
import { UserStatusBadge } from "~/components/StatusBadge";
import { StatusMenu } from "~/components/StatusMenu";
import { useActionToast } from "~/components/Toaster";
import { runAction, type ActionResult } from "~/lib/actions.server";
import { api } from "~/lib/api.server";
import { requireRole } from "~/lib/auth.server";
import { USER_STATUS_COLORS } from "~/lib/colors";
import { parseFilters, toApiQuery } from "~/lib/filters";
import { formatDate } from "~/lib/format";
import type { Route } from "./+types/admin.customers";

export const meta: Route.MetaFunction = () => [{ title: "Customers · KHDev Keys" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "admin");
  const filters = parseFilters(new URL(request.url), { statuses: USER_STATUSES, allowEmail: true });
  const customers = await api<Paginated<AdminCustomer>>(request, `/admin/customers?${toApiQuery(filters)}`);
  return { customers, filters };
}

export async function action({ request }: Route.ActionArgs) {
  await requireRole(request, "admin");
  const form = await request.formData();
  const id = encodeURIComponent(String(form.get("id") ?? ""));
  const status = String(form.get("status") ?? "");
  return runAction(
    () => api(request, `/admin/customers/${id}/status`, { method: "PATCH", json: { status } }),
    `The customer is now ${status}`,
  );
}

const CONFIRM: Partial<Record<UserStatus, string>> = {
  blocked: "The customer is signed out and cannot sign in. Their keys stop working in plugins.",
  removed:
    "The customer is signed out and will see “User not found” when signing in. Their keys stop working. This cannot be undone, but the email can be invited again.",
};

function StatusSelect({ customer }: { customer: AdminCustomer }) {
  const fetcher = useFetcher<ActionResult>();
  const [pending, setPending] = useState<UserStatus | null>(null);
  useActionToast(fetcher.data);
  const optimistic = (fetcher.formData?.get("status") as UserStatus | undefined) ?? customer.status;

  if (customer.status === "removed") return <UserStatusBadge status="removed" />;

  const submit = (status: UserStatus) => fetcher.submit({ id: customer.id, status }, { method: "post" });

  return (
    <>
      <StatusMenu
        label="Customer status"
        value={optimistic}
        options={USER_STATUSES}
        colors={USER_STATUS_COLORS}
        disabled={fetcher.state !== "idle"}
        onSelect={(status) => (CONFIRM[status] ? setPending(status) : submit(status))}
      />
      <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialog.Content maxWidth="460px">
          <AlertDialog.Title>
            {pending === "removed" ? "Remove" : "Block"} {customer.email}?
          </AlertDialog.Title>
          <AlertDialog.Description size="2">{pending ? CONFIRM[pending] : null}</AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color={pending === "removed" ? "red" : "amber"} onClick={() => pending && submit(pending)}>
                {pending === "removed" ? "Remove" : "Block"}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}

export default function CustomersPage({ loaderData }: Route.ComponentProps) {
  const { customers, filters } = loaderData;
  return (
    <>
      <PageHeader title="Customers" description="Invited customers and their status. Change the status to block or remove a customer." />
      <Filters filters={filters} statuses={USER_STATUSES} showEmail />
      <Card>
        {customers.items.length === 0 ? (
          <EmptyState title="No customers found" hint="Change the filters to see more customers." />
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Keys</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Platforms</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Invited</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Last sign-in</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {customers.items.map((customer) => (
                <Table.Row key={customer.id} align="center">
                  <Table.RowHeaderCell>
                    <Text size="2" weight="medium">
                      {customer.email}
                    </Text>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <StatusSelect customer={customer} />
                  </Table.Cell>
                  <Table.Cell>{customer.keysCount}</Table.Cell>
                  <Table.Cell>
                    <Flex gap="1" wrap="wrap">
                      {customer.platforms.length === 0 ? (
                        <Text color="gray">—</Text>
                      ) : (
                        customer.platforms.map((p) => <PlatformBadge key={p} platform={p} />)
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>{formatDate(customer.invitedAt)}</Table.Cell>
                  <Table.Cell>{formatDate(customer.lastLoginAt)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Card>
      <Pagination total={customers.total} page={customers.page} pageSize={customers.pageSize} />
    </>
  );
}
