// Stand-in for `@gorhom/bottom-sheet` (registered in src/test/setup.ts). It is the library's own
// mock with these changes, so a test can see what a screen reader or a user would:
// - `BottomSheetModal` shows its children between present() and dismiss() (the stock one always
//   renders them and ignores both), and calls `onDismiss` when it goes away, as the library does;
// - `BottomSheetModal`, `BottomSheetBackdrop` and `BottomSheetHandle` render the accessibility props
//   they are given, with the library's English strings as the defaults, so a sheet that forgets to
//   pass its own labels shows up in a test;
// - `BottomSheetModal` also shows `maxDynamicContentSize` and `enablePanDownToClose` on its host
//   view, and `BottomSheetBackdrop` its `pressBehavior`, as the `SHEET_*_PROP` props below;
// - `__userDismissSheets` plays a swipe down, which a sheet with `enablePanDownToClose={false}`
//   ignores, as the library does;
// - `BottomSheetScrollView` is a `ScrollView` with `SHEET_SCROLL_TEST_ID`, so a test can tell the
//   scrollable body from the plain `BottomSheetView`;
// - `BottomSheetTextInput` is a plain `TextInput` that carries `SHEET_INPUT_PROP` and, like the
//   real one (it reads the sheet's internal context), throws when rendered outside a
//   `BottomSheetModal`: a text field that forgot to be sheet-aware shows up in a test (R23, R30).
import { act } from "@testing-library/react-native";
import { Component, createContext, forwardRef, useContext } from "react";
import { ScrollView, TextInput, View } from "react-native";

import type { ComponentType, ReactNode } from "react";
import type {
  AccessibilityRole,
  ScrollViewInstance,
  ScrollViewProps,
  TextInputInstance,
  TextInputProps,
} from "react-native";

type StockMock = Record<string, unknown>;

// As in the library, `null` drops a prop and `undefined` falls back to the English default.
type A11yProps = {
  accessible?: boolean | null;
  accessibilityRole?: AccessibilityRole | null;
  accessibilityLabel?: string | null;
  accessibilityHint?: string | null;
};

type ModalProps = A11yProps & {
  children?: ReactNode;
  onDismiss?: () => void;
  backdropComponent?: ComponentType<object> | null;
  handleComponent?: ComponentType<object> | null;
  maxDynamicContentSize?: number;
  enablePanDownToClose?: boolean;
};

/** Props the stand-ins set on their host views, for a test to read. */
export const SHEET_INPUT_PROP = "data-bottom-sheet-input";
export const SHEET_MAX_HEIGHT_PROP = "data-max-dynamic-content-size";
export const SHEET_PAN_CLOSE_PROP = "data-enable-pan-down-to-close";
export const BACKDROP_PRESS_PROP = "data-press-behavior";
export const SHEET_SCROLL_TEST_ID = "bottom-sheet-scroll-view";

const InsideModal = createContext(false);

export function BottomSheetBackdrop({
  accessible = true,
  accessibilityRole = "button",
  accessibilityLabel = "Bottom sheet backdrop",
  accessibilityHint = "Tap to close the bottom sheet",
  pressBehavior,
}: A11yProps & { pressBehavior?: string }) {
  return (
    <View
      accessible={accessible ?? undefined}
      accessibilityRole={accessibilityRole ?? undefined}
      accessibilityLabel={accessibilityLabel ?? undefined}
      accessibilityHint={accessibilityHint ?? undefined}
      {...{ [BACKDROP_PRESS_PROP]: pressBehavior }}
    />
  );
}

export function BottomSheetHandle({
  accessible = true,
  accessibilityRole = "adjustable",
  accessibilityLabel = "Bottom sheet handle",
  accessibilityHint = "Drag up or down to extend or minimize the bottom sheet",
}: A11yProps) {
  return (
    <View
      accessible={accessible ?? undefined}
      accessibilityRole={accessibilityRole ?? undefined}
      accessibilityLabel={accessibilityLabel ?? undefined}
      accessibilityHint={accessibilityHint ?? undefined}
    />
  );
}

export const BottomSheetTextInput = forwardRef<TextInputInstance, TextInputProps>((props, ref) => {
  if (!useContext(InsideModal)) {
    // The message of the real `useBottomSheetInternal`.
    throw new Error("'useBottomSheetInternal' cannot be used out of the BottomSheet!");
  }
  return <TextInput ref={ref} {...props} {...{ [SHEET_INPUT_PROP]: true }} />;
});
BottomSheetTextInput.displayName = "BottomSheetTextInput";

export const BottomSheetScrollView = forwardRef<ScrollViewInstance, ScrollViewProps>(
  (props, ref) => <ScrollView ref={ref} testID={SHEET_SCROLL_TEST_ID} {...props} />,
);
BottomSheetScrollView.displayName = "BottomSheetScrollView";

const presented = new Set<BottomSheetModal>();

export class BottomSheetModal extends Component<ModalProps, { visible: boolean }> {
  state = { visible: false };

  componentWillUnmount() {
    presented.delete(this);
  }

  present() {
    presented.add(this);
    this.setState({ visible: true });
  }

  dismiss() {
    presented.delete(this);
    this.setState({ visible: false });
    this.props.onDismiss?.();
  }

  render() {
    if (!this.state.visible) return null;
    const {
      children,
      backdropComponent: Backdrop,
      handleComponent: Handle = BottomSheetHandle,
      accessible = true,
      accessibilityRole = "adjustable",
      accessibilityLabel = "Bottom Sheet",
      maxDynamicContentSize,
      enablePanDownToClose = true,
    } = this.props;

    return (
      <InsideModal.Provider value>
        {Backdrop ? <Backdrop /> : null}
        <View
          accessible={accessible ?? undefined}
          accessibilityRole={accessibilityRole ?? undefined}
          accessibilityLabel={accessibilityLabel ?? undefined}
          {...{
            [SHEET_MAX_HEIGHT_PROP]: maxDynamicContentSize,
            [SHEET_PAN_CLOSE_PROP]: enablePanDownToClose,
          }}
        >
          {children}
        </View>
        {Handle ? <Handle /> : null}
      </InsideModal.Provider>
    );
  }
}

/**
 * Plays a user swiping every open sheet down. A sheet that is not dismissible (the library's
 * `enablePanDownToClose={false}`) stays where it is.
 */
export async function __userDismissSheets(): Promise<void> {
  await act(async () => {
    for (const sheet of [...presented]) {
      if (sheet.props.enablePanDownToClose !== false) sheet.dismiss();
    }
  });
}

const {
  BottomSheetModal: _stockModal,
  BottomSheetBackdrop: _stockBackdrop,
  BottomSheetTextInput: _stockTextInput,
  BottomSheetScrollView: _stockScrollView,
  ...stock
} = jest.requireActual<StockMock>("@gorhom/bottom-sheet/mock");
Object.assign(module.exports, stock);
