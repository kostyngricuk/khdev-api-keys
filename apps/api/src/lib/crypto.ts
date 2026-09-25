import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashSecret(value: string, pepper: string): string {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
