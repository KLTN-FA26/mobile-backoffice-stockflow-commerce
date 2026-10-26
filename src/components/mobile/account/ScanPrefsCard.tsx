import { MOBILE_LABELS } from "@/constants/mobile";

import { useAppStore } from "@/lib/store/use-app-store";

import { Separator, Switch } from "@/components/ui";

import { AccountCard } from "./AccountCard";

const { account } = MOBILE_LABELS;

/** Scan feedback: the sound and the vibration after each scan. */
export function ScanPrefsCard() {
  const muted = useAppStore((state) => state.muted);
  const setMuted = useAppStore((state) => state.setMuted);
  const hapticsEnabled = useAppStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useAppStore((state) => state.setHapticsEnabled);

  return (
    <AccountCard>
      {/* The store keeps "muted"; the switch reads "sound on": the opposite of each other. */}
      <Switch label={account.sound} value={!muted} onValueChange={(on) => setMuted(!on)} />
      <Separator />
      <Switch label={account.haptics} value={hapticsEnabled} onValueChange={setHapticsEnabled} />
    </AccountCard>
  );
}
