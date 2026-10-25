// Stand-in for `@react-native-community/datetimepicker` (registered in src/test/setup.ts). The real
// iOS picker is a native view and the Android one opens a native dialog; neither exists under Jest.
// - the default export (iOS) is a host view that keeps every prop it is given, so a test can read
//   `value`, `minimumDate`... and fire `valueChange` on it as the native control would;
// - `DateTimePickerAndroid.open` is a `jest.fn()`: a test reads its options and calls `onValueChange`.
import { View } from "react-native";

import type { ViewProps } from "react-native";

export const DATE_TIME_PICKER_TEST_ID = "date-time-picker";

export default function DateTimePicker(props: ViewProps & Record<string, unknown>) {
  return <View testID={DATE_TIME_PICKER_TEST_ID} {...props} />;
}

export const DateTimePickerAndroid = {
  open: jest.fn(),
  dismiss: jest.fn(async () => true),
};
