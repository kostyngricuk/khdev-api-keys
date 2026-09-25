import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { supportTickets, ticketAttachments } from "../../src/db/schema.js";
import { createTestApp, type TestApp } from "../helpers.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp({ env: { SUPPORT_EMAIL: "help@khdev.by" } });
});
beforeEach(async () => {
  await t.reset();
});
afterAll(async () => {
  await t.close();
});

type FileSpec = { name: string; type: string; content: string | Uint8Array };

function ticketForm(fields: Record<string, string>, files: FileSpec[] = []) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  for (const file of files) form.append("files", new Blob([file.content], { type: file.type }), file.name);
  return form;
}

const post = (form: FormData, headers: Record<string, string>) =>
  t.app.inject({ method: "POST", url: "/api/support/tickets", payload: form, headers });

const valid = { topic: "activation", description: "The plugin says my key is invalid." };

describe("POST /api/support/tickets", () => {
  it("requires a customer session", async () => {
    expect((await post(ticketForm(valid), {})).statusCode).toBe(401);
    const { headers } = await t.createAdmin();
    expect((await post(ticketForm(valid), headers)).statusCode).toBe(403);
  });

  it("stores the ticket with attachments and emails support", async () => {
    const { user, headers } = await t.createCustomer("me@example.com");
    const res = await post(
      ticketForm(valid, [
        { name: "screen.png", type: "image/png", content: "png-bytes" },
        { name: "log.txt", type: "text/plain", content: "error log" },
      ]),
      headers,
    );
    expect(res.statusCode).toBe(201);
    const { id } = res.json();

    const [ticket] = await t.db.select().from(supportTickets).where(eq(supportTickets.id, id));
    expect(ticket).toMatchObject({ userId: user.id, topic: "activation", description: valid.description });
    const files = await t.db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, id));
    expect(files.map((f) => f.fileName).sort()).toEqual(["log.txt", "screen.png"]);
    const log = files.find((f) => f.fileName === "log.txt")!;
    expect(await readFile(log.storagePath, "utf8")).toBe("error log");

    expect(t.mailer.sent).toHaveLength(1);
    const mail = t.mailer.sent[0]!;
    expect(mail.to).toBe("help@khdev.by");
    expect(mail.replyTo).toBe("me@example.com");
    expect(mail.attachments).toHaveLength(2);
  });

  it("accepts a ticket without attachments", async () => {
    const { headers } = await t.createCustomer();
    expect((await post(ticketForm(valid), headers)).statusCode).toBe(201);
  });

  it.each([
    [{ topic: "weather", description: valid.description }],
    [{ topic: "bug", description: "short" }],
    [{ description: valid.description }],
  ])("rejects invalid fields %j", async (fields) => {
    const { headers } = await t.createCustomer();
    const res = await post(ticketForm(fields), headers);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects more than 3 files", async () => {
    const { headers } = await t.createCustomer();
    const files = Array.from({ length: 4 }, (_, i) => ({ name: `f${i}.txt`, type: "text/plain", content: "x" }));
    const res = await post(ticketForm(valid, files), headers);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("TOO_MANY_FILES");
    expect(await t.db.select().from(supportTickets)).toHaveLength(0);
  });

  it("rejects files over 5 MB", async () => {
    const { headers } = await t.createCustomer();
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    const res = await post(ticketForm(valid, [{ name: "big.zip", type: "application/zip", content: big }]), headers);
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects disallowed file types", async () => {
    const { headers } = await t.createCustomer();
    const res = await post(ticketForm(valid, [{ name: "x.exe", type: "application/x-msdownload", content: "MZ" }]), headers);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("FILE_TYPE_NOT_ALLOWED");
  });

  it("rejects non-multipart requests", async () => {
    const { headers } = await t.createCustomer();
    const res = await t.app.inject({ method: "POST", url: "/api/support/tickets", payload: valid, headers });
    expect(res.statusCode).toBe(415);
  });
});
