import { z } from "zod";

export const healthResponse = z.object({ status: z.literal("ok") });

export const versionsResponse = z.object({
  api: z.string(),
  dashboard: z.string(),
  docs: z.string(),
  commit: z.string(),
  builtAt: z.string(),
});
export type VersionsResponse = z.infer<typeof versionsResponse>;
