import { and, eq, ne } from "drizzle-orm";
import { DEV_ADMIN_EMAIL, type Config } from "../config.js";
import type { Database } from "../db/client.js";
import { users } from "../db/schema.js";

/** Local development only: makes sure admin@khdev.by exists as an active admin. */
export async function seedDevAdmin(db: Database, config: Config) {
  if (!config.isDev) throw new Error("The dev admin can only be seeded when NODE_ENV=development");

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, DEV_ADMIN_EMAIL), ne(users.status, "removed")))
    .limit(1);
  if (existing) {
    await db.update(users).set({ role: "admin", status: "active" }).where(eq(users.id, existing.id));
    return existing.id;
  }
  const [created] = await db
    .insert(users)
    .values({ email: DEV_ADMIN_EMAIL, role: "admin", status: "active" })
    .returning({ id: users.id });
  return created!.id;
}
