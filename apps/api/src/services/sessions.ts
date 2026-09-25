import { and, eq, gt, inArray } from "drizzle-orm";
import type { AuthUser } from "@khdev/contracts";
import type { AppContext } from "../context.js";
import type { Executor } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { generateToken, hashSecret } from "../lib/crypto.js";

const SESSION_TTL_MS = 30 * 86_400_000;

export async function createSession(ctx: AppContext, userId: string, db: Executor = ctx.db): Promise<string> {
  const token = generateToken();
  await db.insert(sessions).values({
    userId,
    tokenHash: hashSecret(token, ctx.config.authCodePepper),
    expiresAt: new Date(ctx.now().getTime() + SESSION_TTL_MS),
  });
  return token;
}

export async function findSessionUser(ctx: AppContext, token: string): Promise<AuthUser | null> {
  const [row] = await ctx.db
    .select({ id: users.id, email: users.email, role: users.role, status: users.status })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashSecret(token, ctx.config.authCodePepper)),
        gt(sessions.expiresAt, ctx.now()),
        inArray(users.status, ["active", "inactive"]),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function deleteSession(ctx: AppContext, token: string): Promise<void> {
  await ctx.db.delete(sessions).where(eq(sessions.tokenHash, hashSecret(token, ctx.config.authCodePepper)));
}

export async function deleteUserSessions(db: Executor, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
