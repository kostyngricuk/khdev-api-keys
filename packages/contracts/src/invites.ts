import { z } from "zod";
import { emailSchema } from "./common.js";
import { platformSchema } from "./enums.js";
import { solutionSlugSchema } from "./solutions.js";

export const inviteBody = z.object({
  email: emailSchema,
  /** One key is created per entry (buying the same solution twice gives two keys). */
  solutions: z.array(solutionSlugSchema).min(1).max(20),
});
export type InviteBody = z.infer<typeof inviteBody>;

export const inviteResponse = z.object({
  userId: z.uuid(),
  created: z.boolean(),
  keys: z.array(z.object({ id: z.uuid(), solution: z.string(), platform: platformSchema })),
});
export type InviteResponse = z.infer<typeof inviteResponse>;
