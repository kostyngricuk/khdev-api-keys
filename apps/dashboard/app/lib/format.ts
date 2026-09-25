import type { Platform } from "@khdev/contracts";
import { DEFAULT_LOCALE, translate, type Locale } from "~/i18n";

export const platformLabel = (platform: Platform, locale: Locale = DEFAULT_LOCALE) =>
  translate(locale, `platform.${platform}`);

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getUTCFullYear()}`;
}

export const avatarLetter = (email: string) => email.trim().charAt(0).toUpperCase() || "?";

export const versionLabel = (version: string) => `v${version.replace(/^v/, "")}`;

/** Keys are never shown in full; the copy button copies the whole value. */
export const maskKey = (key: string) => `${key.slice(0, 4)}…${key.slice(-4)}`;
