import { useState } from "react";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useScanFeedback } from "@/hooks/use-scan-feedback";

import { Text } from "@/components/ui";

import { ScanField } from "../scan/ScanField";

import { AccountCard } from "./AccountCard";

const { scan } = MOBILE_LABELS;

/**
 * "Kiểm tra quét mã": a worker checks the phone before a shift. One code, typed or read by the
 * camera, gets the feedback of a station (tone, vibration, announcement, banner), and the code read
 * stays on screen to compare with the label.
 */
export function ScanCheckSection() {
  const { feedback, show } = useScanFeedback();
  const [lastCode, setLastCode] = useState<string | null>(null);

  const onScan = (code: string) => {
    setLastCode(code);
    show({ tone: "positive", message: code });
  };

  return (
    <AccountCard>
      <View className="gap-[8px] py-[12px]">
        <ScanField
          label={scan.testTitle}
          placeholder={scan.placeholder}
          cameraMode="single"
          feedback={feedback}
          onSubmit={onScan}
        />
        <Text variant="meta" tone="secondary">
          {scan.testHint}
        </Text>
        {lastCode === null ? null : <Text mono selectable>{`${scan.lastCode}: ${lastCode}`}</Text>}
      </View>
    </AccountCard>
  );
}
