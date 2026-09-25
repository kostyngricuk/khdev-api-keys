import { ArrowLeftIcon, EnvelopeClosedIcon, ExclamationTriangleIcon, InfoCircledIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { Box, Button, Callout, Card, Flex, Heading, Link as ThemeLink, Text, TextField } from "@radix-ui/themes";
import type { AuthUser, VerifyCodeResponse } from "@khdev/contracts";
import { unstable_OneTimePasswordField as OneTimePasswordField } from "radix-ui";
import { useEffect, useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { api, ApiError } from "~/lib/api.server";
import { getUser, homePath } from "~/lib/auth.server";
import { errorMessage } from "~/lib/errors";
import { createUserSession } from "~/lib/session.server";
import type { Route } from "./+types/login";

const RESEND_SECONDS = 60;

type LoginState = {
  step: "email" | "code";
  email: string;
  error?: string;
  notice?: string;
  sentAt?: number;
};

export const meta: Route.MetaFunction = () => [{ title: "Sign in · KHDev Keys" }];

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  if (user) throw redirect(homePath(user));
  return { email: new URL(request.url).searchParams.get("email") ?? "" };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const email = String(form.get("email") ?? "").trim();

  if (intent === "request-code" || intent === "resend") {
    try {
      await api(request, "/auth/request-code", { json: { email }, token: null });
      return {
        step: "code",
        email,
        sentAt: Date.now(),
        notice: intent === "resend" ? "We sent you a new code." : undefined,
      } satisfies LoginState;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === "CODE_RESEND_TOO_SOON") {
        return {
          step: "code",
          email,
          notice: "A code was sent less than a minute ago. Check your inbox.",
          sentAt: Date.now(),
        } satisfies LoginState;
      }
      return data({ step: "email", email, error: errorMessage(error.code, error.message) } satisfies LoginState, {
        status: error.status,
      });
    }
  }

  if (intent === "verify-code") {
    const code = String(form.get("code") ?? "").trim();
    try {
      const result = await api<VerifyCodeResponse>(request, "/auth/verify-code", { json: { email, code }, token: null });
      throw redirect(homePath(result.user as AuthUser), {
        headers: { "Set-Cookie": await createUserSession(request, result.token) },
      });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      const step = error.code === "USER_BLOCKED" || error.code === "USER_NOT_FOUND" ? "email" : "code";
      return data({ step, email, error: errorMessage(error.code, error.message) } satisfies LoginState, {
        status: error.status,
      });
    }
  }

  return data({ step: "email", email, error: "Unknown action" } satisfies LoginState, { status: 400 });
}

function useCountdown(sentAt: number | undefined) {
  const [left, setLeft] = useState(RESEND_SECONDS);
  useEffect(() => {
    if (!sentAt) return;
    const tick = () => setLeft(Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - sentAt) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sentAt]);
  return left;
}

function Messages({ state }: { state: LoginState }) {
  return (
    <>
      {state.error && (
        <Callout.Root color="red" role="alert">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{state.error}</Callout.Text>
        </Callout.Root>
      )}
      {state.notice && !state.error && (
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{state.notice}</Callout.Text>
        </Callout.Root>
      )}
    </>
  );
}

function EmailStep({ state, busy }: { state: LoginState; busy: boolean }) {
  return (
    <Form method="post">
      <input type="hidden" name="intent" value="request-code" />
      <Flex direction="column" gap="4">
        <Messages state={state} />
        <label>
          <Text as="div" size="2" weight="medium" mb="1">
            Email
          </Text>
          <TextField.Root
            name="email"
            type="email"
            size="3"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@company.com"
            defaultValue={state.email}
          >
            <TextField.Slot>
              <EnvelopeClosedIcon />
            </TextField.Slot>
          </TextField.Root>
        </label>
        <Button size="3" type="submit" loading={busy}>
          Continue
        </Button>
        <Text size="1" color="gray" align="center">
          Access is by invitation only. Use the email address from your invitation letter.
        </Text>
      </Flex>
    </Form>
  );
}

function CodeStep({ state, busy }: { state: LoginState; busy: boolean }) {
  const resendIn = useCountdown(state.sentAt);
  return (
    <Flex direction="column" gap="4">
      <Messages state={state} />
      <Text size="2" color="gray">
        We sent a 6-digit code to <Text weight="medium">{state.email}</Text>. It expires in 10 minutes.
      </Text>
      <Form method="post">
        <input type="hidden" name="intent" value="verify-code" />
        <input type="hidden" name="email" value={state.email} />
        <Flex direction="column" gap="4">
          <label>
            <Text as="div" size="2" weight="medium" mb="2">
              Enter the 6-digit code
            </Text>
            <OneTimePasswordField.Root
              key={state.error ?? state.sentAt}
              name="code"
              className="otp-root"
              autoSubmit
              autoFocus
              validationType="numeric"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <OneTimePasswordField.Input key={i} className="otp-input" aria-label={`Digit ${i + 1}`} />
              ))}
              <OneTimePasswordField.HiddenInput />
            </OneTimePasswordField.Root>
          </label>
          <Button size="3" type="submit" loading={busy}>
            Sign in
          </Button>
        </Flex>
      </Form>
      <Flex justify="between" align="center">
        <ThemeLink asChild size="2">
          <Link to={`/login?email=${encodeURIComponent(state.email)}`}>
            <Flex align="center" gap="1">
              <ArrowLeftIcon /> Use another email
            </Flex>
          </Link>
        </ThemeLink>
        <Form method="post">
          <input type="hidden" name="intent" value="resend" />
          <input type="hidden" name="email" value={state.email} />
          <Button type="submit" variant="ghost" size="2" disabled={resendIn > 0 || busy}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </Button>
        </Form>
      </Flex>
    </Flex>
  );
}

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const state: LoginState = (actionData as LoginState | undefined) ?? { step: "email", email: loaderData.email };
  const busy = navigation.state !== "idle";

  return (
    <Flex align="center" justify="center" p="4" style={{ minHeight: "100vh" }}>
      <Box style={{ width: "100%", maxWidth: 420 }}>
        <Flex direction="column" align="center" gap="2" mb="5">
          <Flex
            align="center"
            justify="center"
            style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-9)", color: "white" }}
          >
            <LockClosedIcon width={20} height={20} />
          </Flex>
          <Heading size="6">Sign in to KHDev Keys</Heading>
        </Flex>
        <Card size="4">{state.step === "code" ? <CodeStep state={state} busy={busy} /> : <EmailStep state={state} busy={busy} />}</Card>
      </Box>
    </Flex>
  );
}
