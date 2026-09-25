import type { Platform } from "@khdev/contracts";

export const PLATFORM_LABELS: Record<Platform, string> = {
  bitrix: "1С-Битрикс",
  wordpress: "WordPress",
  opencart: "OpenCart",
  shopify: "Shopify",
};

export const platformLabel = (platform: Platform) => PLATFORM_LABELS[platform];

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getUTCFullYear()}`;
}

export const statusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

export const avatarLetter = (email: string) => email.trim().charAt(0).toUpperCase() || "?";
