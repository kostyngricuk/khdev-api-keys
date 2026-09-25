import { and, asc, count, desc, eq, exists, gte, ilike, lt, sql } from "drizzle-orm";
import type { AdminCustomer, CustomerQuery, UserStatus } from "@khdev/contracts";
import type { AppContext } from "../context.js";
import { apiKeys, solutions, users } from "../db/schema.js";
import { conflict, notFound } from "../lib/errors.js";
import { containsPattern, dateRange, pageOffset } from "../lib/filters.js";
import { deleteUserSessions } from "./sessions.js";

const customerColumns = {
  id: users.id,
  email: users.email,
  status: users.status,
  invitedAt: users.invitedAt,
  lastLoginAt: users.lastLoginAt,
  // Drizzle leaves columns unqualified in single-table selects, so the correlated subqueries name tables explicitly.
  keysCount: sql<number>`(select count(*)::int from "api_keys" k where k."user_id" = "users"."id")`,
  platforms: sql<string[]>`coalesce((select array_agg(distinct k."platform"::text) from "api_keys" k where k."user_id" = "users"."id"), '{}')`,
  solutions: sql<{ slug: string; name: string; platform: string }[]>`coalesce((
    select json_agg(json_build_object('slug', s."slug", 'name', s."name", 'platform', s."platform") order by s."name")
    from (select distinct so."slug", so."name", so."platform" from "api_keys" k join "solutions" so on so."id" = k."solution_id" where k."user_id" = "users"."id") s
  ), '[]'::json)`,
};

type CustomerRow = {
  id: string;
  email: string;
  status: UserStatus;
  invitedAt: Date;
  lastLoginAt: Date | null;
  keysCount: number;
  platforms: string[];
  solutions: { slug: string; name: string; platform: string }[];
};

function toAdminCustomer(row: CustomerRow): AdminCustomer {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    keysCount: row.keysCount,
    platforms: [...row.platforms].sort() as AdminCustomer["platforms"],
    solutions: row.solutions as AdminCustomer["solutions"],
    invitedAt: row.invitedAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
}

export async function listCustomers(ctx: AppContext, query: CustomerQuery) {
  const { from, to } = dateRange(query);
  const where = and(
    eq(users.role, "customer"),
    query.status ? eq(users.status, query.status) : undefined,
    query.email ? ilike(users.email, containsPattern(query.email)) : undefined,
    from ? gte(users.createdAt, from) : undefined,
    to ? lt(users.createdAt, to) : undefined,
    query.solution
      ? exists(
          ctx.db
            .select({ one: sql`1` })
            .from(apiKeys)
            .innerJoin(solutions, eq(solutions.id, apiKeys.solutionId))
            .where(and(eq(apiKeys.userId, users.id), eq(solutions.slug, query.solution))),
        )
      : undefined,
    query.platform
      ? exists(
          ctx.db
            .select({ one: sql`1` })
            .from(apiKeys)
            .where(and(eq(apiKeys.userId, users.id), eq(apiKeys.platform, query.platform))),
        )
      : undefined,
  );
  const { limit, offset } = pageOffset(query);
  const [rows, [totalRow]] = await Promise.all([
    ctx.db
      .select(customerColumns)
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), asc(users.email))
      .limit(limit)
      .offset(offset),
    ctx.db.select({ total: count() }).from(users).where(where),
  ]);
  return { items: rows.map(toAdminCustomer), total: totalRow?.total ?? 0, page: query.page, pageSize: query.pageSize };
}

export async function setCustomerStatus(ctx: AppContext, id: string, status: UserStatus): Promise<AdminCustomer> {
  const [user] = await ctx.db.select().from(users).where(and(eq(users.id, id), eq(users.role, "customer"))).limit(1);
  if (!user) throw notFound("USER_NOT_FOUND", "Customer not found");
  if (user.status === "removed") {
    throw conflict("USER_REMOVED", "Removed customers cannot be changed. Invite the email again instead.");
  }

  await ctx.db.transaction(async (tx) => {
    await tx.update(users).set({ status }).where(eq(users.id, id));
    if (status === "blocked" || status === "removed") await deleteUserSessions(tx, id);
  });

  const [row] = await ctx.db.select(customerColumns).from(users).where(eq(users.id, id));
  return toAdminCustomer(row!);
}
