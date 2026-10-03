import {
  Button,
  Card,
  ClickableCard,
  Dialog,
  DialogHeader,
  HStack,
  Icon,
  pixel,
  proportional,
  Table,
  Text,
  VStack,
  type TableColumn,
} from "@astryxdesign/core";
import { ExternalLink, Plus } from "lucide-react";
import { KEY_STATUSES, type CustomerKey, type Paginated, type Platform, type Solution } from "@khdev/contracts";
import { useState } from "react";
import { CopyButton } from "~/components/CopyButton";
import { EmptyState } from "~/components/EmptyState";
import { Filters } from "~/components/Filters";
import { KeyActions } from "~/components/KeyActions";
import { PageHeader } from "~/components/PageHeader";
import { Pagination } from "~/components/Pagination";
import { PlatformIcon } from "~/components/PlatformIcon";
import { SolutionLabel } from "~/components/SolutionLabel";
import { KeyStatusBadge } from "~/components/StatusBadge";
import { api } from "~/lib/api.server";
import { requireRole } from "~/lib/auth.server";
import { env } from "~/lib/env.server";
import { parseFilters, toApiQuery } from "~/lib/filters";
import { useI18n } from "~/i18n/context";
import { formatDate, maskKey } from "~/lib/format";
import { pageTitle } from "~/lib/meta";
import { handleKeyAction } from "~/lib/key-actions.server";
import type { Route } from "./+types/keys";

export const meta: Route.MetaFunction = ({ matches }) => pageTitle(matches, "keys.title");

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "customer");
  const filters = parseFilters(new URL(request.url), { statuses: KEY_STATUSES });
  const [keys, solutions] = await Promise.all([
    api<Paginated<CustomerKey>>(request, `/keys?${toApiQuery(filters)}`),
    api<Solution[]>(request, "/solutions"),
  ]);
  return { keys, filters, solutions, storeUrls: env.storeUrls };
}

export async function action({ request }: Route.ActionArgs) {
  await requireRole(request, "customer");
  return handleKeyAction(request, { allowLimit: false });
}

function GetKeyDialog({ solutions, storeUrls }: { solutions: Solution[]; storeUrls: Record<Platform, string> }) {
  const { t, solutionName } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        icon={<Icon icon={Plus} size="sm" color="inherit" />}
        label={t("keys.getNewKey")}
        onClick={() => setOpen(true)}
      />
      <Dialog isOpen={open} onOpenChange={setOpen} width={460}>
        <DialogHeader title={t("keys.getNewKey")} subtitle={t("keys.getNewKeyDescription")} onOpenChange={setOpen} />
        <VStack gap={2}>
          {solutions.map((solution) => (
            <ClickableCard
              key={solution.slug}
              label={`${solutionName(solution)} — ${t("keys.openStore")}`}
              href={solution.storeUrl ?? storeUrls[solution.platform]}
              target="_blank"
            >
              <HStack justify="between" vAlign="center">
                <HStack gap={2} vAlign="center">
                  <PlatformIcon platform={solution.platform} size={24} focusable={false} />
                  <Text size="sm" weight="medium">
                    {solutionName(solution)}
                  </Text>
                </HStack>
                <HStack gap={1} vAlign="center">
                  <Text size="sm" color="secondary">
                    {t("keys.openStore")}
                  </Text>
                  <Icon icon={ExternalLink} size="xsm" color="disabled" />
                </HStack>
              </HStack>
            </ClickableCard>
          ))}
        </VStack>
        <HStack justify="end" style={{ marginTop: 16 }}>
          <Button variant="secondary" label={t("common.close")} onClick={() => setOpen(false)} />
        </HStack>
      </Dialog>
    </>
  );
}

// Data-driven columns: Astryx cells cap their width (max-width: 0), so only `columns[].width`
// sizes them — in children mode every column gets an equal share and the solution name clips.
function useKeyColumns(): TableColumn<CustomerKey>[] {
  const { t } = useI18n();
  return [
    {
      key: "key",
      header: t("keys.colKey"),
      width: proportional(1, { minWidth: 170 }),
      renderCell: (item) => (
        <HStack gap={2} vAlign="center">
          <Text size="sm" className="key-mono">
            {maskKey(item.key)}
          </Text>
          <CopyButton value={item.key} />
        </HStack>
      ),
    },
    {
      key: "solution",
      header: t("keys.colSolution"),
      width: proportional(1.5, { minWidth: 200 }),
      renderCell: (item) => <SolutionLabel solution={item.solution} platform={item.platform} />,
    },
    { key: "status", header: t("keys.colStatus"), width: pixel(130), renderCell: (item) => <KeyStatusBadge status={item.status} /> },
    {
      key: "activations",
      header: t("keys.colActivations"),
      width: pixel(110),
      renderCell: (item) => (
        // Astryx Text has no amber/warning color; the theme's warning token keeps the old signal.
        <Text size="sm" style={item.activationsUsed >= item.activationLimit ? { color: "var(--color-warning)" } : undefined}>
          {item.activationsUsed} / {item.activationLimit}
        </Text>
      ),
    },
    { key: "createdAt", header: t("keys.colCreated"), width: pixel(110), renderCell: (item) => formatDate(item.createdAt) },
    { key: "expiresAt", header: t("keys.colExpires"), width: pixel(130), renderCell: (item) => formatDate(item.expiresAt) },
    { key: "actions", header: "", width: pixel(56), align: "end", renderCell: (item) => <KeyActions keyItem={item} /> },
  ];
}

export default function KeysPage({ loaderData }: Route.ComponentProps) {
  const { t } = useI18n();
  const { keys, filters, solutions, storeUrls } = loaderData;
  const columns = useKeyColumns();
  return (
    <>
      <PageHeader title={t("keys.title")} description={t("keys.description")} actions={<GetKeyDialog solutions={solutions} storeUrls={storeUrls} />} />
      <Filters filters={filters} statuses={KEY_STATUSES} solutions={solutions} />
      <Card>
        {keys.items.length === 0 ? (
          <EmptyState title={t("keys.emptyTitle")} hint={t("keys.emptyHint")} />
        ) : (
          <Table data={keys.items} columns={columns} idKey="id" />
        )}
      </Card>
      <Pagination total={keys.total} page={keys.page} pageSize={keys.pageSize} />
    </>
  );
}
