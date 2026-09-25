import { ArrowLeftIcon, EnvelopeClosedIcon, ExclamationTriangleIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Box, Button, Callout, Card, Flex, Heading, Link as ThemeLink, Text, TextField } from "@radix-ui/themes";
import type { AuthUser, VerifyCodeResponse } from "@khdev/contracts";
import { unstable_OneTimePasswordField as OneTimePasswordField } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { api, ApiError } from "~/lib/api.server";
import { getUser, homePath } from "~/lib/auth.server";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { Wordmark } from "~/components/Wordmark";
import { ENABLED_LOCALES } from "~/i18n";
import { useI18n } from "~/i18n/context";
import { serverI18n } from "~/lib/i18n.server";
import { pageTitle } from "~/lib/meta";
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

export const meta: Route.MetaFunction = ({ matches }) => pageTitle(matches, "login.metaTitle");

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  if (user) throw redirect(homePath(user));
  return { email: new URL(request.url).searchParams.get("email") ?? "" };
}

export async function action({ request }: Route.ActionArgs) {
  const { t, errorText } = serverI18n(request);
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
        notice: intent === "resend" ? t("login.newCodeSent") : undefined,
      } satisfies LoginState;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === "CODE_RESEND_TOO_SOON") {
        return {
          step: "code",
          email,
          notice: t("login.codeAlreadySent"),
          sentAt: Date.now(),
        } satisfies LoginState;
      }
      return data({ step: "email", email, error: errorText(error.code, error.message) } satisfies LoginState, {
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
      return data({ step, email, error: errorText(error.code, error.message) } satisfies LoginState, {
        status: error.status,
      });
    }
  }

  return data({ step: "email", email, error: errorText("UNKNOWN_ACTION") } satisfies LoginState, { status: 400 });
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
  const { t } = useI18n();
  return (
    <Form method="post">
      <input type="hidden" name="intent" value="request-code" />
      <Flex direction="column" gap="4">
        <Messages state={state} />
        <label>
          <Text as="div" size="2" weight="medium" mb="1">
            {t("login.email")}
          </Text>
          <TextField.Root
            name="email"
            type="email"
            size="3"
            required
            autoFocus
            autoComplete="email"
            placeholder={t("login.emailPlaceholder")}
            defaultValue={state.email}
          >
            <TextField.Slot>
              <EnvelopeClosedIcon />
            </TextField.Slot>
          </TextField.Root>
        </label>
        <Button size="3" type="submit" loading={busy}>
          {t("login.continue")}
        </Button>
        <Text size="1" color="gray" align="center">
          {t("login.inviteOnly")}
        </Text>
      </Flex>
    </Form>
  );
}

function CodeStep({ state, busy }: { state: LoginState; busy: boolean }) {
  const { t } = useI18n();
  const resendIn = useCountdown(state.sentAt);
  const firstDigit = useRef<HTMLInputElement>(null);
  // `autoFocus` only works on page load; the code step appears after a client-side submit.
  useEffect(() => {
    firstDigit.current?.focus();
  }, [state.sentAt, state.error]);
  return (
    <Flex direction="column" gap="4">
      <Messages state={state} />
      <Text size="2" color="gray">
        {t("login.codeSentBefore")} <Text weight="medium">{state.email}</Text>. {t("login.codeSentAfter")}
      </Text>
      <Form method="post">
        <input type="hidden" name="intent" value="verify-code" />
        <input type="hidden" name="email" value={state.email} />
        <Flex direction="column" gap="4">
          <label>
            <Text as="div" size="2" weight="medium" mb="2">
              {t("login.enterCode")}
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
                <OneTimePasswordField.Input
                  key={i}
                  ref={i === 0 ? firstDigit : undefined}
                  className="otp-input"
                  aria-label={t("login.digit", { n: i + 1 })}
                />
              ))}
              <OneTimePasswordField.HiddenInput />
            </OneTimePasswordField.Root>
          </label>
          <Button size="3" type="submit" loading={busy}>
            {t("login.signIn")}
          </Button>
        </Flex>
      </Form>
      <Flex justify="between" align="center">
        <ThemeLink asChild size="2">
          <Link to={`/login?email=${encodeURIComponent(state.email)}`}>
            <Flex align="center" gap="1">
              <ArrowLeftIcon /> {t("login.useAnotherEmail")}
            </Flex>
          </Link>
        </ThemeLink>
        <Form method="post">
          <input type="hidden" name="intent" value="resend" />
          <input type="hidden" name="email" value={state.email} />
          <Button type="submit" variant="ghost" size="2" disabled={resendIn > 0 || busy}>
            {resendIn > 0 ? t("login.resendIn", { seconds: resendIn }) : t("login.resend")}
          </Button>
        </Form>
      </Flex>
    </Flex>
  );
}

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const { t } = useI18n();
  const navigation = useNavigation();
  const state: LoginState = (actionData as LoginState | undefined) ?? { step: "email", email: loaderData.email };
  const busy = navigation.state !== "idle";

  return (
    <Flex align="center" justify="center" p="4" style={{ minHeight: "100vh", position: "relative" }}>
      {ENABLED_LOCALES.length > 1 && (
        <Box style={{ position: "absolute", top: 16, left: 16 }}>
          <LanguageSwitcher />
        </Box>
      )}
      <Box style={{ width: "100%", maxWidth: 420 }}>
        <Heading size="6" align="center" mb="5" aria-label={`${t("login.titlePrefix")} ${t("common.appName")}`}>
          {t("login.titlePrefix")}
          <Wordmark size="lg" style={{ marginLeft: "0.2em" }} />
        </Heading>
        <Card size="4">{state.step === "code" ? <CodeStep state={state} busy={busy} /> : <EmailStep state={state} busy={busy} />}</Card>
      </Box>
    </Flex>
  );
}
