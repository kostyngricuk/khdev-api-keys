import { intlLocale, type Locale } from "~/i18n";

export type AttachmentLimits = {
  maxFiles: number;
  maxBytes: number;
  mimeTypes: readonly string[];
  extensions: readonly string[];
};

type FileLike = { name: string; size: number; type: string; lastModified: number };

export type AttachmentError = { code: "tooMany" | "tooLarge" | "type" | "duplicate"; name: string };

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

const sameFile = (a: FileLike, b: FileLike) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/** Adds picked/dropped files to the current list, enforcing count, size and type limits. */
export function addAttachments<F extends FileLike>(
  current: F[],
  incoming: F[],
  limits: AttachmentLimits,
): { files: F[]; errors: AttachmentError[] } {
  const files = [...current];
  const errors: AttachmentError[] = [];
  for (const file of incoming) {
    if (files.some((existing) => sameFile(existing, file))) {
      errors.push({ code: "duplicate", name: file.name });
    } else if (!limits.mimeTypes.includes(file.type) && !limits.extensions.includes(extensionOf(file.name))) {
      errors.push({ code: "type", name: file.name });
    } else if (file.size > limits.maxBytes) {
      errors.push({ code: "tooLarge", name: file.name });
    } else if (files.length >= limits.maxFiles) {
      errors.push({ code: "tooMany", name: file.name });
    } else {
      files.push(file);
    }
  }
  return { files, errors };
}

export function formatFileSize(bytes: number, units: { b: string; kb: string; mb: string }, locale: Locale): string {
  const number = (value: number) => value.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 });
  if (bytes < 1024) return `${bytes} ${units.b}`;
  if (bytes < 1024 * 1024) return `${number(bytes / 1024)} ${units.kb}`;
  return `${number(bytes / (1024 * 1024))} ${units.mb}`;
}
