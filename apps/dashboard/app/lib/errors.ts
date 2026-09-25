const MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: "User not found",
  USER_BLOCKED: "Your account is blocked. Contact support to restore access.",
  CODE_INVALID: "The code is incorrect. Check the email and try again.",
  CODE_EXPIRED: "The code has expired. Request a new one.",
  CODE_ATTEMPTS_EXCEEDED: "Too many wrong attempts. Request a new code.",
  CODE_RESEND_TOO_SOON: "Please wait a minute before requesting a new code.",
  RATE_LIMITED: "Too many requests. Please wait a moment.",
  KEY_EXPIRED: "This key has expired. Extend it first.",
  KEY_NOT_EXPIRED: "Only expired keys can be extended.",
  KEY_NOT_FOUND: "Key not found",
  USER_REMOVED: "Removed customers cannot be changed. Invite the email again instead.",
  TOO_MANY_FILES: "Attach at most 3 files.",
  FILE_TOO_LARGE: "Each file must be 5 MB or smaller.",
  FILE_TYPE_NOT_ALLOWED: "Only PNG, JPEG, PDF, ZIP and TXT files are allowed.",
  API_UNAVAILABLE: "The service is unavailable. Please try again later.",
};

export function errorMessage(code: string, fallback?: string): string {
  return MESSAGES[code] ?? fallback ?? "Something went wrong. Please try again.";
}
