import { MOBILE_LABELS } from "@/constants/mobile";

import { useAppStore } from "@/lib/store/use-app-store";

import { Section } from "@/components/shared";
import { RadioGroup } from "@/components/ui";

import type { RadioOption } from "@/components/ui";
import type { ThemePreference } from "@/lib/store/use-app-store";

const { account } = MOBILE_LABELS;

const THEME_OPTIONS: readonly RadioOption<ThemePreference>[] = [
  { value: "system", label: account.themeSystem },
  { value: "light", label: account.themeLight },
  { value: "dark", label: account.themeDark },
];

/** Light, dark or the system's. `ThemeProvider` applies the choice as soon as the store has it. */
export function AppearanceSection() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  return (
    <Section title={account.theme}>
      <RadioGroup
        options={THEME_OPTIONS}
        value={theme}
        onValueChange={setTheme}
        accessibilityLabel={account.theme}
      />
    </Section>
  );
}
