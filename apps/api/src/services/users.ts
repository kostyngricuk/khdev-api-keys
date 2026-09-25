import { and, eq, ne } from "drizzle-orm";
import type { Executor } from "../db/client.js";
import { users } from "../db/schema.js";

/** Returns the current (non-removed) user for an email. Removed rows are history only. */
export async function findUserByEmail(db: Executor, email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), ne(users.status, "removed")))
    .limit(1);
  return user ?? null;
}
