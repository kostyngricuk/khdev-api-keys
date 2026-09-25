import { z } from "zod";
import { dateOnly, dateTime, listQuerySchema } from "./common.js";
import { keyStatusSchema, platformSchema, USER_STATUSES, KEY_STATUSES, PLATFORMS, userStatusSchema } from "./enums.js";

export const adminKeyQuery = listQuerySchema.extend({
  platform: platformSchema.optional(),
  status: keyStatusSchema.optional(),
});
export type AdminKeyQuery = z.infer<typeof adminKeyQuery>;

export const customerQuery = listQuerySchema.extend({
  platform: platformSchema.optional(),
  status: userStatusSchema.optional(),
  email: z.string().trim().max(254).optional(),
});
export type CustomerQuery = z.infer<typeof customerQuery>;

export const adminCustomer = z.object({
  id: z.uuid(),
  email: z.string(),
  status: userStatusSchema,
  keysCount: z.number().int(),
  platforms: z.array(platformSchema),
  invitedAt: dateTime,
  lastLoginAt: dateTime.nullable(),
});
export type AdminCustomer = z.infer<typeof adminCustomer>;

export const customerStatusBody = z.object({ status: userStatusSchema });
export type CustomerStatusBody = z.infer<typeof customerStatusBody>;

export const statsQuery = z.object({
  dateFrom: dateOnly.optional(),
  dateTo: dateOnly.optional(),
  platform: platformSchema.optional(),
});
export type StatsQuery = z.infer<typeof statsQuery>;

const countsOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z.object(Object.fromEntries(values.map((v) => [v, z.number().int()])) as Record<T[number], z.ZodNumber>);

export const statsResponse = z.object({
  customersByStatus: countsOf(USER_STATUSES),
  keysByStatus: countsOf(KEY_STATUSES),
  keysByPlatform: countsOf(PLATFORMS),
  totalCustomers: z.number().int(),
  totalKeys: z.number().int(),
  totalActivations: z.number().int(),
  keysPerMonth: z.array(z.object({ month: z.string(), count: z.number().int() })),
});
export type StatsResponse = z.infer<typeof statsResponse>;
