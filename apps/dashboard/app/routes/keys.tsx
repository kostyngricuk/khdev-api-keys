import { ExternalLinkIcon, PlusIcon } from "@radix-ui/react-icons";
import { Button, Card, Dialog, Flex, Table, Text } from "@radix-ui/themes";
import { KEY_STATUSES, type CustomerKey, type Paginated, type Platform, type Solution } from "@khdev/contracts";
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
import { formatDate, maskKey } from "~/lib/format";
import { handleKeyAction } from "~/lib/key-actions.server";
import type { Route } from "./+types/keys";

export const meta: Route.MetaFunction = () => [{ title: "API Keys · KHDev Keys" }];

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
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>
          <PlusIcon /> Get a new key
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="460px">
        <Dialog.Title>Get a new key</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          A license key is created automatically after you buy a solution. Choose one to open its store page. The new key
          appears on this page as soon as the purchase is confirmed.
        </Dialog.Description>
        <Flex direction="column" gap="2">
          {solutions.map((solution) => (
            <Card key={solution.slug} asChild>
              <a
                href={solution.storeUrl ?? storeUrls[solution.platform]}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Flex justify="between" align="center" gap="3">
                  <Flex align="center" gap="2">
                    <PlatformIcon platform={solution.platform} size={24} />
                    <Text size="2" weight="medium">
                      {solution.name}
                    </Text>
                  </Flex>
                  <Flex align="center" gap="1">
                    <Text size="2" color="gray">
                      Open store
                    </Text>
                    <ExternalLinkIcon color="var(--gray-9)" />
                  </Flex>
                </Flex>
              </a>
            </Card>
          ))}
        </Flex>
        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function KeyRow({ item }: { item: CustomerKey }) {
  return (
    <Table.Row align="center">
      <Table.RowHeaderCell>
        <Flex align="center" gap="2">
          <Text size="2" className="key-mono">
            {maskKey(item.key)}
          </Text>
          <CopyButton value={item.key} />
        </Flex>
      </Table.RowHeaderCell>
      <Table.Cell>
        <SolutionLabel solution={item.solution} platform={item.platform} />
      </Table.Cell>
      <Table.Cell>
        <KeyStatusBadge status={item.status} />
      </Table.Cell>
      <Table.Cell>
        <Text color={item.activationsUsed >= item.activationLimit ? "amber" : undefined}>
          {item.activationsUsed} / {item.activationLimit}
        </Text>
      </Table.Cell>
      <Table.Cell>{formatDate(item.createdAt)}</Table.Cell>
      <Table.Cell>{formatDate(item.expiresAt)}</Table.Cell>
      <Table.Cell justify="end">
        <KeyActions keyItem={item} />
      </Table.Cell>
    </Table.Row>
  );
}

export default function KeysPage({ loaderData }: Route.ComponentProps) {
  const { keys, filters, solutions, storeUrls } = loaderData;
  return (
    <>
      <PageHeader
        title="API Keys"
        description="Copy a key into your plugin settings. Each key works on up to its activation limit of domains."
        actions={<GetKeyDialog solutions={solutions} storeUrls={storeUrls} />}
      />
      <Filters filters={filters} statuses={KEY_STATUSES} solutions={solutions} />
      <Card>
        {keys.items.length === 0 ? (
          <EmptyState title="No keys found" hint="Change the filters or get a new key." />
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Key</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Solution</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Activations</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Expires</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {keys.items.map((item) => (
                <KeyRow key={item.id} item={item} />
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Card>
      <Pagination total={keys.total} page={keys.page} pageSize={keys.pageSize} />
    </>
  );
}
