import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { execFileSync } from "node:child_process";
import { themes as prismThemes } from "prism-react-renderer";

const dashboardUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";

/** Release tag (APP_VERSION) in CI; `git describe --tags` locally; otherwise a dev version. */
function docsVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION.replace(/^v/, "");
  try {
    return execFileSync("git", ["describe", "--tags"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
      .replace(/^v/, "");
  } catch {
    return "0.0.0-dev";
  }
}

const config: Config = {
  title: "KHDev API Keys",
  tagline: "Лицензионные ключи для решений KHDev",
  favicon: "img/favicon.svg",
  url: process.env.DOCS_URL ?? "http://localhost:3002",
  baseUrl: "/",
  onBrokenLinks: "throw",
  future: { v4: true },
  // Russian is the main language; English lives under /en/.
  i18n: {
    defaultLocale: "ru",
    locales: ["ru", "en"],
    localeConfigs: {
      ru: { label: "Русский", htmlLang: "ru-RU" },
      en: { label: "English", htmlLang: "en-US" },
    },
  },
  customFields: {
    dashboardUrl,
    version: docsVersion(),
  },
  presets: [
    [
      "classic",
      {
        // Docs-only site: the docs are served from the root and there is no blog or landing page.
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
        },
        blog: false,
        pages: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      // The wordmark is rendered by src/theme/Logo.
      items: [{ href: dashboardUrl, label: "Открыть дашборд", position: "right" }],
    },
    footer: {
      style: "light",
      copyright: `© ${new Date().getFullYear()} KHDev`,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};

export default config;
