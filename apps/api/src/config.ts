import { z } from "zod";

export const DEV_ADMIN_EMAIL = "admin@khdev.by";
export const DEV_CUSTOMER_EMAIL = "customer@khdev.by";
/** Local accounts that can sign in with DEV_ADMIN_CODE in every environment except production. */
export const DEV_LOGIN_EMAILS: readonly string[] = [DEV_ADMIN_EMAIL, DEV_CUSTOMER_EMAIL];
export const DEV_ADMIN_CODE = "123456";

const bool = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  // A missing NODE_ENV is production: dev defaults (fixed login code, built-in tokens) must be opted into.
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().default(3001),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "DATABASE_URL must be a postgres:// URL" }),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("KHDev API Keys <no-reply@khdev.by>"),
  SUPPORT_EMAIL: z.email().default("support@khdev.by"),
  DASHBOARD_URL: z.url().default("http://localhost:3000"),
  DOCS_URL: z.url().default("http://localhost:3002"),
  WELCOME_VIDEO_URL: z.url().default("https://www.youtube.com/@khdev"),
  SERVICE_TOKEN: z.string().min(16).optional(),
  AUTH_CODE_PEPPER: z.string().min(16).optional(),
  KEY_TERM_DAYS: z.coerce.number().int().min(1).default(365),
  UPLOAD_DIR: z.string().default("./uploads"),
  CORS_ORIGIN: z.string().optional(),
  // Number of reverse proxies in front of the API (0 = trust none; X-Forwarded-For is ignored).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  MAIL_TRANSPORT: z.enum(["smtp", "log"]).default("smtp"),
  RATE_LIMIT_ENABLED: z.enum(["true", "false", "1", "0"]).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  APP_VERSION: z.string().optional(),
  GIT_SHA: z.string().optional(),
  BUILT_AT: z.string().optional(),
});

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(env: Record<string, string | undefined>) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }
  const e = parsed.data;
  const isDev = e.NODE_ENV === "development";
  const isProd = e.NODE_ENV === "production";

  if (isProd && (!e.AUTH_CODE_PEPPER || !e.SERVICE_TOKEN)) {
    throw new Error("Invalid configuration: AUTH_CODE_PEPPER and SERVICE_TOKEN are required in production");
  }

  return {
    env: e.NODE_ENV,
    isDev,
    isProd,
    isTest: e.NODE_ENV === "test",
    host: e.HOST,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    databasePoolMax: e.DATABASE_POOL_MAX,
    logLevel: e.LOG_LEVEL ?? (e.NODE_ENV === "test" ? "silent" : "info"),
    smtp: { host: e.SMTP_HOST, port: e.SMTP_PORT, secure: e.SMTP_SECURE, user: e.SMTP_USER, pass: e.SMTP_PASS },
    mailTransport: e.MAIL_TRANSPORT,
    rateLimitEnabled:
      e.RATE_LIMIT_ENABLED === undefined ? e.NODE_ENV !== "test" : e.RATE_LIMIT_ENABLED === "true" || e.RATE_LIMIT_ENABLED === "1",
    mailFrom: e.MAIL_FROM,
    supportEmail: e.SUPPORT_EMAIL,
    dashboardUrl: e.DASHBOARD_URL.replace(/\/$/, ""),
    docsUrl: e.DOCS_URL.replace(/\/$/, ""),
    welcomeVideoUrl: e.WELCOME_VIDEO_URL,
    serviceToken: e.SERVICE_TOKEN ?? "dev-service-token-change-me",
    authCodePepper: e.AUTH_CODE_PEPPER ?? "dev-pepper-change-me",
    keyTermDays: e.KEY_TERM_DAYS,
    uploadDir: e.UPLOAD_DIR,
    // A missing NODE_ENV is production, so the fixed dev code is only ever accepted when explicitly not production.
    devLoginEnabled: !isProd,
    corsOrigin: e.CORS_ORIGIN,
    trustProxy: e.TRUST_PROXY,
    version: { APP_VERSION: e.APP_VERSION, GIT_SHA: e.GIT_SHA, BUILT_AT: e.BUILT_AT },
  };
}
