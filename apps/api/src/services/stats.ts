import { and, count, countDistinct, eq, exists, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import { KEY_STATUSES, PLATFORMS, USER_STATUSES, type StatsQuery, type StatsResponse } from "@khdev/contracts";
import type { AppContext } from "../context.js";
import { apiKeys, keyActivations, solutions, users } from "../db/schema.js";
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

  // Platform/solution conditions on a key, shared by the key, customer and activation queries.
  const keyScope = [
    query.platform ? eq(apiKeys.platform, query.platform) : undefined,
    query.solution
      ? inArray(apiKeys.solutionId, ctx.db.select({ id: solutions.id }).from(solutions).where(eq(solutions.slug, query.solution)))
      : undefined,
  ].filter(Boolean) as SQL[];

  const customerBase = [eq(users.role, "customer"), ...inRange(users.createdAt)];
  const customerWhere = and(
    ...customerBase,
    keyScope.length
      ? exists(ctx.db.select({ one: sql`1` }).from(apiKeys).where(and(eq(apiKeys.userId, users.id), ...keyScope)))
      : undefined,
  );
  const keyWhere = and(...keyScope, ...inRange(apiKeys.createdAt));
  const activationWhere = and(...keyScope, ...inRange(keyActivations.activatedAt));
  const month = sql<string>`to_char(date_trunc('month', ${apiKeys.createdAt} at time zone 'UTC'), 'YYYY-MM')`;

  const [customersByStatus, keysByStatus, keysByPlatform, [activations], perMonth, bySolution, customersByPlatform] =
    await Promise.all([
    ctx.db.select({ key: users.status, n: count() }).from(users).where(customerWhere).groupBy(users.status),
    ctx.db.select({ key: apiKeys.status, n: count() }).from(apiKeys).where(keyWhere).groupBy(apiKeys.status),
    ctx.db.select({ key: apiKeys.platform, n: count() }).from(apiKeys).where(keyWhere).groupBy(apiKeys.platform),
    ctx.db
      .select({ n: count() })
      .from(keyActivations)
      .innerJoin(apiKeys, eq(apiKeys.id, keyActivations.keyId))
      .where(activationWhere),
    ctx.db.select({ month, n: count() }).from(apiKeys).where(keyWhere).groupBy(month).orderBy(month),
    ctx.db
      .select({ slug: solutions.slug, name: solutions.name, platform: solutions.platform, n: count() })
      .from(apiKeys)
      .innerJoin(solutions, eq(solutions.id, apiKeys.solutionId))
      .where(keyWhere)
      .groupBy(solutions.slug, solutions.name, solutions.platform)
      .orderBy(solutions.name),
    ctx.db
      .select({ key: apiKeys.platform, n: countDistinct(users.id) })
      .from(users)
      .innerJoin(apiKeys, eq(apiKeys.userId, users.id))
      .where(and(...customerBase, ...keyScope))
      .groupBy(apiKeys.platform),
  ]);

  const byStatus = tally(KEY_STATUSES, keysByStatus);
  const byCustomerStatus = tally(USER_STATUSES, customersByStatus);
  return {
    customersByStatus: byCustomerStatus,
    keysByStatus: byStatus,
    keysByPlatform: tally(PLATFORMS, keysByPlatform),
    customersByPlatform: tally(PLATFORMS, customersByPlatform),
    totalCustomers: Object.values<number>(byCustomerStatus).reduce((a, b) => a + b, 0),
    totalKeys: Object.values<number>(byStatus).reduce((a, b) => a + b, 0),
    totalActivations: activations?.n ?? 0,
    keysBySolution: bySolution.map((row) => ({ slug: row.slug, name: row.name, platform: row.platform, count: row.n })),
    keysPerMonth: perMonth.map((row) => ({ month: row.month, count: row.n })),
  };
}
