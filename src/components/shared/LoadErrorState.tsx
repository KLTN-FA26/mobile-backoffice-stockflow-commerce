import { FileSearch, Lock, TriangleAlert, WifiOff } from "lucide-react-native";

import { UI_LABELS } from "@/constants";
import { MOBILE_LABELS } from "@/constants/mobile";

import { Button, Text } from "@/components/ui";

import { StateLayout } from "./StateLayout";

import type { LoadErrorKind } from "@/lib/api/load-error";
import type { LucideIcon } from "lucide-react-native";

export type LoadErrorStateProps = {
  kind: LoadErrorKind;
  /** Overrides the default title, e.g. "Không tìm thấy đơn hàng" for a `not-found`. */
  title?: string;
  description?: string;
  /** `ApiError.traceId`, shown so support can find the request. */
  traceId?: string;
  onRetry?: () => void;
  /** The retry is running: the button spins and takes no second press. */
  retrying?: boolean;
};

type Copy = { title: string; description?: string };

const { loadError } = UI_LABELS;

const DEFAULT_COPY: Record<LoadErrorKind, Copy> = {
  network: { title: loadError.networkTitle, description: loadError.networkDescription },
  "invalid-data": {
    title: loadError.invalidDataTitle,
    description: loadError.invalidDataDescription,
  },
  server: { title: loadError.serverTitle, description: loadError.serverDescription },
  forbidden: { title: loadError.forbiddenTitle },
  "no-read": { title: loadError.noReadTitle },
  permissions: { title: loadError.permissionsTitle, description: loadError.permissionsDescription },
  "not-found": { title: MOBILE_LABELS.notFoundTitle },
};

const ICON: Record<LoadErrorKind, LucideIcon> = {
  network: WifiOff,
  "invalid-data": TriangleAlert,
  server: TriangleAlert,
  permissions: TriangleAlert,
  forbidden: Lock,
  "no-read": Lock,
  "not-found": FileSearch,
};

// Asking again can help for these; a missing permission or record stays missing.
const RETRYABLE: ReadonlySet<LoadErrorKind> = new Set<LoadErrorKind>([
  "network",
  "server",
  "invalid-data",
  "permissions",
]);

/** What a screen shows when its data could not be loaded; pick `kind` with `classifyLoadError`. */
export function LoadErrorState({
  kind,
  title,
  description,
  traceId,
  onRetry,
  retrying = false,
}: LoadErrorStateProps) {
  const copy = DEFAULT_COPY[kind];

  return (
    <StateLayout
      icon={ICON[kind]}
      title={title ?? copy.title}
      description={description ?? copy.description}
    >
      {onRetry !== undefined && RETRYABLE.has(kind) ? (
        <Button
          variant="secondary"
          label={MOBILE_LABELS.retry}
          loading={retrying}
          onPress={onRetry}
        />
      ) : null}
      {traceId === undefined || traceId === "" ? null : (
        <Text variant="small" tone="tertiary" mono selectable className="text-center">
          {`${MOBILE_LABELS.traceId}: ${traceId}`}
        </Text>
      )}
    </StateLayout>
  );
}
