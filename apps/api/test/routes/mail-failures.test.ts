import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiKeys, supportTickets, users } from "../../src/db/schema.js";
import { createTestApp, TEST_SERVICE_TOKEN, type TestApp } from "../helpers.js";

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

describe("when email delivery fails", () => {
  it("an invite still succeeds, so a retrying shop does not create duplicate keys", async () => {
    t.mailer.failing = true;
    const res = await t.app.inject({
      method: "POST",
      url: "/api/invites",
      headers: { "x-service-token": TEST_SERVICE_TOKEN },
      payload: { email: "buyer@example.com", platforms: ["wordpress"] },
    });
    expect(res.statusCode).toBe(201);
    const [user] = await t.db.select().from(users).where(eq(users.email, "buyer@example.com"));
    expect(await t.db.select().from(apiKeys).where(eq(apiKeys.userId, user!.id))).toHaveLength(1);
  });

  it("request-code reports MAIL_FAILED and lets the user retry right away", async () => {
    await t.createUser({ email: "user@example.com" });
    t.mailer.failing = true;
    const failed = await t.app.inject({ method: "POST", url: "/api/auth/request-code", payload: { email: "user@example.com" } });
    expect(failed.statusCode).toBe(502);
    expect(failed.json().error.code).toBe("MAIL_FAILED");

    t.mailer.failing = false;
    const retry = await t.app.inject({ method: "POST", url: "/api/auth/request-code", payload: { email: "user@example.com" } });
    expect(retry.statusCode).toBe(200);
  });

  it("a support ticket is still stored and confirmed", async () => {
    const { headers } = await t.createCustomer();
    t.mailer.failing = true;
    const form = new FormData();
    form.append("topic", "bug");
    form.append("description", "Something is broken on checkout.");
    const res = await t.app.inject({ method: "POST", url: "/api/support/tickets", payload: form, headers });
    expect(res.statusCode).toBe(201);
    expect(await t.db.select().from(supportTickets)).toHaveLength(1);
  });
});
