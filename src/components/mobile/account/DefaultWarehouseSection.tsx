import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useDefaultWarehouseId } from "@/hooks/use-default-warehouse-id";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { ApiError } from "@/lib/api/error";
import { classifyLoadError } from "@/lib/api/load-error";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useWarehouseOptions } from "@/lib/references/warehouse-options";
import { useAppStore } from "@/lib/store/use-app-store";

import { LoadErrorState, Section, SelectSheet } from "@/components/shared";
import { Skeleton, Text } from "@/components/ui";

import type { SelectSheetOption } from "@/components/shared";
import type { WarehouseOption } from "@/lib/references/warehouse-options";

const { account } = MOBILE_LABELS;

/** The "not set" choice. A real warehouse always has an id, so the empty string is free. */
const NOT_SET = "";
const ICON_SIZE = 16;

/** "CODE · Name"; the name alone for a warehouse without a code. */
function warehouseLabel({ code, name }: WarehouseOption): string {
  return code === "" ? name : account.warehouseOption(code, name);
}

/**
 * The warehouse the other screens pre-fill their warehouse filter with (N9), kept per signed-in user
 * (a shared phone hands the next worker none). It never reaches the API. Rendered only for a user who may read warehouses, so the list is not even requested
 * otherwise. The stored id is shown as "not set" when the active list no longer has it (the
 * warehouse was deactivated); nothing clears it behind the user's back.
 */
export function DefaultWarehouseSection() {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const userId = useAuthStore((state) => state.user?.userId ?? null);
  const defaultId = useDefaultWarehouseId();
  const setDefaultWarehouse = useAppStore((state) => state.setDefaultWarehouse);
  const { data, error, isError, refetch } = useWarehouseOptions();

  // Failed with nothing to show: say so and offer a retry. With a list already loaded, a failed
  // background reload changes nothing the user sees.
  if (data === undefined && isError) {
    return (
      <Section title={account.defaultWarehouse}>
        <LoadErrorState
          kind={classifyLoadError(error)}
          traceId={error instanceof ApiError ? error.traceId : undefined}
          onRetry={() => void refetch({ cancelRefetch: false })}
        />
      </Section>
    );
  }

  const chosen = data?.find((warehouse) => warehouse.warehouseId === defaultId);
  const valueText = chosen === undefined ? account.noWarehouse : warehouseLabel(chosen);
  const options: SelectSheetOption<string>[] = [
    { value: NOT_SET, label: account.noWarehouse },
    ...(data ?? []).map((warehouse) => ({
      value: warehouse.warehouseId,
      label: warehouseLabel(warehouse),
    })),
  ];
  const loading = data === undefined;

  return (
    <Section title={account.defaultWarehouse}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          loading ? account.defaultWarehouse : `${account.defaultWarehouse}: ${valueText}`
        }
        accessibilityState={{ disabled: loading, busy: loading }}
        disabled={loading}
        onPress={() => setOpen(true)}
        className="min-h-[44px] flex-row items-center justify-between gap-[12px] py-[8px] active:opacity-70"
      >
        {loading ? (
          <Skeleton className="h-[16px] w-1/2" />
        ) : (
          <Text weight="medium" numberOfLines={1} className="min-w-0 flex-1">
            {valueText}
          </Text>
        )}
        <ChevronRight size={ICON_SIZE} color={colors["ink-tertiary"]} />
      </Pressable>
      <Text variant="meta" tone="secondary">
        {account.defaultWarehouseHint}
      </Text>
      <SelectSheet
        open={open}
        onOpenChange={setOpen}
        title={account.defaultWarehouse}
        options={options}
        value={chosen?.warehouseId ?? NOT_SET}
        searchable
        onSelect={(next) => {
          if (typeof next === "string" && userId !== null) {
            setDefaultWarehouse(userId, next === NOT_SET ? null : next);
          }
        }}
      />
    </Section>
  );
}
