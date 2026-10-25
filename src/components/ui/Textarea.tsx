import { Input } from "./Input";

import type { InputProps } from "./Input";

export type TextareaProps = Omit<InputProps, "multiline">;

/** `Input` in multiline mode: it grows from 96px and starts typing at the top. */
export function Textarea(props: TextareaProps) {
  return <Input {...props} multiline />;
}
