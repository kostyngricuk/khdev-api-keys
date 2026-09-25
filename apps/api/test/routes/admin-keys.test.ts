import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiKeys } from "../../src/db/schema.js";
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

describe("admin routes access", () => {
  it.each([
    ["GET", "/api/admin/keys"],
    ["GET", "/api/admin/customers"],
    ["GET", "/api/admin/stats"],
  ] as const)("%s %s requires an admin", async (method, url) => {
    expect((await t.app.inject({ method, url })).statusCode).toBe(401);
    const { headers } = await t.createCustomer();
    expect((await t.app.inject({ method, url, headers })).statusCode).toBe(403);
  });
});

describe("GET /api/admin/keys", () => {
  it("lists every customer's keys masked, with the owner email", async () => {
    const { headers } = await t.createAdmin();
    const a = await t.createUser({ email: "a@example.com" });
    const b = await t.createUser({ email: "b@example.com" });
    const keyA = await t.createKey({ userId: a.id, platform: "bitrix" });
    await t.createKey({ userId: b.id, platform: "opencart" });

    const res = await t.app.inject({ method: "GET", url: "/api/admin/keys", headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2);
    const itemA = body.items.find((i: { id: string }) => i.id === keyA.id);
    expect(itemA).toMatchObject({ userId: a.id, email: "a@example.com", platform: "bitrix" });
    expect(itemA.key).toBe(`${keyA.key.slice(0, 4)}…${keyA.key.slice(-4)}`);
    expect(JSON.stringify(body)).not.toContain(keyA.key);
  });

  it("filters by platform, status and dates", async () => {
    const { headers } = await t.createAdmin();
    const a = await t.createUser({ email: "a@example.com" });
    await t.createKey({ userId: a.id, platform: "bitrix", createdAt: new Date("2026-08-01T10:00:00Z") });
    await t.createKey({ userId: a.id, platform: "shopify", status: "inactive", createdAt: new Date("2026-09-01T10:00:00Z") });
    const get = async (qs: string) => (await t.app.inject({ method: "GET", url: `/api/admin/keys?${qs}`, headers })).json().total;
    expect(await get("platform=bitrix")).toBe(1);
    expect(await get("status=inactive")).toBe(1);
    expect(await get("dateTo=2026-08-31")).toBe(1);
  });
});

describe("GET /api/admin/keys email filter", () => {
  it("filters by owner email substring, case-insensitively", async () => {
    const { headers } = await t.createAdmin();
    const alice = await t.createUser({ email: "alice@shop.com" });
    const bob = await t.createUser({ email: "bob@store.com" });
    await t.createKey({ userId: alice.id });
    await t.createKey({ userId: alice.id, platform: "shopify" });
    await t.createKey({ userId: bob.id });
    const get = async (qs: string) => (await t.app.inject({ method: "GET", url: `/api/admin/keys?${qs}`, headers })).json();

    const res = await get("email=%20SHOP%20");
    expect(res.total).toBe(2);
    expect(res.items.every((k: { email: string }) => k.email === "alice@shop.com")).toBe(true);
    expect((await get("email=%25")).total).toBe(0);
    expect((await get("email=bob&platform=shopify")).total).toBe(0);
  });

  it("is not available on the customer keys endpoint", async () => {
    const { user, headers } = await t.createCustomer("me@example.com");
    await t.createKey({ userId: user.id });
    const res = await t.app.inject({ method: "GET", url: "/api/keys?email=nobody", headers });
    expect(res.json().total).toBe(1);
  });
});

describe("PATCH /api/admin/keys/:id/activation-limit", () => {
  const patch = (id: string, payload: unknown, headers: Record<string, string>) =>
    t.app.inject({ method: "PATCH", url: `/api/admin/keys/${id}/activation-limit`, payload: payload as object, headers });

  it("changes the limit for one key", async () => {
    const { headers } = await t.createAdmin();
    const owner = await t.createUser({ email: "a@example.com" });
    const key = await t.createKey({ userId: owner.id });
    const other = await t.createKey({ userId: owner.id });
    const res = await patch(key.id, { limit: 5 }, headers);
    expect(res.statusCode).toBe(200);
    expect(res.json().activationLimit).toBe(5);
    const [row] = await t.db.select().from(apiKeys).where(eq(apiKeys.id, other.id));
    expect(row?.activationLimit).toBe(3);
  });

  it.each([0, 101, 2.5])("rejects limit %s", async (limit) => {
    const { headers } = await t.createAdmin();
    const owner = await t.createUser({ email: "a@example.com" });
    const key = await t.createKey({ userId: owner.id });
    expect((await patch(key.id, { limit }, headers)).statusCode).toBe(400);
  });

  it("returns 404 for an unknown key", async () => {
    const { headers } = await t.createAdmin();
    const res = await patch("00000000-0000-4000-8000-000000000000", { limit: 5 }, headers);
    expect(res.statusCode).toBe(404);
  });

  it("forbids customers", async () => {
    const { user, headers } = await t.createCustomer();
    const key = await t.createKey({ userId: user.id });
    expect((await patch(key.id, { limit: 10 }, headers)).statusCode).toBe(403);
  });
});
