import { and, desc, eq, isNull } from "drizzle-orm";
import type { VerifyCodeResponse } from "@khdev/contracts";
import { DEV_ADMIN_CODE, DEV_LOGIN_EMAILS } from "../config.js";
import type { AppContext } from "../context.js";
import { apiKeys, loginCodes, users } from "../db/schema.js";
import { generateCode, hashSecret, safeEqual } from "../lib/crypto.js";
import { forbidden, notFound, tooMany, unauthorized } from "../lib/errors.js";
import { loginCodeEmail } from "../mail/templates.js";
import { createSession } from "./sessions.js";
import { findUserByEmail } from "./users.js";

export const CODE_TTL_MS = 10 * 60_000;
export const RESEND_AFTER_SECONDS = 60;
export const MAX_CODE_ATTEMPTS = 5;

async function findSignInUser(ctx: AppContext, email: string) {
  const user = await findUserByEmail(ctx.db, email);
  if (!user) throw notFound("USER_NOT_FOUND", "User not found");
  if (user.status === "blocked") {
    throw forbidden("USER_BLOCKED", "Your account is blocked. Contact support to restore access.");
  }
  return user;
}

export async function requestLoginCode(ctx: AppContext, email: string) {
  const user = await findSignInUser(ctx, email);
  const now = ctx.now();

  const [previous] = await ctx.db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.userId, user.id), isNull(loginCodes.consumedAt)))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);
  if (previous && now.getTime() - previous.createdAt.getTime() < RESEND_AFTER_SECONDS * 1000) {
    throw tooMany("CODE_RESEND_TOO_SOON", `Wait ${RESEND_AFTER_SECONDS} seconds before requesting a new code`);
  }

  const code = generateCode();
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(loginCodes)
      .set({ consumedAt: now })
      .where(and(eq(loginCodes.userId, user.id), isNull(loginCodes.consumedAt)));
    await tx.insert(loginCodes).values({
      userId: user.id,
      codeHash: hashSecret(code, ctx.config.authCodePepper),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      createdAt: now,
    });
  });

  await ctx.mailer.send(loginCodeEmail(user.email, code));
  return { ok: true as const, resendAfterSeconds: RESEND_AFTER_SECONDS };
}

function isDevLogin(ctx: AppContext, email: string, code: string) {
  return ctx.config.isDev && ctx.config.devAdminEnabled && DEV_LOGIN_EMAILS.includes(email) && code === DEV_ADMIN_CODE;
}

async function checkCode(ctx: AppContext, userId: string, code: string) {
  const now = ctx.now();
  const [current] = await ctx.db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.userId, userId), isNull(loginCodes.consumedAt)))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);

  if (!current) throw unauthorized("CODE_INVALID", "The code is incorrect. Request a new one.");
  if (current.attempts >= MAX_CODE_ATTEMPTS) {
    throw tooMany("CODE_ATTEMPTS_EXCEEDED", "Too many wrong attempts. Request a new code.");
  }
  if (current.expiresAt <= now) throw unauthorized("CODE_EXPIRED", "The code has expired. Request a new one.");

  if (!safeEqual(current.codeHash, hashSecret(code, ctx.config.authCodePepper))) {
    const attempts = current.attempts + 1;
    await ctx.db.update(loginCodes).set({ attempts }).where(eq(loginCodes.id, current.id));
    if (attempts >= MAX_CODE_ATTEMPTS) {
      throw tooMany("CODE_ATTEMPTS_EXCEEDED", "Too many wrong attempts. Request a new code.");
    }
    throw unauthorized("CODE_INVALID", "The code is incorrect");
  }
  return current.id;
}

export async function verifyLoginCode(ctx: AppContext, email: string, code: string): Promise<VerifyCodeResponse> {
  const user = await findSignInUser(ctx, email);
  const codeId = isDevLogin(ctx, email, code) ? null : await checkCode(ctx, user.id, code);
  const now = ctx.now();

  const token = await ctx.db.transaction(async (tx) => {
    if (codeId) await tx.update(loginCodes).set({ consumedAt: now }).where(eq(loginCodes.id, codeId));
    if (user.status === "inactive") {
      // First login activates the account and the keys that were bought before it.
      await tx
        .update(apiKeys)
        .set({ status: "active" })
        .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.status, "inactive")));
    }
    await tx.update(users).set({ status: "active", lastLoginAt: now }).where(eq(users.id, user.id));
    return createSession(ctx, user.id, tx);
  });

  return { token, user: { id: user.id, email: user.email, role: user.role, status: "active" } };
}
