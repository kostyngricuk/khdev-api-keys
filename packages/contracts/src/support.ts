import { z } from "zod";
import { supportTopicSchema } from "./enums.js";

export const SUPPORT_MAX_FILES = 3;
export const SUPPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const SUPPORT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
] as const;

export const supportTicketFields = z.object({
  topic: supportTopicSchema,
  description: z.string().trim().min(10).max(5000),
});
export type SupportTicketFields = z.infer<typeof supportTicketFields>;

export const supportTicketResponse = z.object({ id: z.uuid() });
export type SupportTicketResponse = z.infer<typeof supportTicketResponse>;
