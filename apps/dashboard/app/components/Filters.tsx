import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button, Card, Flex, Select, Text, TextField } from "@radix-ui/themes";
import { PLATFORMS, type Solution } from "@khdev/contracts";
import { Form, Link, useLocation } from "react-router";
import type { Filters as FilterValues } from "~/lib/filters";
import { useI18n } from "~/i18n/context";
import { platformLabel } from "~/lib/format";

type Props = {
  filters: FilterValues;
  /** When given, a Solution select is shown (key pages). */
  solutions?: Pick<Solution, "slug" | "name">[];
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
export function Filters({ filters, statuses, solutions, showEmail = false, showStatus = true }: Props) {
  const { t, locale } = useI18n();
  const location = useLocation();
  return (
    <Card mb="4">
      <Form method="get" key={location.search}>
        <Flex gap="3" wrap="wrap" align="end">
          <Field label={t("filters.dateFrom")}>
            <TextField.Root type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} />
          </Field>
          <Field label={t("filters.dateTo")}>
            <TextField.Root type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} />
          </Field>
          {solutions && (
            <Field label={t("filters.solution")}>
              <Select.Root name="solution" defaultValue={filters.solution ?? "all"}>
                <Select.Trigger style={{ minWidth: 160 }} />
                <Select.Content>
                  <Select.Item value="all">{t("filters.allSolutions")}</Select.Item>
                  {solutions.map((s) => (
                    <Select.Item key={s.slug} value={s.slug}>
                      {s.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
          )}
          <Field label={t("filters.platform")}>
            <Select.Root name="platform" defaultValue={filters.platform ?? "all"}>
              <Select.Trigger style={{ minWidth: 150 }} />
              <Select.Content>
                <Select.Item value="all">{t("filters.allPlatforms")}</Select.Item>
                {PLATFORMS.map((p) => (
                  <Select.Item key={p} value={p}>
                    {platformLabel(p, locale)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field>
          {showStatus && (
            <Field label={t("filters.status")}>
              <Select.Root name="status" defaultValue={filters.status ?? "all"}>
                <Select.Trigger style={{ minWidth: 130 }} />
                <Select.Content>
                  <Select.Item value="all">{t("filters.allStatuses")}</Select.Item>
                  {statuses.map((s) => (
                    <Select.Item key={s} value={s}>
                      {t(`status.${s}`)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
          )}
          {showEmail && (
            <Field label={t("filters.email")}>
              <TextField.Root name="email" placeholder={t("filters.emailPlaceholder")} defaultValue={filters.email ?? ""}>
                <TextField.Slot>
                  <MagnifyingGlassIcon />
                </TextField.Slot>
              </TextField.Root>
            </Field>
          )}
          <Flex gap="2">
            <Button type="submit">{t("common.apply")}</Button>
            <Button asChild variant="outline" color="gray" highContrast>
              <Link to={location.pathname}>{t("common.reset")}</Link>
            </Button>
          </Flex>
        </Flex>
      </Form>
    </Card>
  );
}
