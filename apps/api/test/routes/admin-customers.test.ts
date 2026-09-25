import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

describe("GET /api/admin/customers", () => {
  it("lists customers with key counts and platforms, without admins", async () => {
    const { headers } = await t.createAdmin();
    const a = await t.createUser({ email: "alice@example.com" });
    await t.createKey({ userId: a.id, platform: "wordpress" });
    await t.createKey({ userId: a.id, platform: "shopify" });
    await t.createUser({ email: "bob@example.com", status: "inactive" });

    const res = await t.app.inject({ method: "GET", url: "/api/admin/customers", headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2);
    const alice = body.items.find((c: { email: string }) => c.email === "alice@example.com");
    expect(alice).toMatchObject({ id: a.id, status: "active", keysCount: 2, lastLoginAt: null });
    expect([...alice.platforms].sort()).toEqual(["shopify", "wordpress"]);
    expect(body.items.some((c: { email: string }) => c.email === "boss@khdev.by")).toBe(false);
  });

  it("filters by email substring, status, platform and dates", async () => {
    const { headers } = await t.createAdmin();
    const a = await t.createUser({ email: "alice@shop.com", createdAt: new Date("2026-08-01T00:00:00Z") });
    await t.createKey({ userId: a.id, platform: "bitrix" });
    await t.createUser({ email: "bob@store.com", status: "blocked", createdAt: new Date("2026-09-01T00:00:00Z") });
    const get = async (qs: string) =>
      (await t.app.inject({ method: "GET", url: `/api/admin/customers?${qs}`, headers })).json();

    expect((await get("email=SHOP")).items.map((c: { email: string }) => c.email)).toEqual(["alice@shop.com"]);
    expect((await get("email=%25")).total).toBe(0);
    expect((await get("status=blocked")).total).toBe(1);
    expect((await get("platform=bitrix")).total).toBe(1);
    expect((await get("dateFrom=2026-08-15")).total).toBe(1);
  });
});

describe("PATCH /api/admin/customers/:id/status", () => {
  const patch = (id: string, status: string, headers: Record<string, string>) =>
    t.app.inject({ method: "PATCH", url: `/api/admin/customers/${id}/status`, payload: { status }, headers });

  it("blocks a customer and ends their sessions", async () => {
    const { headers } = await t.createAdmin();
    const customer = await t.createCustomer("c@example.com");
    const res = await patch(customer.user.id, "blocked", headers);
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("blocked");
    expect((await t.app.inject({ method: "GET", url: "/api/auth/me", headers: customer.headers })).statusCode).toBe(401);
    const login = await t.app.inject({ method: "POST", url: "/api/auth/request-code", payload: { email: "c@example.com" } });
    expect(login.json().error.code).toBe("USER_BLOCKED");
  });

  it("removes a customer so they can no longer sign in", async () => {
    const { headers } = await t.createAdmin();
    const customer = await t.createCustomer("c@example.com");
    expect((await patch(customer.user.id, "removed", headers)).statusCode).toBe(200);
    expect((await t.app.inject({ method: "GET", url: "/api/auth/me", headers: customer.headers })).statusCode).toBe(401);
    const login = await t.app.inject({ method: "POST", url: "/api/auth/request-code", payload: { email: "c@example.com" } });
    expect(login.statusCode).toBe(404);
    expect(login.json().error.code).toBe("USER_NOT_FOUND");
  });

  it("unblocks a customer", async () => {
    const { headers } = await t.createAdmin();
    const blocked = await t.createUser({ email: "c@example.com", status: "blocked" });
    expect((await patch(blocked.id, "active", headers)).json().status).toBe("active");
  });

  it("does not change a removed customer (they are invited again instead)", async () => {
    const { headers } = await t.createAdmin();
    const removed = await t.createUser({ email: "c@example.com", status: "removed" });
    const res = await patch(removed.id, "active", headers);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("USER_REMOVED");
  });

  it("does not change admins", async () => {
    const { headers } = await t.createAdmin();
    const other = await t.createUser({ email: "admin2@khdev.by", role: "admin" });
    expect((await patch(other.id, "blocked", headers)).statusCode).toBe(404);
  });

  it("rejects unknown statuses", async () => {
    const { headers } = await t.createAdmin();
    const c = await t.createUser({ email: "c@example.com" });
    expect((await patch(c.id, "deleted", headers)).statusCode).toBe(400);
  });
});
