import { redirect } from "react-router";
import { api } from "~/lib/api.server";
import { destroyUserSession } from "~/lib/session.server";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  try {
    await api(request, "/auth/logout", { method: "POST" });
  } catch {
    // The cookie is dropped below even if the API session is already gone.
  }
  throw redirect("/login", { headers: { "Set-Cookie": await destroyUserSession(request) } });
}

export async function loader() {
  throw redirect("/");
}
