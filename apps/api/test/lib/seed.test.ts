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
  it("creates the dev customer with one active key per solution, once", async () => {
    await seedDevUsers(t.db, devConfig);
    await seedDevUsers(t.db, devConfig);
    const [customer, ...others] = await t.db.select().from(users).where(eq(users.email, "customer@khdev.by"));
    expect(others).toHaveLength(0);
    expect(customer).toMatchObject({ role: "customer", status: "active" });
    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, customer!.id));
    expect(keys.map((k) => k.platform)).toEqual(["bitrix"]);
    expect(keys.every((k) => k.status === "active")).toBe(true);
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

  it("refuses to run outside development", async () => {
    await expect(seedDevUsers(t.db, t.config)).rejects.toThrow(/development/);
    const prod = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://x:y@localhost:5432/z",
      AUTH_CODE_PEPPER: "prod-pepper-1234567890",
      SERVICE_TOKEN: "prod-service-token-123",
    });
    await expect(seedDevUsers(t.db, prod)).rejects.toThrow(/development/);
  });
});
