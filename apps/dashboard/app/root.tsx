import "@radix-ui/themes/styles.css";
import "./app.css";

import { Box, Button, Card, Code, Flex, Heading, Text, Theme } from "@radix-ui/themes";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";

export const meta: Route.MetaFunction = () => [{ title: "KHDev Keys" }];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Theme accentColor="indigo" grayColor="slate" radius="medium" scaling="100%">
          {children}
        </Theme>
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
  let title = "Something went wrong";
  let details = "An unexpected error occurred. Please try again.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    details = error.status === 404 ? "The page you are looking for does not exist." : error.statusText || details;
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
              <a href="/">Go to the dashboard</a>
            </Button>
          </Box>
        </Flex>
      </Card>
    </Flex>
  );
}
