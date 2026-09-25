import { describe, expect, it } from "vitest";
import { translate } from "~/i18n";
import { validityMessage, type FieldInfo, type ValidityFlags } from "~/lib/validation";

const t = (key: string, vars?: Record<string, string | number>) => translate("ru", key, vars);
const ok: ValidityFlags = {
  valueMissing: false,
  typeMismatch: false,
  tooShort: false,
  tooLong: false,
  rangeUnderflow: false,
  rangeOverflow: false,
  stepMismatch: false,
  patternMismatch: false,
  badInput: false,
  valid: true,
};
const field = (info: Partial<FieldInfo> = {}): FieldInfo => ({ type: "text", minLength: -1, maxLength: -1, min: "", max: "", ...info });

describe("validityMessage", () => {
  it("returns nothing for a valid field", () => {
    expect(validityMessage(ok, field(), t)).toBeNull();
  });

  it("asks to fill in required fields", () => {
    expect(validityMessage({ ...ok, valid: false, valueMissing: true }, field(), t)).toBe("Заполните это поле.");
  });

  it("asks for a valid email", () => {
    expect(validityMessage({ ...ok, valid: false, typeMismatch: true }, field({ type: "email" }), t)).toBe(
      "Введите корректный email.",
    );
  });

  it("names the minimum and maximum length", () => {
    expect(validityMessage({ ...ok, valid: false, tooShort: true }, field({ minLength: 10 }), t)).toBe(
      "Введите не меньше 10 символов.",
    );
    expect(validityMessage({ ...ok, valid: false, tooLong: true }, field({ maxLength: 5000 }), t)).toBe(
      "Введите не больше 5000 символов.",
    );
  });

  it("names the allowed number range", () => {
    expect(validityMessage({ ...ok, valid: false, rangeUnderflow: true }, field({ type: "number", min: "1" }), t)).toBe(
      "Значение должно быть не меньше 1.",
    );
    expect(validityMessage({ ...ok, valid: false, rangeOverflow: true }, field({ type: "number", max: "100" }), t)).toBe(
      "Значение должно быть не больше 100.",
    );
    expect(validityMessage({ ...ok, valid: false, stepMismatch: true }, field({ type: "number" }), t)).toBe(
      "Введите целое число.",
    );
  });

  it("falls back to a generic message", () => {
    expect(validityMessage({ ...ok, valid: false, patternMismatch: true }, field(), t)).toBe(
      "Проверьте значение этого поля.",
    );
  });
});
