import { useScanCamera } from "./use-scan-camera";
import { useScanInput } from "./use-scan-input";

import type { ScanFeedback } from "./scan-bus";
import type { ScanMode } from "./use-scan-camera";

export type UseScanFieldOptions = {
  /** The field's label: the camera screen's title too. */
  label: string;
  onSubmit: (code: string) => void;
  normalize?: (code: string) => string;
  cameraMode: ScanMode;
  disabled: boolean;
  feedback: ScanFeedback | null;
};

/**
 * What a scan field does with codes, typed and read by the camera alike: trim, normalize, skip
 * empty, then `onSubmit`. A disabled field takes none, not even from a camera that is still open.
 * After "Nhập tay" on the camera screen the field takes the keyboard back.
 */
export function useScanField({
  label,
  onSubmit,
  normalize,
  cameraMode,
  disabled,
  feedback,
}: UseScanFieldOptions) {
  const deliver = (raw: string): boolean => {
    const code = normalize ? normalize(raw.trim()) : raw.trim();
    if (code !== "") onSubmit(code);
    return code !== "";
  };

  const { focus, ...input } = useScanInput({ deliver, disabled });
  const openCamera = useScanCamera({
    title: label,
    mode: cameraMode,
    feedback,
    onCode: (code) => {
      if (!disabled) deliver(code);
    },
    onTypeInstead: focus,
  });

  return { ...input, openCamera };
}
