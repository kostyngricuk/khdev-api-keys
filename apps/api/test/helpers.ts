import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { KeyStatus, Platform, UserRole, UserStatus } from "@khdev/contracts";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import type { Database } from "../src/db/client.js";
import * as schema from "../src/db/schema.js";
import { generateKey } from "../src/lib/key.js";
import { createMemoryMailer } from "../src/mail/mailer.js";
import { createSession } from "../src/services/sessions.js";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const DAY_MS = 86_400_000;

export const TEST_SERVICE_TOKEN = "test-service-token-123456";

export type TestAppOptions = {
  env?: Record<string, string>;
};

/** Boots the real app on an in-memory Postgres (PGlite) with an in-memory mailer and a controllable clock. */
export async function createTestApp(options: TestAppOptions = {}) {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrator expects the concrete driver type
  await migrate(db as any, { migrationsFolder });

  const uploadDir = await mkdtemp(join(tmpdir(), "khdev-uploads-"));
  const config = loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
    AUTH_CODE_PEPPER: "test-pepper-1234567890",
    SERVICE_TOKEN: TEST_SERVICE_TOKEN,
    UPLOAD_DIR: uploadDir,
    ...options.env,
  });
  const memory = createMemoryMailer();
  // Tests can flip `mailer.failing` to simulate an SMTP outage.
  const mailer = Object.assign(memory, {
    failing: false,
    async send(message: Parameters<typeof memory.send>[0]) {
      if (mailer.failing) throw new Error("SMTP unavailable");
      memory.sent.push(message);
    },
  });

  let current: Date | null = null;
  const clock = {
    now: () => current ?? new Date(),
    set: (date: Date) => {
      current = date;
    },
    advance: (ms: number) => {
      current = new Date(clock.now().getTime() + ms);
    },
    reset: () => {
      current = null;
    },
  };

  const app = await buildApp({ config, db, mailer, now: clock.now });
  await app.ready();
  const ctx = app.ctx;

  async function createUser(input: { email: string; role?: UserRole; status?: UserStatus; createdAt?: Date }) {
    const [user] = await db
      .insert(schema.users)
      .values({
        email: input.email,
        role: input.role ?? "customer",
        status: input.status ?? "active",
        ...(input.createdAt ? { createdAt: input.createdAt, invitedAt: input.createdAt } : {}),
      })
      .returning();
    return user!;
  }

  async function createKey(input: {
    userId: string;
    platform?: Platform;
    status?: KeyStatus;
    createdAt?: Date;
    expiresAt?: Date;
    activationLimit?: number;
  }) {
    const createdAt = input.createdAt ?? clock.now();
    const expiresAt = input.expiresAt ?? new Date(createdAt.getTime() + 365 * DAY_MS);
    const [key] = await db
      .insert(schema.apiKeys)
      .values({
        userId: input.userId,
        platform: input.platform ?? "wordpress",
        status: input.status ?? "active",
        key: generateKey(createdAt, expiresAt),
        createdAt,
        expiresAt,
        activationLimit: input.activationLimit ?? 3,
      })
      .returning();
    return key!;
  }

  /** Creates a session directly and returns an Authorization header for it. */
  async function authHeader(userId: string) {
    const token = await createSession(ctx, userId);
    return { authorization: `Bearer ${token}` };
  }

  async function createCustomer(email = "customer@example.com") {
    const user = await createUser({ email });
    return { user, headers: await authHeader(user.id) };
  }

  async function createAdmin(email = "boss@khdev.by") {
    const user = await createUser({ email, role: "admin" });
    return { user, headers: await authHeader(user.id) };
  }

  async function reset() {
    await db.execute(
      sql`TRUNCATE ticket_attachments, support_tickets, sessions, login_codes, key_activations, api_keys, users RESTART IDENTITY CASCADE`,
    );
    mailer.clear();
    mailer.failing = false;
    clock.reset();
  }

  async function close() {
    await app.close();
    await client.close();
  }

  return { app, db, mailer, config, clock, createUser, createKey, authHeader, createCustomer, createAdmin, reset, close };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export const DAY = DAY_MS;
