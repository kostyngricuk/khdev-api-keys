import { data } from "react-router";
import type { Vars } from "~/i18n";
import { ApiError } from "./api.server";
import { serverI18n } from "./i18n.server";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

/** Runs an API mutation and returns a message in the visitor's language for the toast. */
export async function runAction(request: Request, fn: () => Promise<unknown>, successKey: string, vars?: Vars) {
  const { t, errorText } = serverI18n(request);
  try {
    await fn();
    return { ok: true, message: t(successKey, vars) } satisfies ActionResult;
  } catch (error) {
    if (error instanceof ApiError) {
      return data({ ok: false, error: errorText(error.code, error.message) } satisfies ActionResult, {
        status: error.status >= 500 ? 502 : error.status,
      });
    }
    throw error;
  }
}

export function failAction(request: Request, code: string, status: number, vars?: Vars) {
  const { t, errorText } = serverI18n(request);
  const error = vars ? t(`errors.${code}`, vars) : errorText(code);
  return data({ ok: false, error } satisfies ActionResult, { status });
}
