import type { VersionsResponse } from "@khdev/contracts";
import { api } from "./api.server";
import { env } from "./env.server";

let cached: string | null = null;

/**
 * The dashboard version comes from the release tag (APP_VERSION). Without it (local runs),
 * the version the API reports from git is used, fetched once per server process.
 */
export async function dashboardVersion(request: Request): Promise<string> {
  if (env.appVersion) return env.appVersion;
  if (cached) return cached;
  try {
    cached = (await api<VersionsResponse>(request, "/versions", { token: null })).dashboard;
    return cached;
  } catch {
    return "0.0.0-dev";
  }
}
