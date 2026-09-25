import { and, eq, ne } from "drizzle-orm";
import type { UserRole } from "@khdev/contracts";
import { DEV_ADMIN_EMAIL, DEV_CUSTOMER_EMAIL, type Config } from "../config.js";
import type { AppContext } from "../context.js";
import type { Database } from "../db/client.js";
import { apiKeys, users } from "../db/schema.js";
import { generateKey } from "../lib/key.js";
import { createKeysForUser, DAY_MS } from "../services/keys.js";
import { listSolutions } from "../services/solutions.js";

async function upsertDevUser(db: Database, email: string, role: UserRole) {
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), ne(users.status, "removed")))
    .limit(1);
  if (existing) {
    await db.update(users).set({ role, status: "active" }).where(eq(users.id, existing.id));
    return existing.id;
  }
  const [created] = await db.insert(users).values({ email, role, status: "active" }).returning({ id: users.id });
  return created!.id;
}

/** A key that expired a month ago, so "Extend" can be tried locally. */
async function createExpiredKey(db: Database, userId: string) {
  const [solution] = await listSolutions(db);
  if (!solution) return;
  const expiresAt = new Date(Date.now() - 30 * DAY_MS);
  const createdAt = new Date(expiresAt.getTime() - 365 * DAY_MS);
  await db.insert(apiKeys).values({
    userId,
    solutionId: solution.id,
    platform: solution.platform,
    status: "expired",
    key: generateKey(createdAt, expiresAt),
    createdAt,
    expiresAt,
  });
}

/**
 * Not in production: makes sure admin@khdev.by (admin) and customer@khdev.by (customer, one active key
 * per solution, plus one expired key) exist and are active.
 */
export async function seedDevUsers(db: Database, config: Config) {
  if (config.isProd) throw new Error("Dev users cannot be seeded in production");

  await upsertDevUser(db, DEV_ADMIN_EMAIL, "admin");
  const customerId = await upsertDevUser(db, DEV_CUSTOMER_EMAIL, "customer");

  const ctx = { config, now: () => new Date() } as AppContext;
  const keys = await db.select({ status: apiKeys.status }).from(apiKeys).where(eq(apiKeys.userId, customerId));
  if (keys.length === 0) {
    await createKeysForUser(ctx, db, { userId: customerId, solutions: await listSolutions(db), status: "active" });
  }
  if (!keys.some((key) => key.status === "expired")) {
    await createExpiredKey(db, customerId);
  }
}
