import { redirect } from "react-router";
import { env } from "./env.server";
import { destroyUserSession, getToken } from "./session.server";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  body?: FormData;
  /** Override the session token (e.g. `null` for public endpoints). */
  token?: string | null;
};

/**
 * Server-side call to the API. The dashboard is a BFF: the browser never talks to the API,
 * the session token stays in an httpOnly cookie and is forwarded as a Bearer token.
 */
export async function api<T>(request: Request, path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token !== undefined ? options.token : await getToken(request);
  const headers = new Headers({ accept: "application/json" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (options.json !== undefined) headers.set("content-type", "application/json");
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/api${path}`, {
      method: options.method ?? (options.json !== undefined || options.body ? "POST" : "GET"),
      headers,
      body: options.body ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
    });
  } catch {
    throw new ApiError(503, "API_UNAVAILABLE", "The API is unavailable");
  }

  if (response.status === 401 && token) {
    // The session expired or the user was blocked/removed: drop the cookie and go to login.
    throw redirect("/login", { headers: { "Set-Cookie": await destroyUserSession(request) } });
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(response.status, body?.error?.code ?? "UNKNOWN", body?.error?.message ?? response.statusText);
  }
  return (await response.json()) as T;
}
