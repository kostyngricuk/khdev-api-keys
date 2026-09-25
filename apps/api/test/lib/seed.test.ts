import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";
import { apiKeys, users } from "../../src/db/schema.js";
import { seedDevUsers } from "../../src/scripts/seed.js";
import { createTestApp, type TestApp } from "../helpers.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const devConfig = loadConfig({ NODE_ENV: "development", DATABASE_URL: "postgres://x:y@localhost:5432/z" });

describe("seedDevUsers", () => {
  it("creates the dev customer with one active key per solution and one expired key, once", async () => {
    await seedDevUsers(t.db, devConfig);
    await seedDevUsers(t.db, devConfig);
    const [customer, ...others] = await t.db.select().from(users).where(eq(users.email, "customer@khdev.by"));
    expect(others).toHaveLength(0);
    expect(customer).toMatchObject({ role: "customer", status: "active" });
    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, customer!.id));
    const active = keys.filter((k) => k.status === "active");
    const expired = keys.filter((k) => k.status === "expired");
    expect(active.map((k) => k.platform)).toEqual(["bitrix"]);
    expect(expired).toHaveLength(1);
    expect(expired[0]!.expiresAt.getTime()).toBeLessThan(Date.now());
    expect(keys).toHaveLength(2);
  });

  it("creates the dev admin once and is idempotent", async () => {
    await seedDevUsers(t.db, devConfig);
    await seedDevUsers(t.db, devConfig);
    const rows = await t.db.select().from(users).where(eq(users.email, "admin@khdev.by"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: "admin", status: "active" });
  });

  it("restores the dev admin role and status if they were changed", async () => {
    await t.db.update(users).set({ status: "blocked" }).where(eq(users.email, "admin@khdev.by"));
    await seedDevUsers(t.db, devConfig);
    const [row] = await t.db.select().from(users).where(eq(users.email, "admin@khdev.by"));
    expect(row?.status).toBe("active");
  });

  it("runs in the test environment and refuses to run in production", async () => {
    await expect(seedDevUsers(t.db, t.config)).resolves.toBeUndefined();
    const prod = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://x:y@localhost:5432/z",
      AUTH_CODE_PEPPER: "prod-pepper-1234567890",
      SERVICE_TOKEN: "prod-service-token-123",
    });
    await expect(seedDevUsers(t.db, prod)).rejects.toThrow(/production/);
  });

  it("adds the expired key to a dev customer that was seeded before", async () => {
    const [customer] = await t.db.select().from(users).where(eq(users.email, "customer@khdev.by"));
    await t.db.delete(apiKeys).where(eq(apiKeys.status, "expired"));
    await seedDevUsers(t.db, devConfig);
    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, customer!.id));
    expect(keys.filter((k) => k.status === "expired")).toHaveLength(1);
    expect(keys).toHaveLength(2);
  });
});
