import type { KeyStatus, Platform } from "@khdev/contracts";
import type { AppContext } from "../context.js";
import type { Executor } from "../db/client.js";
import { apiKeys } from "../db/schema.js";
import { generateKey } from "../lib/key.js";

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
