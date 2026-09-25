import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiKeys, keyActivations } from "../../src/db/schema.js";
import { encodeDay } from "../../src/lib/key.js";
import { createTestApp, DAY, type TestApp } from "../helpers.js";

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

const NOW = new Date("2026-09-25T12:00:00Z");

describe("GET /api/keys", () => {
  it("requires a session", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/keys" })).statusCode).toBe(401);
  });

  it("is only for customers", async () => {
    const { headers } = await t.createAdmin();
    expect((await t.app.inject({ method: "GET", url: "/api/keys", headers })).statusCode).toBe(403);
  });

  it("returns only the caller's keys with full key strings and activation counts", async () => {
    const { user, headers } = await t.createCustomer("me@example.com");
    const other = await t.createUser({ email: "other@example.com" });
    const mine = await t.createKey({ userId: user.id, platform: "wordpress" });
    await t.createKey({ userId: other.id });
    await t.db.insert(keyActivations).values({ keyId: mine.id, domain: "a.com" });

    const res = await t.app.inject({ method: "GET", url: "/api/keys", headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: mine.id,
      key: mine.key,
      platform: "wordpress",
      status: "active",
      activationsUsed: 1,
      activationLimit: 3,
      regeneratedAt: null,
      solution: { slug: "test-wordpress", name: "Test wordpress" },
    });
  });

  it("filters by solution", async () => {
    const { user, headers } = await t.createCustomer();
    await t.createKey({ userId: user.id, platform: "bitrix" });
    await t.createKey({ userId: user.id, platform: "wordpress" });
    const res = await t.app.inject({ method: "GET", url: "/api/keys?solution=personal-price", headers });
    expect(res.json().total).toBe(1);
    expect(res.json().items[0].solution).toEqual({ slug: "personal-price", name: "Personal Price" });
  });

  it("filters by platform, status and created date, and paginates", async () => {
    const { user, headers } = await t.createCustomer();
    await t.createKey({ userId: user.id, platform: "wordpress", createdAt: new Date("2026-09-01T10:00:00Z") });
    await t.createKey({ userId: user.id, platform: "shopify", createdAt: new Date("2026-09-10T10:00:00Z") });
    await t.createKey({ userId: user.id, platform: "shopify", status: "inactive", createdAt: new Date("2026-09-20T10:00:00Z") });

    const get = async (qs: string) => (await t.app.inject({ method: "GET", url: `/api/keys?${qs}`, headers })).json();

    expect((await get("platform=shopify")).total).toBe(2);
    expect((await get("status=inactive")).total).toBe(1);
    expect((await get("dateFrom=2026-09-10&dateTo=2026-09-10")).total).toBe(1);
    expect((await get("dateFrom=2026-09-05")).total).toBe(2);
    const page2 = await get("pageSize=2&page=2");
    expect(page2.items).toHaveLength(1);
    expect(page2.total).toBe(3);
  });

  it("lists the newest keys first", async () => {
    const { user, headers } = await t.createCustomer();
    const older = await t.createKey({ userId: user.id, createdAt: new Date("2026-01-10T10:00:00Z") });
    const newest = await t.createKey({ userId: user.id, createdAt: new Date("2026-09-20T10:00:00Z") });
    const middle = await t.createKey({ userId: user.id, createdAt: new Date("2026-05-01T10:00:00Z") });
    const ids = (await t.app.inject({ method: "GET", url: "/api/keys", headers })).json().items.map((k: { id: string }) => k.id);
    expect(ids).toEqual([newest.id, middle.id, older.id]);

    const { headers: admin } = await t.createAdmin();
    const adminIds = (await t.app.inject({ method: "GET", url: "/api/admin/keys", headers: admin })).json().items.map((k: { id: string }) => k.id);
    expect(adminIds).toEqual([newest.id, middle.id, older.id]);
  });

  it("marks keys past their expiry date as expired", async () => {
    const { user, headers } = await t.createCustomer();
    await t.createKey({ userId: user.id, createdAt: new Date("2025-01-01"), expiresAt: new Date("2026-01-01") });
    const res = await t.app.inject({ method: "GET", url: "/api/keys", headers });
    expect(res.json().items[0].status).toBe("expired");
  });

  it("rejects invalid filters", async () => {
    const { headers } = await t.createCustomer();
    const res = await t.app.inject({ method: "GET", url: "/api/keys?platform=joomla", headers });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/keys/:id/regenerate", () => {
  it("issues a new key string, keeps the expiry and resets activations", async () => {
    t.clock.set(NOW);
    const { user, headers } = await t.createCustomer();
    const key = await t.createKey({ userId: user.id, createdAt: new Date("2026-06-01T00:00:00Z"), expiresAt: new Date("2027-06-01T00:00:00Z") });
    await t.db.insert(keyActivations).values([{ keyId: key.id, domain: "a.com" }, { keyId: key.id, domain: "b.com" }]);

    const res = await t.app.inject({ method: "POST", url: `/api/keys/${key.id}/regenerate`, headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.key).not.toBe(key.key);
    expect(body.key.split("-")[4]).toBe(encodeDay(NOW));
    expect(body.key.split("-")[5]).toBe(key.key.split("-")[5]);
    expect(body.expiresAt).toBe(key.expiresAt.toISOString());
    expect(body.activationsUsed).toBe(0);
    expect(body.regeneratedAt).toBe(NOW.toISOString());
    expect(await t.db.select().from(keyActivations).where(eq(keyActivations.keyId, key.id))).toHaveLength(0);
  });

  it("refuses to regenerate an expired key", async () => {
    const { user, headers } = await t.createCustomer();
    const key = await t.createKey({ userId: user.id, createdAt: new Date("2025-01-01"), expiresAt: new Date("2026-01-01") });
    const res = await t.app.inject({ method: "POST", url: `/api/keys/${key.id}/regenerate`, headers });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("KEY_EXPIRED");
  });

  it("hides other customers' keys", async () => {
    const { headers } = await t.createCustomer("me@example.com");
    const other = await t.createUser({ email: "other@example.com" });
    const key = await t.createKey({ userId: other.id });
    const res = await t.app.inject({ method: "POST", url: `/api/keys/${key.id}/regenerate`, headers });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("KEY_NOT_FOUND");
  });

  it("lets an admin regenerate any key and returns it masked", async () => {
    const { headers } = await t.createAdmin();
    const owner = await t.createUser({ email: "owner@example.com" });
    const key = await t.createKey({ userId: owner.id });
    const res = await t.app.inject({ method: "POST", url: `/api/keys/${key.id}/regenerate`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().key).toMatch(/^[0-9A-F]{4}…[0-9A-Z]{4}$/);
  });

  it("returns 400 for a malformed id", async () => {
    const { headers } = await t.createCustomer();
    expect((await t.app.inject({ method: "POST", url: "/api/keys/not-a-uuid/regenerate", headers })).statusCode).toBe(400);
  });
});

describe("POST /api/keys/:id/extend", () => {
  it("refuses to extend a key that has not expired", async () => {
    const { user, headers } = await t.createCustomer();
    const key = await t.createKey({ userId: user.id });
    const res = await t.app.inject({ method: "POST", url: `/api/keys/${key.id}/extend`, headers });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("KEY_NOT_EXPIRED");
  });

  it("extends an expired key by one term from today and reactivates it", async () => {
    t.clock.set(NOW);
    const { user, headers } = await t.createCustomer();
    const key = await t.createKey({ userId: user.id, createdAt: new Date("2025-01-01"), expiresAt: new Date("2026-01-01") });
    const res = await t.app.inject({ method: "POST", url: `/api/keys/${key.id}/extend`, headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const expected = new Date(NOW.getTime() + 365 * DAY);
    expect(body.expiresAt).toBe(expected.toISOString());
    expect(body.status).toBe("active");
    expect(body.key.split("-").slice(0, 5)).toEqual(key.key.split("-").slice(0, 5));
    expect(body.key.split("-")[5]).toBe(encodeDay(expected));
  });

  it("hides other customers' keys", async () => {
    const { headers } = await t.createCustomer("me@example.com");
    const other = await t.createUser({ email: "other@example.com" });
    const key = await t.createKey({ userId: other.id, createdAt: new Date("2025-01-01"), expiresAt: new Date("2026-01-01") });
    expect((await t.app.inject({ method: "POST", url: `/api/keys/${key.id}/extend`, headers })).statusCode).toBe(404);
  });
});

describe("PATCH /api/keys/:id/status", () => {
  const patch = (id: string, status: string, headers: Record<string, string>) =>
    t.app.inject({ method: "PATCH", url: `/api/keys/${id}/status`, payload: { status }, headers });

  it("toggles a key between active and inactive", async () => {
    const { user, headers } = await t.createCustomer();
    const key = await t.createKey({ userId: user.id });
    expect((await patch(key.id, "inactive", headers)).json().status).toBe("inactive");
    expect((await patch(key.id, "active", headers)).json().status).toBe("active");
  });

  it("does not allow setting expired manually", async () => {
    const { user, headers } = await t.createCustomer();
    const key = await t.createKey({ userId: user.id });
    expect((await patch(key.id, "expired", headers)).statusCode).toBe(400);
  });

  it("does not change an expired key", async () => {
    const { user, headers } = await t.createCustomer();
    const key = await t.createKey({ userId: user.id, createdAt: new Date("2025-01-01"), expiresAt: new Date("2026-01-01") });
    const res = await patch(key.id, "active", headers);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("KEY_EXPIRED");
  });

  it("lets an admin change any key", async () => {
    const { headers } = await t.createAdmin();
    const owner = await t.createUser({ email: "owner@example.com" });
    const key = await t.createKey({ userId: owner.id });
    expect((await patch(key.id, "inactive", headers)).statusCode).toBe(200);
    const [row] = await t.db.select().from(apiKeys).where(eq(apiKeys.id, key.id));
    expect(row?.status).toBe("inactive");
  });

  it("hides other customers' keys", async () => {
    const { headers } = await t.createCustomer("me@example.com");
    const other = await t.createUser({ email: "other@example.com" });
    const key = await t.createKey({ userId: other.id });
    expect((await patch(key.id, "inactive", headers)).statusCode).toBe(404);
  });
});
