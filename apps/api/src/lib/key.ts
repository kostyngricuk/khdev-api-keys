import { randomUUID } from "node:crypto";

const DAY_MS = 86_400_000;
const KEY_RE = /^([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-F]{4})-([0-9A-Z]{4})-([0-9A-Z]{4})$/;

/** Encodes a date as a 4-char, zero-padded base36 count of days since 1970-01-01 UTC. */
export function encodeDay(date: Date): string {
  const days = Math.floor(date.getTime() / DAY_MS);
  return days.toString(36).toUpperCase().padStart(4, "0");
}

export function decodeDay(segment: string): Date {
  return new Date(Number.parseInt(segment, 36) * DAY_MS);
}

function randomSegment(): string {
  return randomUUID().slice(0, 4).toUpperCase();
}

/** Builds a key in the QQQQ-WWWW-EEEE-RRRR-TTTT-YYYY format. */
export function generateKey(createdAt: Date, expiresAt: Date): string {
  const random = [randomSegment(), randomSegment(), randomSegment(), randomSegment()];
  return [...random, encodeDay(createdAt), encodeDay(expiresAt)].join("-");
}

export function rebuildKeyExpiry(key: string, expiresAt: Date): string {
  const segments = key.split("-");
  segments[5] = encodeDay(expiresAt);
  return segments.join("-");
}

export type ParsedKey = {
  key: string;
  random: string[];
  createdAt: Date;
  expiresAt: Date;
};

export function parseKey(value: string): ParsedKey | null {
  const key = value.trim().toUpperCase();
  const match = KEY_RE.exec(key);
  if (!match) return null;
  const [, q, w, e, r, t, y] = match as unknown as [string, string, string, string, string, string, string];
  return { key, random: [q, w, e, r], createdAt: decodeDay(t), expiresAt: decodeDay(y) };
}

export function isKeyFormat(value: string): boolean {
  return parseKey(value) !== null;
}

/** Admin views show only the first and last four characters. */
export function maskKey(key: string): string {
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
