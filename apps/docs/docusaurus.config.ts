import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const dashboardUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";

const config: Config = {
  title: "KHDev Keys",
  tagline: "License keys for KHDev plugins",
  favicon: "img/favicon.svg",
  url: process.env.DOCS_URL ?? "http://localhost:3002",
  baseUrl: "/",
  onBrokenLinks: "throw",
  future: { v4: true },
  i18n: { defaultLocale: "en", locales: ["en"] },
  customFields: {
    dashboardUrl,
    version: (process.env.APP_VERSION ?? "0.0.0-dev").replace(/^v/, ""),
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
      title: "KHDev Keys",
      logo: { alt: "KHDev Keys", src: "img/favicon.svg" },
      items: [{ href: dashboardUrl, label: "Open dashboard", position: "right" }],
    },
    footer: {
      style: "light",
      copyright: `© ${new Date().getFullYear()} KHDev`,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};

export default config;
