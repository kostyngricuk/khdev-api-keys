import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button, Card, Flex, Select, Text, TextField } from "@radix-ui/themes";
import { PLATFORMS } from "@khdev/contracts";
import { Form, Link, useLocation } from "react-router";
import type { Filters as FilterValues } from "~/lib/filters";
import { platformLabel, statusLabel } from "~/lib/format";

type Props = {
  filters: FilterValues;
  statuses: readonly string[];
  showEmail?: boolean;
  showStatus?: boolean;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex direction="column" gap="1">
      <Text as="label" size="1" color="gray" weight="medium">
        {label}
      </Text>
      {children}
    </Flex>
  );
}

/** A GET form: filters are kept in the URL and read by the route loader. */
export function Filters({ filters, statuses, showEmail = false, showStatus = true }: Props) {
  const location = useLocation();
  return (
    <Card mb="4">
      <Form method="get" key={location.search}>
        <Flex gap="3" wrap="wrap" align="end">
          <Field label="Date from">
            <TextField.Root type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} />
          </Field>
          <Field label="Date to">
            <TextField.Root type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} />
          </Field>
          <Field label="Platform">
            <Select.Root name="platform" defaultValue={filters.platform ?? "all"}>
              <Select.Trigger style={{ minWidth: 150 }} />
              <Select.Content>
                <Select.Item value="all">All platforms</Select.Item>
                {PLATFORMS.map((p) => (
                  <Select.Item key={p} value={p}>
                    {platformLabel(p)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field>
          {showStatus && (
            <Field label="Status">
              <Select.Root name="status" defaultValue={filters.status ?? "all"}>
                <Select.Trigger style={{ minWidth: 130 }} />
                <Select.Content>
                  <Select.Item value="all">All statuses</Select.Item>
                  {statuses.map((s) => (
                    <Select.Item key={s} value={s}>
                      {statusLabel(s)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
          )}
          {showEmail && (
            <Field label="Email">
              <TextField.Root name="email" placeholder="Search by email" defaultValue={filters.email ?? ""}>
                <TextField.Slot>
                  <MagnifyingGlassIcon />
                </TextField.Slot>
              </TextField.Root>
            </Field>
          )}
          <Flex gap="2">
            <Button type="submit">Apply</Button>
            <Button asChild variant="soft" color="gray">
              <Link to={location.pathname}>Reset</Link>
            </Button>
          </Flex>
        </Flex>
      </Form>
    </Card>
  );
}
