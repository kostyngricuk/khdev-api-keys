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
    expect(config.databasePoolMax).toBe(10);
  });

  it.each([
    ["development", true],
    ["test", true],
    ["production", false],
  ] as const)("enables the dev logins when NODE_ENV=%s: %s", (env, enabled) => {
    const secrets = { AUTH_CODE_PEPPER: "prod-pepper-1234567890", SERVICE_TOKEN: "prod-service-token-123" };
    expect(loadConfig({ ...base, ...secrets, NODE_ENV: env }).devLoginEnabled).toBe(enabled);
  });

  it("keeps the dev logins off when NODE_ENV is missing (treated as production)", () => {
    const config = loadConfig({
      DATABASE_URL: base.DATABASE_URL,
      AUTH_CODE_PEPPER: "prod-pepper-1234567890",
      SERVICE_TOKEN: "prod-service-token-123",
    });
    expect(config.devLoginEnabled).toBe(false);
  });

  it("ignores the removed DEV_ADMIN_ENABLED variable", () => {
    const config = loadConfig({
      ...base,
      NODE_ENV: "production",
      DEV_ADMIN_ENABLED: "true",
    });
    expect(config.devLoginEnabled).toBe(false);
  });

  it("rejects an invalid DATABASE_URL", () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: "not-a-url" })).toThrow(/DATABASE_URL/);
  });

  it("requires a pepper and service token in production", () => {
    expect(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: base.DATABASE_URL })).toThrow();
  });
});

describe("loadConfig mail and rate limit options", () => {
  it("defaults to SMTP and enables rate limiting outside tests", () => {
    const config = loadConfig(base);
    expect(config.mailTransport).toBe("smtp");
    expect(config.rateLimitEnabled).toBe(true);
    expect(loadConfig({ ...base, NODE_ENV: "test" }).rateLimitEnabled).toBe(false);
  });

  it("accepts the log mail transport", () => {
    expect(loadConfig({ ...base, MAIL_TRANSPORT: "log" }).mailTransport).toBe("log");
  });
});

describe("loadConfig without NODE_ENV", () => {
  it("treats a missing NODE_ENV as production, so secrets are required and dev defaults never apply", () => {
    expect(() => loadConfig({ DATABASE_URL: base.DATABASE_URL })).toThrow(/SERVICE_TOKEN/);
    const config = loadConfig({
      DATABASE_URL: base.DATABASE_URL,
      AUTH_CODE_PEPPER: "prod-pepper-1234567890",
      SERVICE_TOKEN: "prod-service-token-123",
    });
    expect(config.isProd).toBe(true);
    expect(config.isDev).toBe(false);
  });
});
