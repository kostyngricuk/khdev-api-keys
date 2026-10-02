import { useEffect, useRef, useState } from "react";
import { DIGIT_COUNT, backspace, inputDigit, initialState, isComplete, paste, type OtpState } from "~/lib/otp";

type OtpInputProps = {
  /** Form field name — the hidden input carrying the digits uses it. */
  name: string;
  /** Accessible label for each box, in order. */
  ariaLabels: string[];
  /** Fired after the commit that completes the code — the auto-submit hook. */
  onComplete: (digits: string) => void;
};

// Astryx scale: element radius 8px; colors from the khdev theme tokens.
const BOX_STYLE: React.CSSProperties = {
  width: 40,
  height: 48,
  textAlign: "center",
  fontSize: 18,
  fontFamily: "inherit",
  border: "1px solid var(--color-border-emphasized)",
  borderRadius: 8,
  background: "var(--color-background-surface)",
  color: "var(--color-text-primary)",
};

/**
 * Six-box code entry driven by the pure state machine in ~/lib/otp.
 * Digits fill left-to-right with auto-advance; a hidden input carries them so a
 * native form submission reads the code, and onComplete fires (post-commit) when
 * the sixth digit lands. Focus follows the state's cursor box.
 */
export function OtpInput({ name, ariaLabels, onComplete }: OtpInputProps) {
  const [state, setState] = useState<OtpState>(initialState);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const submittedRef = useRef(false);

  // Focus follows the cursor — on mount (first box) and after every edit.
  useEffect(() => {
    boxes.current[state.cursor]?.focus();
  }, [state]);

  // Auto-submit exactly once, after the commit that completes the code, so the
  // hidden input already carries all six digits when the form is submitted.
  useEffect(() => {
    if (isComplete(state) && !submittedRef.current) {
      submittedRef.current = true;
      onComplete(state.digits);
    }
  }, [state, onComplete]);

  const apply = (next: OtpState) => {
    if (next !== state) setState(next);
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input type="hidden" name={name} value={state.digits} />
      {Array.from({ length: DIGIT_COUNT }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          className="code-box"
          value={state.digits[i] ?? ""}
          onChange={(e) => {
            // Digit entry lands here on desktop and mobile alike; anything else
            // snaps back to the state's digit (rejection).
            const ch = e.target.value.slice(-1);
            if (/^[0-9]$/.test(ch)) apply(inputDigit(state, ch));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              apply(backspace(state));
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            apply(paste(state, e.clipboardData.getData("text")));
          }}
          onFocus={() =>
            // Focus never lands past the first empty box: the code fills left-to-right.
            setState((s) => ({ ...s, cursor: Math.min(i, s.digits.length, DIGIT_COUNT - 1) }))
          }
          aria-label={ariaLabels[i]}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          style={BOX_STYLE}
        />
      ))}
    </div>
  );
}
