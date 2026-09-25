import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../helpers.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

describe("GET /api/solutions", () => {
  it("requires a session", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/solutions" })).statusCode).toBe(401);
  });

  it("lists the solutions, starting with Personal Price on 1С-Битрикс", async () => {
    const { headers } = await t.createCustomer();
    const res = await t.app.inject({ method: "GET", url: "/api/solutions", headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { id: expect.any(String), slug: "personal-price", name: "Personal Price", platform: "bitrix", storeUrl: null },
    ]);
  });
});
