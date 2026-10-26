import { useEffect, useRef, useState } from "react";

import type { TextInputInstance } from "react-native";

export type UseScanInputOptions = {
  /** Hands a raw code on (trim, normalize, skip empty); `true` when it went out. */
  deliver: (raw: string) => boolean;
  disabled: boolean;
};

/**
 * The typed side of a scan field, as the web's `useScanInput`: Enter sends the code and empties
 * the field, ✕ empties it, and a field that comes back from disabled takes the focus again, so the
 * next code from a keyboard-wedge scanner lands in it instead of nowhere. While disabled, Enter
 * does nothing. (The web also focuses on mount; here that is the field's `autoFocus`, since a
 * keyboard popping up on every screen with a scan field would hide half the screen.)
 */
export function useScanInput({ deliver, disabled }: UseScanInputOptions) {
  const inputRef = useRef<TextInputInstance>(null);
  const [value, setValue] = useState("");
  const wasDisabled = useRef(disabled);

  useEffect(() => {
    if (wasDisabled.current && !disabled) inputRef.current?.focus();
    wasDisabled.current = disabled;
  }, [disabled]);

  return {
    inputRef,
    value,
    onChangeText: setValue,
    submit: () => {
      if (!disabled && deliver(value)) setValue("");
    },
    clear: () => {
      setValue("");
      inputRef.current?.focus();
    },
  };
}
