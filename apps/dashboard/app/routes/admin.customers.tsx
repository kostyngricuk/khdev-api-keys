import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { AlertDialog, Button, Card, DropdownMenu, Flex, IconButton, Table, Text } from "@radix-ui/themes";
import { USER_STATUSES, type AdminCustomer, type Paginated, type Solution, type UserStatus } from "@khdev/contracts";
import { Fragment, useState } from "react";
import { useFetcher } from "react-router";
import { EmptyState } from "~/components/EmptyState";
import { Filters } from "~/components/Filters";
import { PageHeader } from "~/components/PageHeader";
import { Pagination } from "~/components/Pagination";
import { SolutionLabel } from "~/components/SolutionLabel";
import { UserStatusBadge } from "~/components/StatusBadge";
import { useActionToast } from "~/components/Toaster";
import { runAction, type ActionResult } from "~/lib/actions.server";
import { api } from "~/lib/api.server";
import { requireRole } from "~/lib/auth.server";
import { parseFilters, toApiQuery } from "~/lib/filters";
import { useI18n } from "~/i18n/context";
import { formatDate } from "~/lib/format";
import { serverI18n } from "~/lib/i18n.server";
import { pageTitle } from "~/lib/meta";
import type { Route } from "./+types/admin.customers";

export const meta: Route.MetaFunction = ({ matches }) => pageTitle(matches, "customers.title");

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "admin");
  const filters = parseFilters(new URL(request.url), { statuses: USER_STATUSES, allowEmail: true });
  const [customers, solutions] = await Promise.all([
    api<Paginated<AdminCustomer>>(request, `/admin/customers?${toApiQuery(filters)}`),
    api<Solution[]>(request, "/solutions"),
  ]);
  return { customers, filters, solutions };
}

export async function action({ request }: Route.ActionArgs) {
  await requireRole(request, "admin");
  const form = await request.formData();
  const id = encodeURIComponent(String(form.get("id") ?? ""));
  const status = String(form.get("status") ?? "");
  const { t } = serverI18n(request);
  return runAction(
    request,
    () => api(request, `/admin/customers/${id}/status`, { method: "PATCH", json: { status } }),
    "toast.customerStatus",
    { status: t(`status.${status}`).toLowerCase() },
  );
}

type MenuItem = { status: UserStatus; labelKey: string; color?: "amber" | "red" };

/** Status changes offered per current status; removed customers are final (invite the email again). */
const ACTIONS: Record<Exclude<UserStatus, "removed">, MenuItem[]> = {
  inactive: [
    { status: "active", labelKey: "customers.activate" },
    { status: "blocked", labelKey: "customers.block", color: "amber" },
    { status: "removed", labelKey: "customers.remove", color: "red" },
  ],
  active: [
    { status: "inactive", labelKey: "customers.deactivate" },
    { status: "blocked", labelKey: "customers.block", color: "amber" },
    { status: "removed", labelKey: "customers.remove", color: "red" },
  ],
  blocked: [
    { status: "active", labelKey: "customers.unblock" },
    { status: "removed", labelKey: "customers.remove", color: "red" },
  ],
};

/** Status changes that need a confirmation, with their dialog texts. */
const CONFIRM: Partial<Record<UserStatus, { title: string; text: string; action: string }>> = {
  blocked: { title: "customers.blockTitle", text: "customers.blockText", action: "customers.block" },
  removed: { title: "customers.removeTitle", text: "customers.removeText", action: "customers.remove" },
};

function CustomerActions({ customer }: { customer: AdminCustomer }) {
  const { t } = useI18n();
  const fetcher = useFetcher<ActionResult>();
  const [pending, setPending] = useState<UserStatus | null>(null);
  useActionToast(fetcher.data);

  if (customer.status === "removed") return null;
  const submit = (status: UserStatus) => fetcher.submit({ id: customer.id, status }, { method: "post" });
  const items = ACTIONS[customer.status];
  const firstDanger = items.findIndex((item) => item.color);
  const confirm = pending ? CONFIRM[pending] : undefined;

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton variant="ghost" color="gray" aria-label={t("customers.actionsFor", { email: customer.email })} loading={fetcher.state !== "idle"}>
            <DotsHorizontalIcon />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {items.map((item, index) => (
            <Fragment key={item.status}>
              {index === firstDanger && index > 0 && <DropdownMenu.Separator />}
              <DropdownMenu.Item
                color={item.color}
                onSelect={() => (CONFIRM[item.status] ? setPending(item.status) : submit(item.status))}
              >
                {t(item.labelKey)}
              </DropdownMenu.Item>
            </Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialog.Content maxWidth="460px">
          <AlertDialog.Title>{confirm ? t(confirm.title, { email: customer.email }) : null}</AlertDialog.Title>
          <AlertDialog.Description size="2">{confirm ? t(confirm.text) : null}</AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="outline" color="gray" highContrast>
                {t("common.cancel")}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color={pending === "removed" ? "red" : "amber"} onClick={() => pending && submit(pending)}>
                {confirm ? t(confirm.action) : null}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}

export default function CustomersPage({ loaderData }: Route.ComponentProps) {
  const { t } = useI18n();
  const { customers, filters, solutions } = loaderData;
  return (
    <>
      <PageHeader title={t("customers.title")} description={t("customers.description")} />
      <Filters filters={filters} statuses={USER_STATUSES} solutions={solutions} showEmail />
      <Card>
        {customers.items.length === 0 ? (
          <EmptyState title={t("customers.emptyTitle")} hint={t("customers.emptyHint")} />
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t("customers.colEmail")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("customers.colStatus")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("customers.colKeys")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("customers.colSolutions")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("customers.colInvited")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t("customers.colLastSignIn")}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
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
                    <UserStatusBadge status={customer.status} />
                  </Table.Cell>
                  <Table.Cell>{customer.keysCount}</Table.Cell>
                  <Table.Cell>
                    <Flex direction="column" gap="1">
                      {customer.solutions.length === 0 ? (
                        <Text color="gray">—</Text>
                      ) : (
                        customer.solutions.map((s) => (
                          <SolutionLabel key={s.slug} solution={s} platform={s.platform} />
                        ))
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>{formatDate(customer.invitedAt)}</Table.Cell>
                  <Table.Cell>{formatDate(customer.lastLoginAt)}</Table.Cell>
                  <Table.Cell justify="end">
                    <CustomerActions customer={customer} />
                  </Table.Cell>
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
