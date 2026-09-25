import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../helpers.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp({ env: { RATE_LIMIT_ENABLED: "true" } });
  await t.createUser({ email: "a@example.com" });
  await t.createUser({ email: "b@example.com" });
});
afterAll(async () => {
  await t.close();
});

const verify = (email: string) =>
  t.app.inject({ method: "POST", url: "/api/auth/verify-code", payload: { email, code: "000000" } });

describe("auth rate limiting", () => {
  it("limits attempts per email, not for everyone behind the dashboard", async () => {
    for (let i = 0; i < 10; i++) expect((await verify("a@example.com")).statusCode).not.toBe(429);
    const limited = await verify("a@example.com");
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe("RATE_LIMITED");
    expect((await verify("b@example.com")).statusCode).toBe(401);
  });
});
