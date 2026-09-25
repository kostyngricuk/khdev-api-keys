import { z } from "zod";

export const PLATFORMS = ["bitrix", "wordpress", "opencart", "shopify"] as const;
export const platformSchema = z.enum(PLATFORMS);
export type Platform = z.infer<typeof platformSchema>;

export const USER_ROLES = ["customer", "admin"] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_STATUSES = ["inactive", "active", "blocked", "removed"] as const;
export const userStatusSchema = z.enum(USER_STATUSES);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const KEY_STATUSES = ["inactive", "active", "expired"] as const;
export const keyStatusSchema = z.enum(KEY_STATUSES);
export type KeyStatus = z.infer<typeof keyStatusSchema>;

export const SUPPORT_TOPICS = ["installation", "activation", "billing", "bug", "other"] as const;
export const supportTopicSchema = z.enum(SUPPORT_TOPICS);
export type SupportTopic = z.infer<typeof supportTopicSchema>;
