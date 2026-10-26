import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";

import { MOBILE_LABELS } from "@/constants/mobile";

import { IconButton, INPUT_HEIGHT, Input } from "@/components/ui";

import type { InputProps } from "@/components/ui";

const ICON_SIZE = 18;

export type PasswordFieldProps = Omit<
  InputProps,
  "label" | "secureTextEntry" | "className" | "trailing"
>;

/** The password input, with a button beside it that shows what was typed (as on the web login). */
export function PasswordField(props: PasswordFieldProps) {
  const [shown, setShown] = useState(false);

  return (
    <Input
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="current-password"
      textContentType="password"
      {...props}
      label={MOBILE_LABELS.login.password}
      secureTextEntry={!shown}
      // On the field's row, so it stays level with the field when an error shows under it.
      trailing={
        <IconButton
          variant="outline"
          icon={shown ? EyeOff : Eye}
          iconSize={ICON_SIZE}
          iconColor="ink-secondary"
          size={INPUT_HEIGHT}
          accessibilityLabel={MOBILE_LABELS.login.showPassword}
          checked={shown}
          onPress={() => setShown((value) => !value)}
        />
      }
    />
  );
}
