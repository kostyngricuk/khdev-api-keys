import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { VersionsResponse } from "@khdev/contracts";

type VersionEnv = {
  APP_VERSION?: string;
  GIT_SHA?: string;
  BUILT_AT?: string;
};

type BuildInfo = { version?: string; commit?: string; builtAt?: string };

type Readers = {
  describe: () => string | null;
  sha: () => string | null;
  buildInfo: () => BuildInfo | null;
};

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null;
  } catch {
    return null;
  }
}

const defaultReaders: Readers = {
  // Only tags count as versions; an untagged checkout falls back to the dev version.
  describe: () => git(["describe", "--tags"]),
  sha: () => git(["rev-parse", "--short", "HEAD"]),
  // Written next to the compiled server by the release workflow (dist/build-info.json).
  buildInfo: () => {
    try {
      return JSON.parse(readFileSync(new URL("../build-info.json", import.meta.url), "utf8")) as BuildInfo;
    } catch {
      return null;
    }
  },
};

const startedAt = new Date().toISOString();

/**
 * Versions come from the release tag: APP_VERSION at runtime, then the build info baked in by the
 * release workflow, then `git describe --tags` for local checkouts, then a dev fallback.
 */
export function resolveVersions(env: VersionEnv, readers: Readers = defaultReaders): VersionsResponse {
  const info = env.APP_VERSION ? null : readers.buildInfo();
  const raw = env.APP_VERSION || info?.version || readers.describe() || "0.0.0-dev";
  const version = raw.replace(/^v/, "");
  return {
    api: version,
    dashboard: version,
    docs: version,
    commit: env.GIT_SHA || info?.commit || readers.sha() || "unknown",
    builtAt: env.BUILT_AT || info?.builtAt || startedAt,
  };
}
