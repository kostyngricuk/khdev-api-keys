import type { InviteBody, InviteResponse } from "@khdev/contracts";
import type { AppContext } from "../context.js";
import { users } from "../db/schema.js";
import { conflict } from "../lib/errors.js";
import { inviteEmail, newKeysEmail } from "../mail/templates.js";
import { createKeysForUser } from "./keys.js";
import { findUserByEmail } from "./users.js";

export async function inviteCustomer(ctx: AppContext, input: InviteBody): Promise<InviteResponse> {
  const result = await ctx.db.transaction(async (tx) => {
    const existing = await findUserByEmail(tx, input.email);
    if (existing?.role === "admin") throw conflict("USER_IS_ADMIN", "This email belongs to an admin");
    if (existing?.status === "blocked") throw conflict("USER_BLOCKED", "This customer is blocked");

    const user =
      existing ??
      (await tx.insert(users).values({ email: input.email, role: "customer", status: "inactive", invitedAt: ctx.now() }).returning())[0]!;

    // An active customer already went through first-login activation, so new keys start active.
    const keys = await createKeysForUser(ctx, tx, {
      userId: user.id,
      platforms: input.platforms,
      status: user.status === "active" ? "active" : "inactive",
    });
    return { user, created: !existing, keys };
  });

  const links = {
    loginUrl: `${ctx.config.dashboardUrl}/login?email=${encodeURIComponent(result.user.email)}`,
    docsUrl: ctx.config.docsUrl,
    videoUrl: ctx.config.welcomeVideoUrl,
  };
  const message =
    result.user.status === "inactive"
      ? inviteEmail(result.user.email, input.platforms, links)
      : newKeysEmail(result.user.email, input.platforms, links);
  await ctx.mailer.send(message);

  return { userId: result.user.id, created: result.created, keys: result.keys };
}
