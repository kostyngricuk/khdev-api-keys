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

const requestCode = (email: string) => t.app.inject({ method: "POST", url: "/api/auth/request-code", payload: { email } });
const verifyCode = (email: string, code: string) =>
  t.app.inject({ method: "POST", url: "/api/auth/verify-code", payload: { email, code } });

function lastCode(): string {
  const mail = t.mailer.sent.at(-1);
  const match = mail?.text.match(/\b(\d{6})\b/);
  if (!match?.[1]) throw new Error("No code in the last email");
  return match[1];
}

describe("POST /api/auth/request-code", () => {
  it("returns USER_NOT_FOUND for an unknown email", async () => {
    const res = await requestCode("nobody@example.com");
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("USER_NOT_FOUND");
    expect(t.mailer.sent).toHaveLength(0);
  });

  it("returns USER_NOT_FOUND for a removed user", async () => {
    await t.createUser({ email: "gone@example.com", status: "removed" });
    const res = await requestCode("gone@example.com");
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("USER_NOT_FOUND");
  });

  it("returns USER_BLOCKED and sends nothing for a blocked user", async () => {
    await t.createUser({ email: "blocked@example.com", status: "blocked" });
    const res = await requestCode("blocked@example.com");
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("USER_BLOCKED");
    expect(t.mailer.sent).toHaveLength(0);
  });

  it.each(["inactive", "active"] as const)("emails a 6-digit code to a %s user", async (status) => {
    await t.createUser({ email: "user@example.com", status });
    const res = await requestCode("user@example.com");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, resendAfterSeconds: 60 });
    expect(t.mailer.sent).toHaveLength(1);
    expect(t.mailer.sent[0]?.to).toBe("user@example.com");
    expect(lastCode()).toMatch(/^\d{6}$/);
  });

  it("matches emails regardless of case and whitespace", async () => {
    await t.createUser({ email: "user@x.com" });
    const res = await requestCode("  USER@X.COM ");
    expect(res.statusCode).toBe(200);
  });

  it("refuses to resend within 60 seconds", async () => {
    await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    const res = await requestCode("user@example.com");
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe("CODE_RESEND_TOO_SOON");
  });

  it("allows a resend after 60 seconds and invalidates the old code", async () => {
    await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    const oldCode = lastCode();
    t.clock.advance(61_000);
    expect((await requestCode("user@example.com")).statusCode).toBe(200);
    const newCode = lastCode();
    if (oldCode !== newCode) {
      expect((await verifyCode("user@example.com", oldCode)).statusCode).toBe(401);
    }
    expect((await verifyCode("user@example.com", newCode)).statusCode).toBe(200);
  });

  it("rejects an invalid email", async () => {
    const res = await requestCode("not-an-email");
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/verify-code", () => {
  it("signs in with the correct code", async () => {
    await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    const res = await verifyCode("user@example.com", lastCode());
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ email: "user@example.com", role: "customer", status: "active" });
  });

  it("activates an invited user and their inactive keys on first login", async () => {
    const user = await t.createUser({ email: "new@example.com", status: "inactive" });
    await t.createKey({ userId: user.id, status: "inactive" });
    await requestCode("new@example.com");
    await verifyCode("new@example.com", lastCode());

    const [row] = await t.db.select().from(users).where(eq(users.id, user.id));
    expect(row?.status).toBe("active");
    expect(row?.lastLoginAt).toBeInstanceOf(Date);
    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
    expect(keys.map((k) => k.status)).toEqual(["active"]);
  });

  it("does not reactivate keys the customer deactivated after the first login", async () => {
    const user = await t.createUser({ email: "user@example.com", status: "active" });
    await t.createKey({ userId: user.id, status: "inactive" });
    await requestCode("user@example.com");
    await verifyCode("user@example.com", lastCode());
    const keys = await t.db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
    expect(keys.map((k) => k.status)).toEqual(["inactive"]);
  });

  it("does not accept the same code twice", async () => {
    await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    const code = lastCode();
    expect((await verifyCode("user@example.com", code)).statusCode).toBe(200);
    const res = await verifyCode("user@example.com", code);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("CODE_INVALID");
  });

  it("rejects a wrong code", async () => {
    await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    const wrong = lastCode() === "000000" ? "111111" : "000000";
    const res = await verifyCode("user@example.com", wrong);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("CODE_INVALID");
  });

  it("locks the code after 5 wrong attempts", async () => {
    await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    const code = lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) {
      expect((await verifyCode("user@example.com", wrong)).statusCode).toBe(401);
    }
    const fifth = await verifyCode("user@example.com", wrong);
    expect(fifth.statusCode).toBe(429);
    expect(fifth.json().error.code).toBe("CODE_ATTEMPTS_EXCEEDED");
    expect((await verifyCode("user@example.com", code)).statusCode).toBe(429);
  });

  it("counts wrong attempts atomically when they arrive in parallel", async () => {
    await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    const code = lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    await Promise.all(Array.from({ length: 10 }, () => verifyCode("user@example.com", wrong)));
    const res = await verifyCode("user@example.com", code);
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe("CODE_ATTEMPTS_EXCEEDED");
  });

  it("rejects an expired code", async () => {
    await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    t.clock.advance(10 * 60_000 + 1000);
    const res = await verifyCode("user@example.com", lastCode());
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("CODE_EXPIRED");
  });

  it("rejects a blocked user even with a valid code", async () => {
    const user = await t.createUser({ email: "user@example.com" });
    await requestCode("user@example.com");
    await t.db.update(users).set({ status: "blocked" }).where(eq(users.id, user.id));
    const res = await verifyCode("user@example.com", lastCode());
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("USER_BLOCKED");
  });

  it("rejects a code that is not 6 digits", async () => {
    const res = await verifyCode("user@example.com", "12ab");
    expect(res.statusCode).toBe(400);
  });

});

describe("GET /api/auth/me and POST /api/auth/logout", () => {
  it("requires a session", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });

  it("returns the current user", async () => {
    const { user, headers } = await t.createCustomer();
    const res = await t.app.inject({ method: "GET", url: "/api/auth/me", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: user.id, email: user.email, role: "customer", status: "active" });
  });

  it("invalidates the session on logout", async () => {
    const { headers } = await t.createCustomer();
    const res = await t.app.inject({ method: "POST", url: "/api/auth/logout", headers });
    expect(res.statusCode).toBe(200);
    expect((await t.app.inject({ method: "GET", url: "/api/auth/me", headers })).statusCode).toBe(401);
  });
});
