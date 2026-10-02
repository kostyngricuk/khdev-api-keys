/**
 * Pure state machine for the six-digit OTP input on the login page.
 * OtpInput renders this state and feeds it user events; keeping the logic here
 * means it is testable without a DOM.
 */

export const DIGIT_COUNT = 6;

export type OtpState = {
  /** Digits entered so far, in order (at most DIGIT_COUNT). */
  digits: string;
  /** Index of the focused box (0-based). */
  cursor: number;
};

export function initialState(): OtpState {
  return { digits: "", cursor: 0 };
}

function isDigit(ch: string): boolean {
  return ch.length === 1 && ch >= "0" && ch <= "9";
}

/** Type one digit: append it and advance focus to the next box. Non-digits are rejected. */
export function inputDigit(state: OtpState, ch: string): OtpState {
  if (!isDigit(ch) || state.digits.length >= DIGIT_COUNT) return state;
  const digits = state.digits + ch;
  return { digits, cursor: Math.min(digits.length, DIGIT_COUNT - 1) };
}

/**
 * Backspace: on an empty box clears the previous box and moves focus there;
 * on a filled box (beyond the first) truncates the code up to that box.
 * At position 0 it is a no-op.
 */
export function backspace(state: OtpState): OtpState {
  const { digits, cursor } = state;
  if (cursor === 0 || digits.length === 0) return state;
  if (cursor >= digits.length) {
    return { digits: digits.slice(0, -1), cursor: cursor - 1 };
  }
  return { digits: digits.slice(0, cursor), cursor };
}

/** Paste: an all-digit string fills the boxes from the start; anything else is rejected. */
export function paste(state: OtpState, text: string): OtpState {
  if (text.length === 0 || !/^\d+$/.test(text)) return state;
  const digits = text.slice(0, DIGIT_COUNT);
  return { digits, cursor: Math.min(digits.length, DIGIT_COUNT - 1) };
}

/** True exactly when the sixth digit has landed — the auto-submit trigger. */
export function isComplete(state: OtpState): boolean {
  return state.digits.length === DIGIT_COUNT;
}
