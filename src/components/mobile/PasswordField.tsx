import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";

import { INPUT_HEIGHT, Input } from "@/components/ui";

import type { InputProps } from "@/components/ui";

const ICON_SIZE = 18;

export type PasswordFieldProps = Omit<InputProps, "label" | "secureTextEntry" | "className">;

/** The password input, with a button beside it that shows what was typed (as on the web login). */
export function PasswordField(props: PasswordFieldProps) {
  const colors = useThemeColors();
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;

  return (
    <View className="flex-row items-end gap-[8px]">
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        {...props}
        className="flex-1"
        label={MOBILE_LABELS.login.password}
        secureTextEntry={!shown}
      />
      <Pressable
        accessibilityRole="togglebutton"
        accessibilityLabel={MOBILE_LABELS.login.showPassword}
        accessibilityState={{ checked: shown }}
        onPress={() => setShown((value) => !value)}
        style={{ width: INPUT_HEIGHT, height: INPUT_HEIGHT }}
        className="items-center justify-center rounded-md border border-border-default bg-bg-surface active:bg-bg-subtle"
      >
        <Icon size={ICON_SIZE} color={colors["ink-secondary"]} />
      </Pressable>
    </View>
  );
}
