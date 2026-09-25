import { z } from "zod";
import { emailSchema } from "./common.js";
import { userRoleSchema, userStatusSchema } from "./enums.js";

export const requestCodeBody = z.object({ email: emailSchema });
export type RequestCodeBody = z.infer<typeof requestCodeBody>;

export const requestCodeResponse = z.object({
  ok: z.literal(true),
  resendAfterSeconds: z.number().int(),
});
export type RequestCodeResponse = z.infer<typeof requestCodeResponse>;

export const verifyCodeBody = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});
export type VerifyCodeBody = z.infer<typeof verifyCodeBody>;

export const authUser = z.object({
  id: z.uuid(),
  email: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
});
export type AuthUser = z.infer<typeof authUser>;

export const verifyCodeResponse = z.object({
  token: z.string(),
  user: authUser,
});
export type VerifyCodeResponse = z.infer<typeof verifyCodeResponse>;
