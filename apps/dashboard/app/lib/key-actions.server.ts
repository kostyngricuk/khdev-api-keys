import { api } from "./api.server";
import { failAction, runAction } from "./actions.server";

/** Handles the KeyActions intents for both key tables. */
export async function handleKeyAction(request: Request, options: { allowLimit: boolean }) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = encodeURIComponent(String(form.get("id") ?? ""));

  switch (intent) {
    case "regenerate":
      return runAction(request, () => api(request, `/keys/${id}/regenerate`, { method: "POST" }), "toast.keyRegenerated");
    case "extend":
      return runAction(request, () => api(request, `/keys/${id}/extend`, { method: "POST" }), "toast.keyExtended");
    case "status": {
      const status = String(form.get("status"));
      return runAction(
        request,
        () => api(request, `/keys/${id}/status`, { method: "PATCH", json: { status } }),
        status === "active" ? "toast.keyActivated" : "toast.keyDeactivated",
      );
    }
    case "limit":
      if (options.allowLimit) {
        const limit = Number(form.get("limit"));
        return runAction(
          request,
          () => api(request, `/admin/keys/${id}/activation-limit`, { method: "PATCH", json: { limit } }),
          "toast.limitUpdated",
        );
      }
      break;
  }
  return failAction(request, "UNKNOWN_ACTION", 400);
}
