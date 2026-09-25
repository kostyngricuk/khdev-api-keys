import { z } from "zod";
import { dateTime, listQuerySchema } from "./common.js";
import { keyStatusSchema, platformSchema } from "./enums.js";
import { keySolution, solutionSlugSchema } from "./solutions.js";

export const keyQuery = listQuerySchema.extend({
  platform: platformSchema.optional(),
  solution: solutionSlugSchema.optional(),
  status: keyStatusSchema.optional(),
});
export type KeyQuery = z.infer<typeof keyQuery>;

export const customerKey = z.object({
  id: z.uuid(),
  platform: platformSchema,
  solution: keySolution,
  key: z.string(),
  status: keyStatusSchema,
  activationsUsed: z.number().int(),
  activationLimit: z.number().int(),
  createdAt: dateTime,
  expiresAt: dateTime,
  regeneratedAt: dateTime.nullable(),
});
export type CustomerKey = z.infer<typeof customerKey>;

export const adminKey = customerKey.extend({
  userId: z.uuid(),
  email: z.string(),
});
export type AdminKey = z.infer<typeof adminKey>;

export const keyStatusBody = z.object({
  status: z.enum(["active", "inactive"]),
});
export type KeyStatusBody = z.infer<typeof keyStatusBody>;

export const activationLimitBody = z.object({
  limit: z.number().int().min(1).max(100),
});
export type ActivationLimitBody = z.infer<typeof activationLimitBody>;

export const validateBody = z.object({
  key: z.string().trim().min(1).max(64),
  domain: z.string().trim().min(1).max(2048),
  /** Optional: the plugin's solution slug; a key for another solution is refused. */
  solution: solutionSlugSchema.optional(),
});
export type ValidateBody = z.infer<typeof validateBody>;

export const validateResponse = z.object({
  valid: z.boolean(),
  status: keyStatusSchema,
  platform: platformSchema,
  solution: z.string(),
  domain: z.string(),
  expiresAt: dateTime,
  activationsUsed: z.number().int(),
  activationLimit: z.number().int(),
  activatedOnDomain: z.boolean(),
});
export type ValidateResponse = z.infer<typeof validateResponse>;
