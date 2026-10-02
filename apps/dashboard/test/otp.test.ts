import { describe, expect, it } from "vitest";
import { DIGIT_COUNT, backspace, inputDigit, initialState, isComplete, paste, type OtpState } from "~/lib/otp";

const typed = (...digits: string[]): OtpState => digits.reduce(inputDigit, initialState());

describe("inputDigit", () => {
  it("appends a digit and advances focus to the next box", () => {
    expect(inputDigit(initialState(), "4")).toEqual({ digits: "4", cursor: 1 });
    expect(typed("4", "2", "8")).toEqual({ digits: "428", cursor: 3 });
  });

  it("keeps focus on the last box after the sixth digit", () => {
    expect(typed("1", "2", "3", "4", "5", "6")).toEqual({ digits: "123456", cursor: DIGIT_COUNT - 1 });
  });

  it("rejects non-digit input (state unchanged)", () => {
    const state = typed("4", "2");
    expect(inputDigit(state, "a")).toEqual(state);
    expect(inputDigit(state, " ")).toEqual(state);
    // a keydown delivers exactly one character; multi-char strings are not digits
    expect(inputDigit(initialState(), "12")).toEqual(initialState());
  });

  it("rejects further digits once all boxes are filled", () => {
    const full = typed("1", "2", "3", "4", "5", "6");
    expect(inputDigit(full, "9")).toEqual(full);
  });
});

describe("backspace", () => {
  it("on an empty box clears the previous box and moves focus there", () => {
    const state = typed("4", "2", "8"); // focus sits on the empty fourth box
    expect(backspace(state)).toEqual({ digits: "42", cursor: 2 });
  });

  it("is a no-op at position 0", () => {
    const state: OtpState = { digits: "4", cursor: 0 };
    expect(backspace(state)).toEqual(state);
  });

  it("is a no-op when nothing has been typed", () => {
    expect(backspace(initialState())).toEqual(initialState());
  });
});

describe("paste", () => {
  it("fills all six boxes from a 6-digit string", () => {
    expect(paste(initialState(), "123456")).toEqual({ digits: "123456", cursor: DIGIT_COUNT - 1 });
  });

  it("fills from the start when fewer digits are pasted, leaving focus on the next box", () => {
    expect(paste(initialState(), "789")).toEqual({ digits: "789", cursor: 3 });
  });

  it("replaces partially typed digits, filling from the start", () => {
    expect(paste(typed("4", "2"), "99")).toEqual({ digits: "99", cursor: 2 });
  });

  it("keeps only the first six digits of a longer paste", () => {
    expect(paste(initialState(), "12345678").digits).toBe("123456");
  });

  it("rejects pastes containing non-digits (state unchanged)", () => {
    const state = typed("4");
    expect(paste(state, "12a456")).toEqual(state);
    expect(paste(initialState(), "")).toEqual(initialState());
  });
});

describe("isComplete", () => {
  it("flips true exactly when the sixth digit lands", () => {
    const five = typed("1", "2", "3", "4", "5");
    expect(isComplete(five)).toBe(false);
    expect(isComplete(inputDigit(five, "6"))).toBe(true);
  });

  it("is true when six digits arrive via paste and false otherwise", () => {
    expect(isComplete(paste(initialState(), "123456"))).toBe(true);
    expect(isComplete(paste(initialState(), "12345"))).toBe(false);
  });
});
