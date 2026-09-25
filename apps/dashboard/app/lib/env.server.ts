import type { Platform } from "@khdev/contracts";

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required in production");
}

const trimSlash = (value: string) => value.replace(/\/$/, "");

export const env = {
  isProduction,
  apiUrl: trimSlash(process.env.API_URL ?? "http://localhost:3001"),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
  docsUrl: trimSlash(process.env.DOCS_URL ?? "http://localhost:3002"),
  /** Set from the git tag at release build time (see .github/workflows/release.yml). */
  appVersion: process.env.APP_VERSION,
  storeUrls: {
    bitrix: process.env.STORE_URL_BITRIX ?? "https://marketplace.1c-bitrix.ru/",
    wordpress: process.env.STORE_URL_WORDPRESS ?? "https://wordpress.org/plugins/",
    opencart: process.env.STORE_URL_OPENCART ?? "https://www.opencart.com/index.php?route=marketplace/extension",
    shopify: process.env.STORE_URL_SHOPIFY ?? "https://apps.shopify.com/",
  } satisfies Record<Platform, string>,
};
