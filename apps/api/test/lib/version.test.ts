import { describe, expect, it } from "vitest";
import { resolveVersions } from "../../src/lib/version.js";

describe("resolveVersions", () => {
  it("uses APP_VERSION and GIT_SHA from the environment", () => {
    const v = resolveVersions({ APP_VERSION: "1.2.3", GIT_SHA: "abc1234", BUILT_AT: "2026-09-25T00:00:00Z" });
    expect(v).toEqual({ api: "1.2.3", dashboard: "1.2.3", docs: "1.2.3", commit: "abc1234", builtAt: "2026-09-25T00:00:00Z" });
  });

  it("strips a leading v from tag names", () => {
    expect(resolveVersions({ APP_VERSION: "v2.0.0" }).api).toBe("2.0.0");
  });

  it("falls back to a dev version", () => {
    const v = resolveVersions({}, { describe: () => null, sha: () => null, buildInfo: () => null });
    expect(v.api).toBe("0.0.0-dev");
    expect(v.commit).toBe("unknown");
  });

  it("falls back to git describe when APP_VERSION is missing", () => {
    expect(resolveVersions({}, { describe: () => "v1.4.0-3-gdeadbee", sha: () => null, buildInfo: () => null }).api).toBe("1.4.0-3-gdeadbee");
  });

  it("reads the commit from git when GIT_SHA is missing", () => {
    expect(resolveVersions({}, { describe: () => null, sha: () => "331c054", buildInfo: () => null }).commit).toBe("331c054");
  });

  it("uses the build info written by the release workflow when the env has no version", () => {
    const v = resolveVersions(
      {},
      {
        describe: () => "v9.9.9",
        sha: () => "ignored",
        buildInfo: () => ({ version: "v2.1.0", commit: "abc1234", builtAt: "2026-10-01T00:00:00Z" }),
      },
    );
    expect(v).toEqual({ api: "2.1.0", dashboard: "2.1.0", docs: "2.1.0", commit: "abc1234", builtAt: "2026-10-01T00:00:00Z" });
  });
});
