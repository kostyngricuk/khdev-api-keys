import { and, count, desc, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import type { AdminKey, AuthUser, CustomerKey, KeyStatus, Platform } from "@khdev/contracts";
import type { AppContext } from "../context.js";
import type { Executor } from "../db/client.js";
import { apiKeys, keyActivations, users } from "../db/schema.js";
import { conflict, notFound } from "../lib/errors.js";
import { dateRange, pageOffset } from "../lib/filters.js";
import { generateKey, maskKey, rebuildKeyExpiry } from "../lib/key.js";

export const DAY_MS = 86_400_000;

export function termEnd(ctx: AppContext, from: Date): Date {
  return new Date(from.getTime() + ctx.config.keyTermDays * DAY_MS);
}

/** Keys are only ever created for a purchase (invite). */
export async function createKeysForUser(
  ctx: AppContext,
  db: Executor,
  input: { userId: string; platforms: Platform[]; status: KeyStatus },
) {
  const createdAt = ctx.now();
  const expiresAt = termEnd(ctx, createdAt);
  return db
    .insert(apiKeys)
    .values(
      input.platforms.map((platform) => ({
        userId: input.userId,
        platform,
        status: input.status,
        key: generateKey(createdAt, expiresAt),
        createdAt,
        expiresAt,
      })),
    )
    .returning({ id: apiKeys.id, platform: apiKeys.platform });
}

// ---- Reading keys -------------------------------------------------------

const activationsUsed = sql<number>`(select count(*)::int from ${keyActivations} where ${keyActivations.keyId} = ${apiKeys.id})`;

const keyColumns = {
  id: apiKeys.id,
  userId: apiKeys.userId,
  email: users.email,
  platform: apiKeys.platform,
  key: apiKeys.key,
  status: apiKeys.status,
  activationLimit: apiKeys.activationLimit,
  activationsUsed,
  createdAt: apiKeys.createdAt,
  expiresAt: apiKeys.expiresAt,
  regeneratedAt: apiKeys.regeneratedAt,
};

export type KeyRow = {
  id: string;
  userId: string;
  email: string;
  platform: Platform;
  key: string;
  status: KeyStatus;
  activationLimit: number;
  activationsUsed: number;
  createdAt: Date;
  expiresAt: Date;
  regeneratedAt: Date | null;
};

export function toCustomerKey(row: KeyRow, options: { mask?: boolean } = {}): CustomerKey {
  return {
    id: row.id,
    platform: row.platform,
    key: options.mask ? maskKey(row.key) : row.key,
    status: row.status,
    activationsUsed: row.activationsUsed,
    activationLimit: row.activationLimit,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    regeneratedAt: row.regeneratedAt?.toISOString() ?? null,
  };
}

export function toAdminKey(row: KeyRow): AdminKey {
  return { ...toCustomerKey(row, { mask: true }), userId: row.userId, email: row.email };
}

/** Expiry is materialized lazily: any read or plugin call first flips overdue keys to `expired`. */
export async function refreshExpired(ctx: AppContext, db: Executor = ctx.db) {
  await db
    .update(apiKeys)
    .set({ status: "expired" })
    .where(and(lte(apiKeys.expiresAt, ctx.now()), ne(apiKeys.status, "expired")));
}

export type KeyFilters = {
  userId?: string;
  platform?: Platform;
  status?: KeyStatus;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export async function listKeys(ctx: AppContext, filters: KeyFilters): Promise<{ rows: KeyRow[]; total: number }> {
  await refreshExpired(ctx);
  const { from, to } = dateRange(filters);
  const where = and(
    filters.userId ? eq(apiKeys.userId, filters.userId) : undefined,
    filters.platform ? eq(apiKeys.platform, filters.platform) : undefined,
    filters.status ? eq(apiKeys.status, filters.status) : undefined,
    from ? gte(apiKeys.createdAt, from) : undefined,
    to ? lt(apiKeys.createdAt, to) : undefined,
  );
  const { limit, offset } = pageOffset(filters);

  const [rows, [totalRow]] = await Promise.all([
    ctx.db
      .select(keyColumns)
      .from(apiKeys)
      .innerJoin(users, eq(users.id, apiKeys.userId))
      .where(where)
      .orderBy(desc(apiKeys.createdAt), desc(apiKeys.id))
      .limit(limit)
      .offset(offset),
    ctx.db.select({ total: count() }).from(apiKeys).innerJoin(users, eq(users.id, apiKeys.userId)).where(where),
  ]);
  return { rows, total: totalRow?.total ?? 0 };
}

export async function getKeyRow(db: Executor, id: string): Promise<KeyRow | null> {
  const [row] = await db
    .select(keyColumns)
    .from(apiKeys)
    .innerJoin(users, eq(users.id, apiKeys.userId))
    .where(eq(apiKeys.id, id))
    .limit(1);
  return row ?? null;
}

/** Customers can reach only their own keys; everything else looks like it does not exist. */
export async function findAccessibleKey(ctx: AppContext, user: AuthUser, id: string): Promise<KeyRow> {
  await refreshExpired(ctx);
  const row = await getKeyRow(ctx.db, id);
  if (!row || (user.role !== "admin" && row.userId !== user.id)) {
    throw notFound("KEY_NOT_FOUND", "Key not found");
  }
  return row;
}

// ---- Changing keys ------------------------------------------------------

export async function regenerateKey(ctx: AppContext, user: AuthUser, id: string): Promise<KeyRow> {
  const row = await findAccessibleKey(ctx, user, id);
  if (row.status === "expired") throw conflict("KEY_EXPIRED", "Extend the expired key before regenerating it");
  const now = ctx.now();

  await ctx.db.transaction(async (tx) => {
    // New random segments and creation day; the expiry day (Y) stays because the term does not change.
    await tx
      .update(apiKeys)
      .set({ key: generateKey(now, row.expiresAt), regeneratedAt: now })
      .where(eq(apiKeys.id, id));
    await tx.delete(keyActivations).where(eq(keyActivations.keyId, id));
  });
  return (await getKeyRow(ctx.db, id))!;
}

export async function extendKey(ctx: AppContext, user: AuthUser, id: string): Promise<KeyRow> {
  const row = await findAccessibleKey(ctx, user, id);
  if (row.status !== "expired") throw conflict("KEY_NOT_EXPIRED", "Only expired keys can be extended");
  const base = Math.max(ctx.now().getTime(), row.expiresAt.getTime());
  const expiresAt = termEnd(ctx, new Date(base));

  await ctx.db
    .update(apiKeys)
    .set({ expiresAt, key: rebuildKeyExpiry(row.key, expiresAt), status: "active" })
    .where(eq(apiKeys.id, id));
  return (await getKeyRow(ctx.db, id))!;
}

export async function setKeyStatus(
  ctx: AppContext,
  user: AuthUser,
  id: string,
  status: "active" | "inactive",
): Promise<KeyRow> {
  const row = await findAccessibleKey(ctx, user, id);
  if (row.status === "expired") throw conflict("KEY_EXPIRED", "Extend the expired key before changing its status");
  await ctx.db.update(apiKeys).set({ status }).where(eq(apiKeys.id, id));
  return (await getKeyRow(ctx.db, id))!;
}
