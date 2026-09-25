import { useEffect } from "react";
import { useI18n } from "~/i18n/context";
import { validityMessage } from "~/lib/validation";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const isField = (target: EventTarget | null): target is Field =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

/**
 * Replaces the browser's native validation texts (shown in the browser's own language) with
 * translated ones for every form field on the page.
 */
export function ValidationMessages() {
  const { t } = useI18n();

  useEffect(() => {
    const onInvalid = (event: Event) => {
      const field = event.target;
      if (!isField(field)) return;
      field.setCustomValidity("");
      const message = validityMessage(
        field.validity,
        {
          type: field.type,
          minLength: "minLength" in field ? field.minLength : -1,
          maxLength: "maxLength" in field ? field.maxLength : -1,
          min: "min" in field ? field.min : "",
          max: "max" in field ? field.max : "",
        },
        t,
      );
      if (message) field.setCustomValidity(message);
    };
    // A custom message makes the field invalid until cleared, so clear it as soon as the user edits.
    const onEdit = (event: Event) => {
      if (isField(event.target)) event.target.setCustomValidity("");
    };

    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
    };
  }, [t]);

  return null;
}
