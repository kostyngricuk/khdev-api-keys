import { Icon, useToast as astryxUseToast } from "@astryxdesign/core";
import { Check } from "lucide-react";
import { useEffect } from "react";
import type { ActionResult } from "~/lib/actions.server";

// Astryx toasts render into the LayerProvider viewport set up in root.tsx,
// so the wrapper only keeps the layout tree stable.
export function Toaster({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** Same call signature as the old Radix-based hook: (kind, text) => void. */
export const useToast = () => {
  const showToast = astryxUseToast();
  return (kind: "success" | "error", text: string) => {
    if (kind === "success") {
      // Astryx toasts only have info/error types; the green check keeps the old success look.
      showToast({
        body: text,
        type: "info",
        isAutoHide: true,
        autoHideDuration: 4000,
        endContent: <Icon icon={Check} size="sm" color="success" />,
      });
    } else {
      showToast({ body: text, type: "error", isAutoHide: true, autoHideDuration: 4000 });
    }
  };
};

/** Shows a toast whenever a fetcher finishes with an ActionResult. */
export function useActionToast(result: ActionResult | undefined, onSuccess?: () => void) {
  const notify = useToast();
  useEffect(() => {
    if (!result) return;
    if (result.ok) {
      notify("success", result.message);
      onSuccess?.();
    } else {
      notify("error", result.error);
    }
    // Only react to a new result object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
}
