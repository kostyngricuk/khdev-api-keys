import "@radix-ui/themes/styles.css";
import "./app.css";

import { Box, Button, Card, Code, Flex, Heading, Text, Theme } from "@radix-ui/themes";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";
import { DEFAULT_LOCALE, localeFromCookie } from "~/i18n";
import { I18nProvider, useI18n } from "~/i18n/context";
import type { Route } from "./+types/root";

export async function loader({ request }: Route.LoaderArgs) {
  return { locale: localeFromCookie(request.headers.get("Cookie")) };
}

export const meta: Route.MetaFunction = () => [{ title: "KHDev API Keys" }];

export const links: Route.LinksFunction = () => [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }];

export function Layout({ children }: { children: React.ReactNode }) {
  // Also rendered for errors, when the root loader data may be missing.
  const locale = useRouteLoaderData<typeof loader>("root")?.locale ?? DEFAULT_LOCALE;
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <Theme accentColor="indigo" grayColor="slate" radius="medium" scaling="100%">
            {children}
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
