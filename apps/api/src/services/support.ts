import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyRequest } from "fastify";
import {
  SUPPORT_ALLOWED_MIME_TYPES,
  SUPPORT_MAX_FILES,
  supportTicketFields,
  type AuthUser,
} from "@khdev/contracts";
import type { AppContext } from "../context.js";
import { supportTickets, ticketAttachments } from "../db/schema.js";
import { AppError, badRequest, payloadTooLarge } from "../lib/errors.js";
import { supportTicketEmail } from "../mail/templates.js";

type SavedFile = { fileName: string; mimeType: string; size: number; storagePath: string };

const safeName = (name: string) => basename(name).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";

function isFileTooLarge(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE";
}

/** Streams the multipart request to disk, validating count, type and size before anything is stored in the DB. */
async function readTicketRequest(request: FastifyRequest, dir: string) {
  const fields: Record<string, string> = {};
  const files: SavedFile[] = [];

  for await (const part of request.parts()) {
    if (part.type === "field") {
      if (typeof part.value === "string") fields[part.fieldname] = part.value;
      continue;
    }
    if (files.length >= SUPPORT_MAX_FILES) {
      part.file.resume();
      throw badRequest("TOO_MANY_FILES", `Attach at most ${SUPPORT_MAX_FILES} files`);
    }
    if (!(SUPPORT_ALLOWED_MIME_TYPES as readonly string[]).includes(part.mimetype)) {
      part.file.resume();
      throw badRequest("FILE_TYPE_NOT_ALLOWED", `${part.filename} has a type that is not allowed`);
    }
    await mkdir(dir, { recursive: true });
    const fileName = safeName(part.filename);
    const storagePath = join(dir, `${files.length + 1}-${fileName}`);
    await pipeline(part.file, createWriteStream(storagePath));
    files.push({ fileName, mimeType: part.mimetype, size: part.file.bytesRead, storagePath });
  }
  return { fields, files };
}

export async function createSupportTicket(ctx: AppContext, user: AuthUser, request: FastifyRequest) {
  const id = randomUUID();
  const dir = resolve(ctx.config.uploadDir, "tickets", id);

  let parsed: Awaited<ReturnType<typeof readTicketRequest>>;
  try {
    parsed = await readTicketRequest(request, dir);
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    if (isFileTooLarge(error)) throw payloadTooLarge("FILE_TOO_LARGE", "Each file must be 5 MB or smaller");
    if (error instanceof AppError) throw error;
    const code = (error as { code?: string }).code;
    if (code === "FST_FILES_LIMIT") throw badRequest("TOO_MANY_FILES", `Attach at most ${SUPPORT_MAX_FILES} files`);
    throw error;
  }

  const fields = supportTicketFields.safeParse(parsed.fields);
  if (!fields.success) {
    await rm(dir, { recursive: true, force: true });
    const message = fields.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw badRequest("VALIDATION_ERROR", message);
  }

  await ctx.db.transaction(async (tx) => {
    await tx.insert(supportTickets).values({ id, userId: user.id, ...fields.data, createdAt: ctx.now() });
    if (parsed.files.length) {
      await tx.insert(ticketAttachments).values(parsed.files.map((file) => ({ ticketId: id, ...file })));
    }
  });

  await ctx.mailer.send(
    supportTicketEmail({
      to: ctx.config.supportEmail,
      from: user.email,
      ticketId: id,
      topic: fields.data.topic,
      description: fields.data.description,
      attachments: parsed.files.map((f) => ({ filename: f.fileName, path: f.storagePath, contentType: f.mimeType })),
    }),
  );
  return { id };
}
