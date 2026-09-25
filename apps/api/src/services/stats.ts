import { and, count, eq, exists, gte, lt, sql, type SQL } from "drizzle-orm";
import { KEY_STATUSES, PLATFORMS, USER_STATUSES, type StatsQuery, type StatsResponse } from "@khdev/contracts";
import type { AppContext } from "../context.js";
import { apiKeys, keyActivations, users } from "../db/schema.js";
import { dateRange } from "../lib/filters.js";
import { refreshExpired } from "./keys.js";

function tally<T extends string>(keys: readonly T[], rows: { key: T; n: number }[]): Record<T, number> {
  const result = Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
  for (const row of rows) result[row.key] = row.n;
  return result;
}

export async function getStats(ctx: AppContext, query: StatsQuery): Promise<StatsResponse> {
  await refreshExpired(ctx);
  const { from, to } = dateRange(query);
  const inRange = (column: typeof users.createdAt | typeof apiKeys.createdAt | typeof keyActivations.activatedAt) =>
    [from ? gte(column, from) : undefined, to ? lt(column, to) : undefined].filter(Boolean) as SQL[];

  const customerWhere = and(
    eq(users.role, "customer"),
    ...inRange(users.createdAt),
    query.platform
      ? exists(
          ctx.db
            .select({ one: sql`1` })
            .from(apiKeys)
            .where(and(eq(apiKeys.userId, users.id), eq(apiKeys.platform, query.platform))),
        )
      : undefined,
  );
  const keyWhere = and(query.platform ? eq(apiKeys.platform, query.platform) : undefined, ...inRange(apiKeys.createdAt));
  const activationWhere = and(
    query.platform ? eq(apiKeys.platform, query.platform) : undefined,
    ...inRange(keyActivations.activatedAt),
  );
  const month = sql<string>`to_char(date_trunc('month', ${apiKeys.createdAt} at time zone 'UTC'), 'YYYY-MM')`;

  const [customersByStatus, keysByStatus, keysByPlatform, [activations], perMonth] = await Promise.all([
    ctx.db.select({ key: users.status, n: count() }).from(users).where(customerWhere).groupBy(users.status),
    ctx.db.select({ key: apiKeys.status, n: count() }).from(apiKeys).where(keyWhere).groupBy(apiKeys.status),
    ctx.db.select({ key: apiKeys.platform, n: count() }).from(apiKeys).where(keyWhere).groupBy(apiKeys.platform),
    ctx.db
      .select({ n: count() })
      .from(keyActivations)
      .innerJoin(apiKeys, eq(apiKeys.id, keyActivations.keyId))
      .where(activationWhere),
    ctx.db.select({ month, n: count() }).from(apiKeys).where(keyWhere).groupBy(month).orderBy(month),
  ]);

  const byStatus = tally(KEY_STATUSES, keysByStatus);
  const byCustomerStatus = tally(USER_STATUSES, customersByStatus);
  return {
    customersByStatus: byCustomerStatus,
    keysByStatus: byStatus,
    keysByPlatform: tally(PLATFORMS, keysByPlatform),
    totalCustomers: Object.values<number>(byCustomerStatus).reduce((a, b) => a + b, 0),
    totalKeys: Object.values<number>(byStatus).reduce((a, b) => a + b, 0),
    totalActivations: activations?.n ?? 0,
    keysPerMonth: perMonth.map((row) => ({ month: row.month, count: row.n })),
  };
}
