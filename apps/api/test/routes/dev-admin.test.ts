import { afterEach, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../helpers.js";

let t: TestApp | undefined;

afterEach(async () => {
  await t?.close();
  t = undefined;
});

const verify = (app: TestApp, email: string, code: string) =>
  app.app.inject({ method: "POST", url: "/api/auth/verify-code", payload: { email, code } });

describe("dev admin login", () => {
  it("accepts 123456 for admin@khdev.by in development with DEV_ADMIN_ENABLED=true", async () => {
    t = await createTestApp({ env: { NODE_ENV: "development", DEV_ADMIN_ENABLED: "true", LOG_LEVEL: "silent" } });
    await t.createUser({ email: "admin@khdev.by", role: "admin" });
    const res = await verify(t, "admin@khdev.by", "123456");
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ email: "admin@khdev.by", role: "admin" });
  });

  it("does not accept 123456 for other users in development", async () => {
    t = await createTestApp({ env: { NODE_ENV: "development", DEV_ADMIN_ENABLED: "true", LOG_LEVEL: "silent" } });
    await t.createUser({ email: "someone@example.com" });
    expect((await verify(t, "someone@example.com", "123456")).statusCode).toBe(401);
  });

  it("rejects 123456 in production", async () => {
    t = await createTestApp({ env: { NODE_ENV: "production", LOG_LEVEL: "silent" } });
    await t.createUser({ email: "admin@khdev.by", role: "admin" });
    const res = await verify(t, "admin@khdev.by", "123456");
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("CODE_INVALID");
  });
});
