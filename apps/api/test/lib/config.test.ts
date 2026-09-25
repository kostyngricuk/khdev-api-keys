import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

const base = {
  NODE_ENV: "development",
  DATABASE_URL: "postgres://khdev:khdev@localhost:5432/khdev_keys",
  AUTH_CODE_PEPPER: "a-long-enough-pepper-value",
  SERVICE_TOKEN: "a-long-enough-service-token",
};

describe("loadConfig", () => {
  it("applies defaults", () => {
    const config = loadConfig(base);
    expect(config.keyTermDays).toBe(365);
    expect(config.port).toBe(3001);
    expect(config.isDev).toBe(true);
    expect(config.devAdminEnabled).toBe(false);
  });

  it("enables the dev admin in development", () => {
    expect(loadConfig({ ...base, DEV_ADMIN_ENABLED: "true" }).devAdminEnabled).toBe(true);
  });

  it.each(["production", "test"])("refuses DEV_ADMIN_ENABLED=true when NODE_ENV=%s", (env) => {
    expect(() => loadConfig({ ...base, NODE_ENV: env, DEV_ADMIN_ENABLED: "true" })).toThrow(/DEV_ADMIN_ENABLED/);
  });

  it("rejects an invalid DATABASE_URL", () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: "not-a-url" })).toThrow(/DATABASE_URL/);
  });

  it("requires a pepper and service token in production", () => {
    expect(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: base.DATABASE_URL })).toThrow();
  });
});
