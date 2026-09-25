import { SUPPORT_MAX_FILE_BYTES, SUPPORT_MAX_FILES } from "@khdev/contracts";

/** 3 × 5 MB files plus room for the text fields and multipart framing. */
export const SUPPORT_BODY_LIMIT = SUPPORT_MAX_FILES * SUPPORT_MAX_FILE_BYTES + 512 * 1024;

/**
 * `request.formData()` buffers the whole body in memory, so oversized uploads are refused by their
 * declared length first. Browsers always send Content-Length for form posts.
 */
export function bodyLimitError(request: Request, limit: number): { status: number; code: string } | null {
  const header = request.headers.get("content-length");
  const length = header === null ? Number.NaN : Number(header);
  if (!Number.isFinite(length)) return { status: 411, code: "UPLOAD_NO_LENGTH" };
  if (length > limit) return { status: 413, code: "UPLOAD_TOO_LARGE" };
  return null;
}
