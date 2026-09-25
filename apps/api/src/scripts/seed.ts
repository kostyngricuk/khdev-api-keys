import { and, eq, ne } from "drizzle-orm";
import { PLATFORMS, type UserRole } from "@khdev/contracts";
import { DEV_ADMIN_EMAIL, DEV_CUSTOMER_EMAIL, type Config } from "../config.js";
import type { AppContext } from "../context.js";
import type { Database } from "../db/client.js";
import { apiKeys, users } from "../db/schema.js";
import { createKeysForUser } from "../services/keys.js";

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

/**
 * Local development only: makes sure admin@khdev.by (admin) and customer@khdev.by (customer, one active key
 * per platform) exist and are active.
 */
export async function seedDevUsers(db: Database, config: Config) {
  if (!config.isDev) throw new Error("Dev users can only be seeded when NODE_ENV=development");

  await upsertDevUser(db, DEV_ADMIN_EMAIL, "admin");
  const customerId = await upsertDevUser(db, DEV_CUSTOMER_EMAIL, "customer");

  const [hasKeys] = await db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.userId, customerId)).limit(1);
  if (!hasKeys) {
    const ctx = { config, now: () => new Date() } as AppContext;
    await createKeysForUser(ctx, db, { userId: customerId, platforms: [...PLATFORMS], status: "active" });
  }
}
