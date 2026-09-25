import { data } from "react-router";
import { ApiError } from "./api.server";
import { errorMessage } from "./errors";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

/** Runs an API mutation and turns API errors into a message the page can show. */
export async function runAction(fn: () => Promise<unknown>, successMessage: string) {
  try {
    await fn();
    return { ok: true, message: successMessage } satisfies ActionResult;
  } catch (error) {
    if (error instanceof ApiError) {
      return data({ ok: false, error: errorMessage(error.code, error.message) } satisfies ActionResult, {
        status: error.status >= 500 ? 502 : error.status,
      });
    }
    throw error;
  }
}
