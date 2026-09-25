import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiKeys, users } from "../../src/db/schema.js";
import { parseKey } from "../../src/lib/key.js";
import { createTestApp, TEST_SERVICE_TOKEN, type TestApp } from "../helpers.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp({ env: { DASHBOARD_URL: "https://keys.khdev.by", DOCS_URL: "https://docs.khdev.by", WELCOME_VIDEO_URL: "https://video.khdev.by/welcome" } });
  await t.createSolution({ slug: "wp-seo", name: "WP SEO", platform: "wordpress" });
});
beforeEach(async () => {
  await t.reset();
});
afterAll(async () => {
  await t.close();
});

const invite = (payload: unknown, headers: Record<string, string> = { "x-service-token": TEST_SERVICE_TOKEN }) =>
  t.app.inject({ method: "POST", url: "/api/invites", payload: payload as object, headers });

describe("POST /api/invites", () => {
  it("requires authentication", async () => {
    const res = await invite({ email: "a@b.com", solutions: ["personal-price"] }, {});
    expect(res.statusCode).toBe(401);
  });

  it("rejects a wrong service token", async () => {
    const res = await invite({ email: "a@b.com", solutions: ["personal-price"] }, { "x-service-token": "wrong-token-value" });
    expect(res.statusCode).toBe(401);
  });

  it("forbids customers", async () => {
    const { headers } = await t.createCustomer();
    const res = await invite({ email: "a@b.com", solutions: ["personal-price"] }, headers);
    expect(res.statusCode).toBe(403);
  });

  it("allows admins", async () => {
    const { headers } = await t.createAdmin();
    const res = await invite({ email: "a@b.com", solutions: ["personal-price"] }, headers);
    expect(res.statusCode).toBe(201);
  });

  it("creates an inactive customer with one inactive key per solution and emails the invite", async () => {
    const res = await invite({ email: " New@Example.com ", solutions: ["personal-price", "wp-seo"] });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.created).toBe(true);
    expect(body.keys.map((k: { solution: string; platform: string }) => [k.solution, k.platform])).toEqual([
      ["personal-price", "bitrix"],
      ["wp-seo", "wordpress"],
    ]);

    const [user] = await t.db.select().from(users).where(eq(users.id, body.userId));
    expect(user).toMatchObject({ email: "new@example.com", role: "customer", status: "inactive" });

    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, body.userId));
    expect(keys).toHaveLength(2);
    for (const key of keys) {
      expect(key.status).toBe("inactive");
      expect(key.activationLimit).toBe(3);
      expect(parseKey(key.key)).not.toBeNull();
      const termDays = Math.round((key.expiresAt.getTime() - key.createdAt.getTime()) / 86_400_000);
      expect(termDays).toBe(365);
    }

    expect(t.mailer.sent).toHaveLength(1);
    const mail = t.mailer.sent[0]!;
    expect(mail.to).toBe("new@example.com");
    expect(mail.text).toContain("https://keys.khdev.by/login?email=new%40example.com");
    expect(mail.text).toContain("https://docs.khdev.by");
    expect(mail.text).toContain("https://video.khdev.by/welcome");
    expect(mail.text).toContain("Personal Price (1С-Битрикс)");
  });

  it("adds active keys to an existing active customer", async () => {
    const user = await t.createUser({ email: "old@example.com", status: "active" });
    const res = await invite({ email: "old@example.com", solutions: ["wp-seo"] });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ userId: user.id, created: false });
    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
    expect(keys.map((k) => [k.platform, k.status])).toEqual([["wordpress", "active"]]);
    expect(t.mailer.sent[0]?.subject).toMatch(/New KHDev license keys/);
  });

  it("re-sends the invite to a customer who has not signed in yet", async () => {
    const user = await t.createUser({ email: "pending@example.com", status: "inactive" });
    const res = await invite({ email: "pending@example.com", solutions: ["personal-price"] });
    expect(res.json()).toMatchObject({ userId: user.id, created: false });
    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
    expect(keys[0]?.status).toBe("inactive");
    expect(t.mailer.sent[0]?.subject).toMatch(/license is ready/);
  });

  it("refuses to invite a blocked customer", async () => {
    await t.createUser({ email: "blocked@example.com", status: "blocked" });
    const res = await invite({ email: "blocked@example.com", solutions: ["personal-price"] });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("USER_BLOCKED");
    expect(t.mailer.sent).toHaveLength(0);
  });

  it("refuses to invite an email that belongs to an admin", async () => {
    await t.createUser({ email: "boss@khdev.by", role: "admin" });
    const res = await invite({ email: "boss@khdev.by", solutions: ["personal-price"] });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("USER_IS_ADMIN");
  });

  it("re-invites a removed customer as a new user", async () => {
    const removed = await t.createUser({ email: "back@example.com", status: "removed" });
    const oldKey = await t.createKey({ userId: removed.id });
    const res = await invite({ email: "back@example.com", solutions: ["personal-price"] });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.created).toBe(true);
    expect(body.userId).not.toBe(removed.id);

    const [old] = await t.db.select().from(users).where(eq(users.id, removed.id));
    expect(old?.status).toBe("removed");
    const [fresh] = await t.db.select().from(users).where(eq(users.id, body.userId));
    expect(fresh?.status).toBe("inactive");
    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, body.userId));
    expect(keys.map((k) => k.id)).not.toContain(oldKey.id);
    expect(keys).toHaveLength(1);
  });

  it.each([
    [{ email: "a@b.com", solutions: [] }],
    [{ email: "a@b.com", platforms: ["bitrix"] }],
    [{ email: "not-an-email", solutions: ["personal-price"] }],
  ])("rejects invalid input %j", async (payload) => {
    const res = await invite(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unknown solutions without creating anything", async () => {
    const res = await invite({ email: "a@b.com", solutions: ["personal-price", "nope"] });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("UNKNOWN_SOLUTION");
    expect(await t.db.select().from(users)).toHaveLength(0);
  });
});
