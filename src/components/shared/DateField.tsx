import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Calendar, X } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { MOBILE_LABELS, PICKER_LOCALE } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatDate } from "@/lib/format";
import { clampDate, isoToLocalDate, localDateToIso } from "@/lib/iso-date";
import { cn } from "@/lib/utils";

import { FieldFrame, IconButton, INPUT_HEIGHT, Text } from "@/components/ui";

export type DateFieldProps = {
  label: string;
  /** `YYYY-MM-DD`, or `null` for no date. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** `YYYY-MM-DD`. */
  minimumDate?: string;
  /** `YYYY-MM-DD`. */
  maximumDate?: string;
  /** Adds a button that clears the date back to `null`. */
  clearable?: boolean;
  error?: string;
};

/**
 * A date as a 48px field that opens the system picker: a dialog on Android, an inline calendar
 * under the field on iOS. Dates go in and out as `YYYY-MM-DD`, shown the way `formatDate` shows them.
 */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  clearable = false,
  error,
}: DateFieldProps) {
  const colors = useThemeColors();
  // iOS only: Android's dialog is opened imperatively and closes itself.
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Anything that is not a real YYYY-MM-DD counts as no date: the picker is never handed an
  // Invalid Date.
  const date = value === null ? null : isoToLocalDate(value);
  const min = (minimumDate !== undefined && isoToLocalDate(minimumDate)) || undefined;
  const max = (maximumDate !== undefined && isoToLocalDate(maximumDate)) || undefined;
  const shown = date ?? clampDate(new Date(), min, max);

  const pick = (picked: Date) => onChange(localDateToIso(picked));
  const openPicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: shown,
        mode: "date",
        minimumDate: min,
        maximumDate: max,
        onValueChange: (_event, picked) => pick(picked),
      });
    } else {
      setCalendarOpen((open) => !open);
    }
  };

  const text = value !== null && date !== null ? formatDate(value) : MOBILE_LABELS.chooseDate;

  return (
    <FieldFrame label={label} error={error}>
      <View
        style={{ minHeight: INPUT_HEIGHT }}
        className={cn(
          "flex-row items-center rounded-md border bg-bg-surface",
          error ? "border-danger" : "border-border-default",
        )}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text }}
          // The alert under the field is a separate element: say the error with the field too.
          accessibilityHint={error}
          accessibilityState={{ expanded: calendarOpen }}
          onPress={openPicker}
          className="min-h-[46px] flex-1 flex-row items-center gap-[8px] px-[12px]"
        >
          <Calendar size={16} color={colors["ink-secondary"]} />
          <Text tone={date === null ? "tertiary" : "primary"} className="flex-1">
            {text}
          </Text>
        </Pressable>
        {clearable && date !== null ? (
          <IconButton
            icon={X}
            accessibilityLabel={MOBILE_LABELS.clearField(label)}
            onPress={() => onChange(null)}
            iconSize={16}
            iconColor="ink-secondary"
          />
        ) : null}
      </View>
      {calendarOpen && Platform.OS === "ios" ? (
        <DateTimePicker
          value={shown}
          mode="date"
          display="inline"
          locale={PICKER_LOCALE}
          minimumDate={min}
          maximumDate={max}
          onValueChange={(_event, picked) => {
            pick(picked);
            setCalendarOpen(false);
          }}
        />
      ) : null}
    </FieldFrame>
  );
}
