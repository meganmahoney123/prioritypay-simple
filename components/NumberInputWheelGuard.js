"use client";

import { useEffect } from "react";

// Chrome (and Safari) treat a focused <input type="number"> as a spinner:
// scrolling the page while the mouse/trackpad happens to be over one
// steps its value up or down, with no click, no keypress, and no visual
// cue that anything happened -- exactly how a $500 one-time-transfer
// amount silently became $497 (see app/(app)/transfers/page.js and the
// video that surfaced it). Hiding the spin-button arrows (app/globals.css)
// only removes the visual affordance; the scroll-to-step behavior fires
// whether or not the arrows are drawn, so the real fix has to intercept
// the wheel event itself.
//
// Mounted once in the root layout (app/layout.js) so it covers every
// number input in the product -- present ones and any added later --
// rather than requiring an onWheel handler to be wired into each field
// individually. `passive: true` because nothing here needs to block the
// page's own scrolling, only stop the input from reacting to it: as soon
// as a wheel event is seen while a number input has focus, that input is
// blurred, which both stops the browser from applying its own step-value
// behavior to this event and returns the page to normal scrolling
// immediately after.
export default function NumberInputWheelGuard() {
  useEffect(() => {
    const isFocusedNumberInput = () => {
      const el = document.activeElement;
      return el && el.tagName === "INPUT" && el.type === "number" ? el : null;
    };

    const handleWheel = () => {
      const el = isFocusedNumberInput();
      if (el) el.blur();
    };

    // Up/Down (and Page Up/Down) arrow keys step a number input's value
    // the same way the now-hidden spinner arrows did -- blocked here too
    // so typing is genuinely the only way to change one of these fields,
    // matching the fix's actual goal rather than just the scroll case
    // that originally surfaced it.
    const handleKeyDown = (e) => {
      if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(e.key)) return;
      if (isFocusedNumberInput()) e.preventDefault();
    };

    document.addEventListener("wheel", handleWheel, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
