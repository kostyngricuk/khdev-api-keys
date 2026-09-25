import { z } from "zod";
import { platformSchema } from "./enums.js";

/** A product that needs a license key, e.g. "Personal Price" for 1С-Битрикс. */
export const solutionSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a solution slug such as personal-price");
export type SolutionSlug = z.infer<typeof solutionSlugSchema>;

export const solutionSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  platform: platformSchema,
  storeUrl: z.string().nullable(),
});
export type Solution = z.infer<typeof solutionSchema>;

export const solutionsResponse = z.array(solutionSchema);

/** The short form embedded in key objects. */
export const keySolution = z.object({ slug: z.string(), name: z.string() });
export type KeySolution = z.infer<typeof keySolution>;
