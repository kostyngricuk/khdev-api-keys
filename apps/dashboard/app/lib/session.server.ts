import { createCookieSessionStorage } from "react-router";
import { env } from "./env.server";

type SessionData = { token: string };

const storage = createCookieSessionStorage<SessionData>({
  cookie: {
    name: "__khdev",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: env.isProduction,
    secrets: [env.sessionSecret],
    maxAge: 60 * 60 * 24 * 30,
  },
});

export const getSession = (request: Request) => storage.getSession(request.headers.get("Cookie"));

export async function getToken(request: Request): Promise<string | null> {
  return (await getSession(request)).get("token") ?? null;
}

export async function createUserSession(request: Request, token: string): Promise<string> {
  const session = await getSession(request);
  session.set("token", token);
  return storage.commitSession(session);
}

export async function destroyUserSession(request: Request): Promise<string> {
  return storage.destroySession(await getSession(request));
}
