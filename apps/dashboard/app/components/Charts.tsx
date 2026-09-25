import { Card, Flex, Text } from "@radix-ui/themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { ChartRow } from "./ChartCard";

const AXIS = { stroke: "var(--gray-a6)", fontSize: 12, tickLine: false } as const;
const TICK = { fill: "var(--gray-11)", fontSize: 12 };

function ChartTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!;
  const color = (item.payload as ChartRow | undefined)?.color ?? "var(--accent-9)";
  return (
    <Card size="1" style={{ boxShadow: "var(--shadow-4)" }}>
      <Flex align="center" gap="2">
        <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
        <Text size="1" color="gray">
          {label ?? (item.payload as ChartRow).label}
        </Text>
        <Text size="2" weight="bold">
          {item.value}
        </Text>
      </Flex>
    </Card>
  );
}

/** Vertical bars, one color per category, value labels at the bar ends. */
export function CategoryBarChart({ rows }: { rows: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: -16 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--gray-a4)" />
        <XAxis dataKey="label" {...AXIS} tick={TICK} />
        <YAxis allowDecimals={false} {...AXIS} axisLine={false} tick={TICK} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--gray-a3)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.label} fill={row.color} />
          ))}
          <LabelList dataKey="value" position="top" fill="var(--gray-12)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars for status breakdowns; the category axis carries the label next to each colored bar. */
export function StatusBarChart({ rows }: { rows: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 40, bottom: 0, left: 8 }} barCategoryGap="30%">
        <CartesianGrid horizontal={false} stroke="var(--gray-a4)" />
        <XAxis type="number" allowDecimals={false} {...AXIS} tick={TICK} />
        <YAxis type="category" dataKey="label" width={80} {...AXIS} axisLine={false} tick={TICK} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--gray-a3)" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.label} fill={row.color} />
          ))}
          <LabelList dataKey="value" position="right" fill="var(--gray-12)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single-series trend with a crosshair tooltip. */
export function TrendLineChart({ rows }: { rows: ChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--gray-a4)" />
        <XAxis dataKey="label" {...AXIS} tick={TICK} />
        <YAxis allowDecimals={false} {...AXIS} axisLine={false} tick={TICK} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--gray-a8)", strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--accent-9)"
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2, stroke: "var(--color-panel-solid)", fill: "var(--accent-9)" }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--color-panel-solid)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
