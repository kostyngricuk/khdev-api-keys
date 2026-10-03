import "@radix-ui/themes/styles.css";
// Astryx components assume this baseline (border-box sizing, zeroed margins); it sits in
// @layer reset, so unlayered Radix and app styles still win during coexistence.
import "@astryxdesign/core/reset.css";
import "./app.css";
import "./theme/khdev.css";

import { InternationalizationProvider, LayerProvider, LinkProvider, Theme as AstryxTheme } from "@astryxdesign/core";
import astryxRu from "@astryxdesign/core/locales/ru-RU.json";
import { Box, Button, Card, Code, Flex, Heading, Text, Theme } from "@radix-ui/themes";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";
import { DEFAULT_LOCALE, localeFromCookie } from "~/i18n";
import { I18nProvider, useI18n } from "~/i18n/context";
import { ValidationMessages } from "~/components/ValidationMessages";
import { appTitle } from "~/lib/meta";
import { RouterLink } from "~/lib/router-link";
import { khdevTheme } from "./theme/khdev";
import type { Route } from "./+types/root";

export async function loader({ request }: Route.LoaderArgs) {
  return { locale: localeFromCookie(request.headers.get("Cookie")) };
}

export const meta: Route.MetaFunction = ({ matches }) => appTitle(matches);

// Astryx's built-in strings (placeholders, aria labels, "Skip to content") follow the app locale;
// "en" is the catalog Astryx always ships.
const ASTRYX_MESSAGES = { ru: astryxRu };

export const links: Route.LinksFunction = () => [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }];

export function Layout({ children }: { children: React.ReactNode }) {
  // Also rendered for errors, when the root loader data may be missing.
  const locale = useRouteLoaderData<typeof loader>("root")?.locale ?? DEFAULT_LOCALE;
  return (
    <html lang={locale} data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Pin the cascade order before any stylesheet loads: Astryx's reset/theme layers rank
            below StyleX's priority* layers. Builds get this order from root.css; in dev the StyleX
            <style> can be injected before Vite's CSS and would otherwise invert it. */}
        <style>{"@layer reset, astryx-base, astryx-theme;"}</style>
        <Meta />
        <Links />
        {/* Dev only: the StyleX plugin serves collected CSS at /virtual:stylex.css but links it via
            transformIndexHtml, which React Router SSR never calls. The runtime refetches it on HMR
            (and disables this link, hence suppressHydrationWarning). Builds append it to root.css. */}
        {import.meta.env.DEV && (
          <>
            <link rel="stylesheet" href="/virtual:stylex.css" suppressHydrationWarning />
            <script type="module" src="/@id/virtual:stylex:runtime" />
          </>
        )}
      </head>
      <body>
        <I18nProvider locale={locale}>
          <ValidationMessages />
          <Theme accentColor="indigo" grayColor="slate" radius="medium" scaling="100%">
            {/* Astryx coexists inside Radix until Task 7 removes Radix. mode="light" pins
                color-scheme so light-dark() tokens never resolve to their dark branch. */}
            <AstryxTheme theme={khdevTheme} mode="light">
              <InternationalizationProvider locale={locale} messages={ASTRYX_MESSAGES}>
                {/* AppShell does not provide this yet (Astryx 0.6.x); without it useToast mounts a
                    fallback root outside the theme and i18n scope. */}
                <LayerProvider>
                  <LinkProvider component={RouterLink}>{children}</LinkProvider>
                </LayerProvider>
              </InternationalizationProvider>
            </AstryxTheme>
          </Theme>
        </I18nProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useI18n();
  let title = t("errorPage.title");
  let details = t("errorPage.details");
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? t("errorPage.notFoundTitle") : t("errorPage.errorStatus", { status: error.status });
    details = error.status === 404 ? t("errorPage.notFoundDetails") : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Flex align="center" justify="center" p="4" style={{ minHeight: "100vh" }}>
      <Card size="3" style={{ maxWidth: 560, width: "100%" }}>
        <Flex direction="column" gap="3">
          <Heading size="5">{title}</Heading>
          <Text color="gray">{details}</Text>
          {stack && (
            <Box style={{ overflow: "auto" }}>
              <Code size="1" style={{ whiteSpace: "pre" }}>
                {stack}
              </Code>
            </Box>
          )}
          <Box>
            <Button asChild variant="soft">
              <a href="/">{t("errorPage.goHome")}</a>
            </Button>
          </Box>
        </Flex>
      </Card>
    </Flex>
  );
}
