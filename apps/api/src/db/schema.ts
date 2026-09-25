import { sql } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { KEY_STATUSES, PLATFORMS, SUPPORT_TOPICS, USER_ROLES, USER_STATUSES } from "@khdev/contracts";

export const userRole = pgEnum("user_role", USER_ROLES);
export const userStatus = pgEnum("user_status", USER_STATUSES);
export const platform = pgEnum("platform", PLATFORMS);
export const keyStatus = pgEnum("key_status", KEY_STATUSES);
export const supportTopic = pgEnum("support_topic", SUPPORT_TOPICS);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: userRole("role").notNull().default("customer"),
    status: userStatus("status").notNull().default("inactive"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Removed users keep their row; the email can be invited again as a new user.
    uniqueIndex("users_email_active_uq").on(t.email).where(sql`${t.status} <> 'removed'`),
    index("users_created_at_idx").on(t.createdAt),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    platform: platform("platform").notNull(),
    key: text("key").notNull().unique(),
    status: keyStatus("status").notNull().default("inactive"),
    activationLimit: integer("activation_limit").notNull().default(3),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    regeneratedAt: timestamp("regenerated_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("api_keys_user_idx").on(t.userId), index("api_keys_created_at_idx").on(t.createdAt)],
);

export const keyActivations = pgTable(
  "key_activations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyId: uuid("key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("key_activations_key_domain_uq").on(t.keyId, t.domain)],
);

export const loginCodes = pgTable(
  "login_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("login_codes_user_idx").on(t.userId)],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  topic: supportTopic("topic").notNull(),
  description: text("description").notNull(),
  ...timestamps,
});

export const ticketAttachments = pgTable("ticket_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => supportTickets.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  storagePath: text("storage_path").notNull(),
});
