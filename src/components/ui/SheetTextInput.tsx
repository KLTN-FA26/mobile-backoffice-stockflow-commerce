import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { cssInterop } from "nativewind";
import { TextInput } from "react-native";

import { UI_LIMITS } from "@/constants/mobile";

import { useInSheet } from "./sheet-context";

import type { ComponentProps, Ref } from "react";
import type { TextInputInstance, TextInputProps } from "react-native";

type TextFieldProps = TextInputProps & { className?: string; ref?: Ref<TextInputInstance> };
type LibraryRef = ComponentProps<typeof BottomSheetTextInput>["ref"];

/**
 * The library's text input, which tells the sheet which field has the keyboard so the sheet rises
 * above it (R23). A plain `TextInput` in a sheet stays hidden behind the keyboard.
 */
function SheetField({ ref, ...props }: TextFieldProps) {
  // The library types its ref as gesture-handler's `TextInput | undefined`; what it hands back is
  // the same native input `Input` and the others expect, so the ref is passed through as it is.
  return <BottomSheetTextInput ref={ref as LibraryRef} {...props} />;
}

// NativeWind only turns `className` into style on components it knows; this one is not among them
// until it is registered here.
const SheetTextInput = cssInterop(SheetField, { className: "style" });

/**
 * The text field to use anywhere a form control takes typed text: the sheet-aware input inside a
 * `Sheet`, a plain `TextInput` elsewhere (R30). `Input`, `SearchField` and `QuantityStepper` render it.
 * Font scaling stops at the UI limit, as for `Text`, unless the caller says otherwise.
 */
export function TextField({
  maxFontSizeMultiplier = UI_LIMITS.maxFontSizeMultiplier,
  ...rest
}: TextFieldProps) {
  const props = { ...rest, maxFontSizeMultiplier };
  return useInSheet() ? <SheetTextInput {...props} /> : <TextInput {...props} />;
}
