import { execFileSync } from "node:child_process";
import type { VersionsResponse } from "@khdev/contracts";

type VersionEnv = {
  APP_VERSION?: string;
  GIT_SHA?: string;
  BUILT_AT?: string;
};

function gitDescribe(): string | null {
  try {
    return execFileSync("git", ["describe", "--tags", "--always"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const startedAt = new Date().toISOString();

/** Versions come from the release tag (APP_VERSION), then `git describe`, then a dev fallback. */
export function resolveVersions(env: VersionEnv, describe: () => string | null = gitDescribe): VersionsResponse {
  const raw = env.APP_VERSION || describe() || "0.0.0-dev";
  const version = raw.replace(/^v/, "");
  return {
    api: version,
    dashboard: version,
    docs: version,
    commit: env.GIT_SHA || "unknown",
    builtAt: env.BUILT_AT || startedAt,
  };
}
