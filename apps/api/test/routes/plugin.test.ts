import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiKeys, users } from "../../src/db/schema.js";
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

const validate = (key: string, domain: string) =>
  t.app.inject({ method: "POST", url: "/api/keys/validate", payload: { key, domain } });
const apply = (key: string, domain: string) => t.app.inject({ method: "POST", url: "/api/keys/apply", payload: { key, domain } });

async function customerKey(overrides: Partial<Omit<Parameters<TestApp["createKey"]>[0], "userId">> = {}) {
  const user = await t.createUser({ email: "owner@example.com" });
  return { user, key: await t.createKey({ userId: user.id, platform: "shopify", ...overrides }) };
}

describe("POST /api/keys/validate", () => {
  it("returns KEY_NOT_FOUND for an unknown key", async () => {
    const res = await validate("AAAA-BBBB-CCCC-DDDD-0FZL-0G0Y", "shop.com");
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("KEY_NOT_FOUND");
  });

  it("returns KEY_NOT_FOUND for a malformed key", async () => {
    expect((await validate("hello", "shop.com")).statusCode).toBe(404);
  });

  it("rejects an invalid domain", async () => {
    const { key } = await customerKey();
    const res = await validate(key.key, "not a domain");
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_DOMAIN");
  });

  it("describes a valid, unused key without changing it", async () => {
    const { key } = await customerKey();
    const res = await validate(key.key.toLowerCase(), "https://www.Shop.com/");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      valid: true,
      status: "active",
      platform: "shopify",
      domain: "shop.com",
      expiresAt: key.expiresAt.toISOString(),
      activationsUsed: 0,
      activationLimit: 3,
      activatedOnDomain: false,
    });
    expect((await validate(key.key, "shop.com")).json().activationsUsed).toBe(0);
  });

  it("reports inactive keys as not valid", async () => {
    const { key } = await customerKey({ status: "inactive" });
    expect((await validate(key.key, "shop.com")).json()).toMatchObject({ valid: false, status: "inactive" });
  });

  it("reports expired keys as not valid", async () => {
    const { key } = await customerKey({ createdAt: new Date("2025-01-01"), expiresAt: new Date("2026-01-01") });
    expect((await validate(key.key, "shop.com")).json()).toMatchObject({ valid: false, status: "expired" });
  });

  it("reports activatedOnDomain after apply", async () => {
    const { key } = await customerKey();
    await apply(key.key, "shop.com");
    expect((await validate(key.key, "www.shop.com")).json()).toMatchObject({ activatedOnDomain: true, activationsUsed: 1 });
  });

  it("refuses keys of blocked customers", async () => {
    const { user, key } = await customerKey();
    await t.db.update(users).set({ status: "blocked" }).where(eq(users.id, user.id));
    const res = await validate(key.key, "shop.com");
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("USER_BLOCKED");
  });

  it("hides keys of removed customers", async () => {
    const { user, key } = await customerKey();
    await t.db.update(users).set({ status: "removed" }).where(eq(users.id, user.id));
    expect((await validate(key.key, "shop.com")).statusCode).toBe(404);
  });
});

describe("POST /api/keys/apply", () => {
  it("allows three distinct domains and rejects the fourth", async () => {
    const { key } = await customerKey();
    for (const [i, domain] of ["a.com", "b.com", "c.com"].entries()) {
      const res = await apply(key.key, domain);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ valid: true, activatedOnDomain: true, activationsUsed: i + 1 });
    }
    const res = await apply(key.key, "d.com");
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("ACTIVATION_LIMIT_REACHED");
  });

  it("does not use an activation when re-applying on the same domain", async () => {
    const { key } = await customerKey();
    await apply(key.key, "a.com");
    const res = await apply(key.key, "https://www.A.com:8443/wp-admin");
    expect(res.statusCode).toBe(200);
    expect(res.json().activationsUsed).toBe(1);
  });

  it("still accepts an already activated domain when the limit is reached", async () => {
    const { key } = await customerKey();
    for (const domain of ["a.com", "b.com", "c.com"]) await apply(key.key, domain);
    expect((await apply(key.key, "b.com")).statusCode).toBe(200);
  });

  it("rejects inactive keys", async () => {
    const { key } = await customerKey({ status: "inactive" });
    const res = await apply(key.key, "a.com");
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("KEY_INACTIVE");
  });

  it("rejects expired keys", async () => {
    const { key } = await customerKey({ createdAt: new Date("2025-01-01"), expiresAt: new Date("2026-01-01") });
    const res = await apply(key.key, "a.com");
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("KEY_EXPIRED");
  });

  it("rejects keys of blocked customers", async () => {
    const { user, key } = await customerKey();
    await t.db.update(users).set({ status: "blocked" }).where(eq(users.id, user.id));
    expect((await apply(key.key, "a.com")).statusCode).toBe(403);
  });

  it("respects a per-key limit raised by the admin", async () => {
    const { key } = await customerKey({ activationLimit: 5 });
    for (const domain of ["a.com", "b.com", "c.com", "d.com", "e.com"]) {
      expect((await apply(key.key, domain)).statusCode).toBe(200);
    }
    expect((await apply(key.key, "f.com")).statusCode).toBe(409);
  });

  it("resets the limit after regeneration and retires the old key", async () => {
    const { user, key } = await customerKey();
    for (const domain of ["a.com", "b.com", "c.com"]) await apply(key.key, domain);
    const headers = await t.authHeader(user.id);
    const regenerated = await t.app.inject({ method: "POST", url: `/api/keys/${key.id}/regenerate`, headers });
    const newKey = regenerated.json().key as string;

    expect((await apply(key.key, "a.com")).statusCode).toBe(404);
    for (const domain of ["x.com", "y.com", "z.com"]) {
      expect((await apply(newKey, domain)).statusCode).toBe(200);
    }
    const [row] = await t.db.select().from(apiKeys).where(eq(apiKeys.id, key.id));
    expect(row?.key).toBe(newKey);
  });

  it("serializes concurrent applies so the limit holds", async () => {
    const { key } = await customerKey();
    const results = await Promise.all(["a.com", "b.com", "c.com", "d.com", "e.com"].map((d) => apply(key.key, d)));
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(3);
    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(2);
  });
});
