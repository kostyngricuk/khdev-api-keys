import { z } from "zod";
import { emailSchema } from "./common.js";
import { platformSchema } from "./enums.js";

export const inviteBody = z.object({
  email: emailSchema,
  platforms: z.array(platformSchema).min(1).max(20),
});
export type InviteBody = z.infer<typeof inviteBody>;

export const inviteResponse = z.object({
  userId: z.uuid(),
  created: z.boolean(),
  keys: z.array(z.object({ id: z.uuid(), platform: platformSchema })),
});
export type InviteResponse = z.infer<typeof inviteResponse>;
