import { and, count, eq } from "drizzle-orm";
import type { ValidateResponse } from "@khdev/contracts";
import type { AppContext } from "../context.js";
import type { Executor } from "../db/client.js";
import { apiKeys, keyActivations, users } from "../db/schema.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import { normalizeDomain } from "../lib/domain.js";
import { parseKey } from "../lib/key.js";
import { refreshExpired } from "./keys.js";

type LockableKey = {
  id: string;
  platform: ValidateResponse["platform"];
  status: ValidateResponse["status"];
  activationLimit: number;
  expiresAt: Date;
  ownerStatus: string;
};

function parseInput(input: { key: string; domain: string }) {
  const parsed = parseKey(input.key);
  if (!parsed) throw notFound("KEY_NOT_FOUND", "Key not found");
  const domain = normalizeDomain(input.domain);
  if (!domain) throw badRequest("INVALID_DOMAIN", "Domain is not valid");
  return { key: parsed.key, domain };
}

async function loadKey(db: Executor, key: string, lock: boolean): Promise<LockableKey> {
  const query = db
    .select({
      id: apiKeys.id,
      platform: apiKeys.platform,
      status: apiKeys.status,
      activationLimit: apiKeys.activationLimit,
      expiresAt: apiKeys.expiresAt,
      ownerStatus: users.status,
    })
    .from(apiKeys)
    .innerJoin(users, eq(users.id, apiKeys.userId))
    .where(eq(apiKeys.key, key))
    .limit(1);
  const [row] = await (lock ? query.for("update", { of: apiKeys }) : query);

  if (!row || row.ownerStatus === "removed") throw notFound("KEY_NOT_FOUND", "Key not found");
  if (row.ownerStatus === "blocked") throw forbidden("USER_BLOCKED", "The owner of this key is blocked");
  return row;
}

async function describe(db: Executor, row: LockableKey, domain: string): Promise<ValidateResponse> {
  const [[used], [onDomain]] = await Promise.all([
    db.select({ n: count() }).from(keyActivations).where(eq(keyActivations.keyId, row.id)),
    db
      .select({ n: count() })
      .from(keyActivations)
      .where(and(eq(keyActivations.keyId, row.id), eq(keyActivations.domain, domain))),
  ]);
  return {
    valid: row.status === "active",
    status: row.status,
    platform: row.platform,
    domain,
    expiresAt: row.expiresAt.toISOString(),
    activationsUsed: used?.n ?? 0,
    activationLimit: row.activationLimit,
    activatedOnDomain: (onDomain?.n ?? 0) > 0,
  };
}

export async function validateKey(ctx: AppContext, input: { key: string; domain: string }) {
  const { key, domain } = parseInput(input);
  await refreshExpired(ctx);
  return describe(ctx.db, await loadKey(ctx.db, key, false), domain);
}

/** One activation per distinct domain; the key row is locked so concurrent applies cannot exceed the limit. */
export async function applyKey(ctx: AppContext, input: { key: string; domain: string }) {
  const { key, domain } = parseInput(input);
  await refreshExpired(ctx);

  return ctx.db.transaction(async (tx) => {
    const row = await loadKey(tx, key, true);
    if (row.status === "expired") throw conflict("KEY_EXPIRED", "The key has expired");
    if (row.status === "inactive") throw conflict("KEY_INACTIVE", "The key is not active");

    const current = await describe(tx, row, domain);
    if (current.activatedOnDomain) return current;
    if (current.activationsUsed >= row.activationLimit) {
      throw conflict("ACTIVATION_LIMIT_REACHED", `The key is already activated on ${row.activationLimit} domains`);
    }

    await tx.insert(keyActivations).values({ keyId: row.id, domain, activatedAt: ctx.now() });
    return { ...current, activationsUsed: current.activationsUsed + 1, activatedOnDomain: true };
  });
}
