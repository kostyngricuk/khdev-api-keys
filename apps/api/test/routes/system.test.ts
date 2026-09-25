import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../helpers.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp({ env: { APP_VERSION: "v1.2.3", GIT_SHA: "abc1234" } });
});

afterAll(async () => {
  await t.close();
});

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/versions", () => {
  it("returns the release versions from the tag", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/versions" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ api: "1.2.3", dashboard: "1.2.3", docs: "1.2.3", commit: "abc1234" });
    expect(typeof res.json().builtAt).toBe("string");
  });
});

describe("unknown routes", () => {
  it("return the API error shape", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } });
  });
});
