import { execFileSync } from "node:child_process";
import type { VersionsResponse } from "@khdev/contracts";

type VersionEnv = {
  APP_VERSION?: string;
  GIT_SHA?: string;
  BUILT_AT?: string;
};

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null;
  } catch {
    return null;
  }
}

type GitReaders = { describe: () => string | null; sha: () => string | null };

const gitReaders: GitReaders = {
  // Only tags count as versions; an untagged checkout falls back to the dev version.
  describe: () => git(["describe", "--tags"]),
  sha: () => git(["rev-parse", "--short", "HEAD"]),
};

const startedAt = new Date().toISOString();

/** Versions come from the release tag (APP_VERSION), then `git describe`, then a dev fallback. */
export function resolveVersions(env: VersionEnv, readers: GitReaders = gitReaders): VersionsResponse {
  const raw = env.APP_VERSION || readers.describe() || "0.0.0-dev";
  const version = raw.replace(/^v/, "");
  return {
    api: version,
    dashboard: version,
    docs: version,
    commit: env.GIT_SHA || readers.sha() || "unknown",
    builtAt: env.BUILT_AT || startedAt,
  };
}
