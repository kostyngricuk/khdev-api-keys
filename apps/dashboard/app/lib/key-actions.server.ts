import { data } from "react-router";
import { api } from "./api.server";
import { runAction } from "./actions.server";

/** Handles the KeyActions intents for both key tables. */
export async function handleKeyAction(request: Request, options: { allowLimit: boolean }) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = encodeURIComponent(String(form.get("id") ?? ""));

  switch (intent) {
    case "regenerate":
      return runAction(() => api(request, `/keys/${id}/regenerate`, { method: "POST" }), "The key was regenerated");
    case "extend":
      return runAction(() => api(request, `/keys/${id}/extend`, { method: "POST" }), "The key was extended");
    case "status": {
      const status = String(form.get("status"));
      return runAction(
        () => api(request, `/keys/${id}/status`, { method: "PATCH", json: { status } }),
        status === "active" ? "The key was activated" : "The key was deactivated",
      );
    }
    case "limit":
      if (options.allowLimit) {
        const limit = Number(form.get("limit"));
        return runAction(
          () => api(request, `/admin/keys/${id}/activation-limit`, { method: "PATCH", json: { limit } }),
          "The activation limit was updated",
        );
      }
      break;
  }
  return data({ ok: false as const, error: "Unknown action" }, { status: 400 });
}
