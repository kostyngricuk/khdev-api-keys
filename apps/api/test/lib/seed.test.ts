import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";
import { users } from "../../src/db/schema.js";
import { seedDevAdmin } from "../../src/scripts/seed.js";
import { createTestApp, type TestApp } from "../helpers.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const devConfig = loadConfig({ NODE_ENV: "development", DATABASE_URL: "postgres://x:y@localhost:5432/z" });

describe("seedDevAdmin", () => {
  it("creates the dev admin once and is idempotent", async () => {
    await seedDevAdmin(t.db, devConfig);
    await seedDevAdmin(t.db, devConfig);
    const rows = await t.db.select().from(users).where(eq(users.email, "admin@khdev.by"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: "admin", status: "active" });
  });

  it("restores the dev admin role and status if they were changed", async () => {
    await t.db.update(users).set({ status: "blocked" }).where(eq(users.email, "admin@khdev.by"));
    await seedDevAdmin(t.db, devConfig);
    const [row] = await t.db.select().from(users).where(eq(users.email, "admin@khdev.by"));
    expect(row?.status).toBe("active");
  });

  it("refuses to run outside development", async () => {
    await expect(seedDevAdmin(t.db, t.config)).rejects.toThrow(/development/);
    const prod = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://x:y@localhost:5432/z",
      AUTH_CODE_PEPPER: "prod-pepper-1234567890",
      SERVICE_TOKEN: "prod-service-token-123",
    });
    await expect(seedDevAdmin(t.db, prod)).rejects.toThrow(/development/);
  });
});
