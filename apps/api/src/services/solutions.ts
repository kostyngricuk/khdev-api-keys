import { asc, inArray } from "drizzle-orm";
import type { Solution } from "@khdev/contracts";
import type { Executor } from "../db/client.js";
import { solutions } from "../db/schema.js";
import { badRequest } from "../lib/errors.js";

export async function listSolutions(db: Executor): Promise<Solution[]> {
  return db
    .select({ id: solutions.id, slug: solutions.slug, name: solutions.name, platform: solutions.platform, storeUrl: solutions.storeUrl })
    .from(solutions)
    .orderBy(asc(solutions.name));
}

/** Resolves purchased solution slugs, keeping order and duplicates (two purchases give two keys). */
export async function resolveSolutions(db: Executor, slugs: string[]) {
  const rows = await db.select().from(solutions).where(inArray(solutions.slug, [...new Set(slugs)]));
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const unknown = slugs.filter((slug) => !bySlug.has(slug));
  if (unknown.length) throw badRequest("UNKNOWN_SOLUTION", `Unknown solution: ${[...new Set(unknown)].join(", ")}`);
  return slugs.map((slug) => bySlug.get(slug)!);
}
