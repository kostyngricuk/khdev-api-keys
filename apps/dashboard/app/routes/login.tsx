import { Mail } from "lucide-react";
import { Banner, Button, Card, Center, Heading, Icon, Link, Text, TextInput } from "@astryxdesign/core";
import type { AuthUser, VerifyCodeResponse } from "@khdev/contracts";
import { useEffect, useRef, useState } from "react";
import { data, Form, redirect, useNavigation } from "react-router";
import { OtpInput } from "~/components/OtpInput";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { Wordmark } from "~/components/Wordmark";
import { ENABLED_LOCALES } from "~/i18n";
import { useI18n } from "~/i18n/context";
import { api, ApiError } from "~/lib/api.server";
import { getUser, homePath } from "~/lib/auth.server";
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
      const message = error.code === "VALIDATION_ERROR" ? t("validation.email") : errorText(error.code, error.message);
      return data({ step: "email", email, error: message } satisfies LoginState, {
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
      {state.error && <Banner status="error" title={state.error} />}
      {state.notice && !state.error && <Banner status="info" title={state.notice} />}
    </>
  );
}

function EmailStep({ state, busy }: { state: LoginState; busy: boolean }) {
  const { t } = useI18n();
  const [email, setEmail] = useState(state.email);
  return (
    <Form method="post">
      <input type="hidden" name="intent" value="request-code" />
      <div style={{ display: "grid", gap: 16 }}>
        <Messages state={state} />
        <TextInput
          label={t("login.email")}
          type="email"
          size="lg"
          htmlName="email"
          isRequired
          hasAutoFocus
          autoComplete="email"
          placeholder={t("login.emailPlaceholder")}
          value={email}
          onChange={(value) => setEmail(value)}
          startIcon={<Icon icon={Mail} />}
        />
        <Button type="submit" variant="primary" size="lg" width="100%" label={t("login.continue")} isLoading={busy} />
        <Text size="sm" color="secondary" justify="center">
          {t("login.inviteOnly")}
        </Text>
      </div>
    </Form>
  );
}

function CodeStep({ state, busy }: { state: LoginState; busy: boolean }) {
  const { t } = useI18n();
  const resendIn = useCountdown(state.sentAt);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Messages state={state} />
      <Text color="secondary">
        {t("login.codeSentBefore")} <Text weight="medium">{state.email}</Text>. {t("login.codeSentAfter")}
      </Text>
      <Form ref={formRef} method="post">
        <input type="hidden" name="intent" value="verify-code" />
        <input type="hidden" name="email" value={state.email} />
        <div style={{ display: "grid", gap: 16 }}>
          {/* Remounts per attempt so a failed code starts from empty boxes. */}
          <OtpInput
            key={state.error ?? state.sentAt}
            name="code"
            ariaLabels={[1, 2, 3, 4, 5, 6].map((n) => t("login.digit", { n }))}
            onComplete={() => formRef.current?.requestSubmit()}
          />
          <Button type="submit" variant="primary" size="lg" width="100%" label={t("login.signIn")} isLoading={busy} />
        </div>
      </Form>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={`/login?email=${encodeURIComponent(state.email)}`} hasUnderline>
          {t("login.useAnotherEmail")}
        </Link>
        <Form method="post">
          <input type="hidden" name="intent" value="resend" />
          <input type="hidden" name="email" value={state.email} />
          <Button
            type="submit"
            variant="ghost"
            label={resendIn > 0 ? t("login.resendIn", { seconds: resendIn }) : t("login.resend")}
            isDisabled={resendIn > 0 || busy}
          />
        </Form>
      </div>
    </div>
  );
}

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const { t } = useI18n();
  const navigation = useNavigation();
  const state: LoginState = (actionData as LoginState | undefined) ?? { step: "email", email: loaderData.email };
  const busy = navigation.state !== "idle";

  return (
    <Center axis="both" style={{ minHeight: "100vh", position: "relative" }}>
      {ENABLED_LOCALES.length > 1 && (
        <div style={{ position: "absolute", top: 16, left: 16 }}>
          <LanguageSwitcher />
        </div>
      )}
      <div style={{ width: "100%", maxWidth: 420, padding: 16, display: "grid", gap: 24, justifyItems: "center" }}>
        <Heading level={1} justify="center" aria-label={`${t("login.titlePrefix")} ${t("common.appName")}`}>
          {t("login.titlePrefix")} <Wordmark size="lg" />
        </Heading>
        <Card padding={6} width="100%">
          {state.step === "code" ? <CodeStep state={state} busy={busy} /> : <EmailStep state={state} busy={busy} />}
        </Card>
      </div>
    </Center>
  );
}
