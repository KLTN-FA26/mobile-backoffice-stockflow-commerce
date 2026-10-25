import { useMemo, useState } from "react";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { normalizeSearchText } from "@/lib/search";

import { Button, Sheet, Text } from "@/components/ui";

import { SearchField } from "./SearchField";
import { SelectOptionRow } from "./SelectOptionRow";

export type SelectSheetOption<T> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type SelectSheetProps<T extends string | number> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: SelectSheetOption<T>[];
  /** The chosen value; with `multiple`, the chosen values. `null` when nothing is chosen. */
  value: T | T[] | null;
  /** Pick several: each tap reports the new list and the sheet stays open until "Xong". */
  multiple?: boolean;
  /** A search box over `label` and `description`, blind to case and Vietnamese marks. */
  searchable?: boolean;
  /** Picking one value (not `multiple`) also closes the sheet. */
  onSelect: (value: T | T[]) => void;
  /** Shown when there is nothing to list, or the search finds nothing. */
  emptyText?: string;
};

function toList<T>(value: T | T[] | null): T[] {
  if (value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** A bottom sheet in place of a select: pick one option, or several. For lists a phone can scroll in one go. */
export function SelectSheet<T extends string | number>({
  open,
  onOpenChange,
  title,
  options,
  value,
  multiple = false,
  searchable = false,
  onSelect,
  emptyText = MOBILE_LABELS.noResultsTitle,
}: SelectSheetProps<T>) {
  const [query, setQuery] = useState("");
  // Every opening starts from the full list. Adjusted while rendering, as React advises for state
  // that follows a prop, because the caller closes the sheet through `open`.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setQuery("");
  }

  const chosen = toList(value);
  const needle = normalizeSearchText(query);
  const visible = useMemo(() => {
    if (needle === "") return options;
    const matches = (text: string | undefined) =>
      text !== undefined && normalizeSearchText(text).includes(needle);
    return options.filter((option) => matches(option.label) || matches(option.description));
  }, [options, needle]);

  const choose = (option: SelectSheetOption<T>) => {
    if (!multiple) {
      onSelect(option.value);
      onOpenChange(false);
      return;
    }
    onSelect(
      chosen.includes(option.value)
        ? chosen.filter((item) => item !== option.value)
        : [...chosen, option.value],
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} scrollable>
      {searchable ? (
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={MOBILE_LABELS.searchPlaceholder}
          accessibilityLabel={MOBILE_LABELS.search}
        />
      ) : null}
      <View>
        {visible.length === 0 ? (
          <Text tone="secondary" className="py-[16px] text-center">
            {emptyText}
          </Text>
        ) : (
          visible.map((option) => (
            <SelectOptionRow
              key={option.value}
              label={option.label}
              description={option.description}
              selected={chosen.includes(option.value)}
              disabled={option.disabled}
              multiple={multiple}
              onPress={() => choose(option)}
            />
          ))
        )}
      </View>
      {multiple ? <Button label={MOBILE_LABELS.done} onPress={() => onOpenChange(false)} /> : null}
    </Sheet>
  );
}
