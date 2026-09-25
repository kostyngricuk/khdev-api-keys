import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { keyActivations } from "../../src/db/schema.js";
import { createTestApp, type TestApp } from "../helpers.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
beforeEach(async () => {
  await t.reset();
});
afterAll(async () => {
  await t.close();
});

describe("GET /api/admin/stats", () => {
  async function seed() {
    const a = await t.createUser({ email: "a@example.com", createdAt: new Date("2026-08-05T00:00:00Z") });
    await t.createUser({ email: "b@example.com", status: "blocked", createdAt: new Date("2026-09-05T00:00:00Z") });
    const k1 = await t.createKey({ userId: a.id, platform: "wordpress", createdAt: new Date("2026-08-10T00:00:00Z") });
    await t.createKey({ userId: a.id, platform: "wordpress", status: "inactive", createdAt: new Date("2026-09-10T00:00:00Z") });
    await t.createKey({ userId: a.id, platform: "shopify", createdAt: new Date("2026-09-12T00:00:00Z") });
    await t.db.insert(keyActivations).values([
      { keyId: k1.id, domain: "a.com", activatedAt: new Date("2026-08-20T00:00:00Z") },
      { keyId: k1.id, domain: "b.com", activatedAt: new Date("2026-08-21T00:00:00Z") },
    ]);
  }

  it("returns counts by status and platform, activations and keys per month", async () => {
    const { headers } = await t.createAdmin();
    await seed();
    const res = await t.app.inject({ method: "GET", url: "/api/admin/stats", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      customersByStatus: { inactive: 0, active: 1, blocked: 1, removed: 0 },
      keysByStatus: { inactive: 1, active: 2, expired: 0 },
      keysByPlatform: { bitrix: 0, wordpress: 2, opencart: 0, shopify: 1 },
      customersByPlatform: { bitrix: 0, wordpress: 1, opencart: 0, shopify: 1 },
      totalCustomers: 2,
      totalKeys: 3,
      totalActivations: 2,
      keysBySolution: [
        { slug: "test-shopify", name: "Test shopify", platform: "shopify", count: 1 },
        { slug: "test-wordpress", name: "Test wordpress", platform: "wordpress", count: 2 },
      ],
      keysPerMonth: [
        { month: "2026-08", count: 1 },
        { month: "2026-09", count: 2 },
      ],
    });
  });

  it("applies date and platform filters", async () => {
    const { headers } = await t.createAdmin();
    await seed();
    const res = await t.app.inject({ method: "GET", url: "/api/admin/stats?dateFrom=2026-09-01&platform=wordpress", headers });
    const body = res.json();
    expect(body.totalKeys).toBe(1);
    expect(body.keysByPlatform.shopify).toBe(0);
    expect(body.totalActivations).toBe(0);
    expect(body.keysPerMonth).toEqual([{ month: "2026-09", count: 1 }]);
    // Customers created in the range who own a key for the platform: only the blocked one is in range, and has no keys.
    expect(body.totalCustomers).toBe(0);
    expect(body.customersByPlatform).toEqual({ bitrix: 0, wordpress: 0, opencart: 0, shopify: 0 });
  });

  it("filters by solution", async () => {
    const { headers } = await t.createAdmin();
    await seed();
    const res = await t.app.inject({ method: "GET", url: "/api/admin/stats?solution=test-shopify", headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalKeys).toBe(1);
    expect(body.keysByPlatform).toEqual({ bitrix: 0, wordpress: 0, opencart: 0, shopify: 1 });
    expect(body.keysBySolution.map((s: { slug: string }) => s.slug)).toEqual(["test-shopify"]);
    expect(body.totalCustomers).toBe(1);
    expect(body.customersByPlatform).toEqual({ bitrix: 0, wordpress: 0, opencart: 0, shopify: 1 });
    // The two activations belong to a WordPress key.
    expect(body.totalActivations).toBe(0);
  });

  it("rejects a malformed solution slug", async () => {
    const { headers } = await t.createAdmin();
    const res = await t.app.inject({ method: "GET", url: "/api/admin/stats?solution=Bad%20Slug!", headers });
    expect(res.statusCode).toBe(400);
  });
});
