import { redirect } from "react-router";
import { ENABLED_LOCALES, isLocale, LOCALE_COOKIE } from "~/i18n";
import type { Route } from "./+types/locale";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Only same-site paths are allowed as the return target. */
const safeReturnPath = (value: unknown) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const locale = form.get("locale");
  const back = safeReturnPath(form.get("redirectTo"));
  if (!isLocale(locale) || !ENABLED_LOCALES.includes(locale)) throw redirect(back);
  throw redirect(back, {
    headers: { "Set-Cookie": `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax` },
  });
}

export async function loader() {
  throw redirect("/");
}
