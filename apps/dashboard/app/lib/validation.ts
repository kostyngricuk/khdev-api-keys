import type { Vars } from "~/i18n";

export type ValidityFlags = Pick<
  ValidityState,
  | "valueMissing"
  | "typeMismatch"
  | "tooShort"
  | "tooLong"
  | "rangeUnderflow"
  | "rangeOverflow"
  | "stepMismatch"
  | "patternMismatch"
  | "badInput"
  | "valid"
>;

export type FieldInfo = { type: string; minLength: number; maxLength: number; min: string; max: string };

/**
 * Text for a failed native constraint (required, type=email, minLength…). Browsers show these in the
 * language of their own UI, so the dashboard supplies its own translated messages.
 */
export function validityMessage(
  validity: ValidityFlags,
  field: FieldInfo,
  t: (key: string, vars?: Vars) => string,
): string | null {
  if (validity.valid) return null;
  if (validity.valueMissing) return t("validation.required");
  if (validity.typeMismatch && field.type === "email") return t("validation.email");
  if (validity.badInput) return t("validation.number");
  if (validity.tooShort) return t("validation.tooShort", { n: field.minLength });
  if (validity.tooLong) return t("validation.tooLong", { n: field.maxLength });
  if (validity.rangeUnderflow) return t("validation.min", { n: field.min });
  if (validity.rangeOverflow) return t("validation.max", { n: field.max });
  if (validity.stepMismatch) return t("validation.integer");
  return t("validation.generic");
}
