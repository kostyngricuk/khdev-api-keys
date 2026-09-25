import { redirect } from "react-router";
import { homePath, requireUser } from "~/lib/auth.server";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  throw redirect(homePath(user));
}

export default function Home() {
  return null;
}
