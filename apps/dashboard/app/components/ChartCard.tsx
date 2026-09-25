import { Box, Card, Flex, Heading, SegmentedControl, Table, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useI18n } from "~/i18n/context";

export type ChartRow = { label: string; value: number; color?: string };

/** Card with a Chart/Table switch, so every chart has an accessible table view. */
export function ChartCard({
  title,
  description,
  rows,
  valueLabel,
  children,
}: {
  title: string;
  description?: string;
  rows: ChartRow[];
  valueLabel: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<"chart" | "table">("chart");
  const mounted = useMounted();
  return (
    <Card size="2">
      <Flex justify="between" align="start" mb="3" gap="3">
        <Box>
          <Heading size="3">{title}</Heading>
          {description && (
            <Text size="1" color="gray">
              {description}
            </Text>
          )}
        </Box>
        <SegmentedControl.Root size="1" value={view} onValueChange={(v) => setView(v as "chart" | "table")}>
          <SegmentedControl.Item value="chart">{t("stats.chart")}</SegmentedControl.Item>
          <SegmentedControl.Item value="table">{t("stats.table")}</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>
      {view === "table" ? (
        <Table.Root size="1">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>{title}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">{valueLabel}</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.label}>
                <Table.RowHeaderCell>
                  <Flex align="center" gap="2">
                    {row.color && <span style={{ width: 10, height: 10, borderRadius: 3, background: row.color }} />}
                    {row.label}
                  </Flex>
                </Table.RowHeaderCell>
                <Table.Cell justify="end">{row.value}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      ) : (
        // Recharts measures the DOM, so charts render after hydration only.
        <Box style={{ height: 260 }}>{mounted ? children : null}</Box>
      )}
    </Card>
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
