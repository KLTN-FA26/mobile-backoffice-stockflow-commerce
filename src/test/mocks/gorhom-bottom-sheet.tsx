// Stand-in for `@gorhom/bottom-sheet` (registered in src/test/setup.ts). It is the library's own
// mock with these changes, so a test can see what a screen reader or a user would:
// - `BottomSheetModal` shows its children between present() and dismiss() (the stock one always
//   renders them and ignores both), and calls `onDismiss` when it goes away, as the library does;
// - like the library, it renders that content through a portal at the end of
//   `BottomSheetModalProvider` (the stock provider just renders its children), so a context given
//   between the provider and the sheet (route, form, tab bar height) is missing inside the sheet
//   here as on a device; and, like the library, a `BottomSheetModal` without a provider throws;
// - the sheet draws `backgroundComponent`, or the library's default background (an adjustable
//   element read as "Bottom Sheet" in English) when there is none, and nothing for `null`;
// - like the library, the whole sheet (backdrop included) sits inside `containerComponent` when
//   one is given;
// - `BottomSheetModal`, `BottomSheetBackdrop` and `BottomSheetHandle` render the accessibility props
//   they are given, with the library's English strings as the defaults, so a sheet that forgets to
//   pass its own labels shows up in a test;
// - `BottomSheetModal` also shows `maxDynamicContentSize`, `enablePanDownToClose` and the duration
//   of its `animationConfigs` on its host view, and `BottomSheetBackdrop` its `pressBehavior`, as
//   the `SHEET_*_PROP` props below;
// - `__userDismissSheets` plays a swipe down, which a sheet with `enablePanDownToClose={false}`
//   ignores, as the library does;
// - `BottomSheetScrollView` is a `ScrollView` with `SHEET_SCROLL_TEST_ID`, so a test can tell the
//   scrollable body from the plain `BottomSheetView`;
// - `BottomSheetTextInput` is a plain `TextInput` that carries `SHEET_INPUT_PROP` and, like the
//   real one (it reads the sheet's internal context), throws when rendered outside a
//   `BottomSheetModal`: a text field that forgot to be sheet-aware shows up in a test (R23, R30).
import { act } from "@testing-library/react-native";
import { Component, createContext, Fragment, forwardRef, useContext, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";

import type { ComponentType, PropsWithChildren, ReactNode } from "react";
import type {
  AccessibilityRole,
  ScrollViewInstance,
  ScrollViewProps,
  StyleProp,
  TextInputInstance,
  TextInputProps,
  ViewProps,
  ViewStyle,
} from "react-native";

type StockMock = Record<string, unknown>;

// As in the library, `null` drops a prop and `undefined` falls back to the English default.
type A11yProps = {
  accessible?: boolean | null;
  accessibilityRole?: AccessibilityRole | null;
  accessibilityLabel?: string | null;
  accessibilityHint?: string | null;
};

type BackgroundProps = {
  pointerEvents?: ViewProps["pointerEvents"];
  style?: StyleProp<ViewStyle>;
};

type ModalProps = A11yProps & {
  children?: ReactNode;
  onDismiss?: () => void;
  backdropComponent?: ComponentType<object> | null;
  backgroundComponent?: ComponentType<BackgroundProps> | null;
  backgroundStyle?: StyleProp<ViewStyle>;
  containerComponent?: ComponentType<PropsWithChildren>;
  handleComponent?: ComponentType<object> | null;
  maxDynamicContentSize?: number;
  enablePanDownToClose?: boolean;
  animationConfigs?: { duration?: number };
};

/** Props the stand-ins set on their host views, for a test to read. */
export const SHEET_INPUT_PROP = "data-bottom-sheet-input";
export const SHEET_MAX_HEIGHT_PROP = "data-max-dynamic-content-size";
export const SHEET_PAN_CLOSE_PROP = "data-enable-pan-down-to-close";
export const SHEET_ANIMATION_DURATION_PROP = "data-animation-duration";
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

/** The library's default background: one adjustable element read as "Bottom Sheet". */
function DefaultBackground({ pointerEvents, style }: BackgroundProps) {
  return (
    <View
      pointerEvents={pointerEvents}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Bottom Sheet"
      style={style}
    />
  );
}

/** The provider's portal: presented sheets hand it their content, keyed per sheet. */
type PortalHost = {
  mount: (key: number, content: ReactNode) => void;
  unmount: (key: number) => void;
};

const Portal = createContext<PortalHost | null>(null);

// The message the library's `useBottomSheetModalInternal` throws without a provider.
const NO_PROVIDER = "'BottomSheetModalInternalContext' cannot be null!";

/** Renders its children, then every presented sheet: the end of the tree, as the library's host. */
export function BottomSheetModalProvider({ children }: { children?: ReactNode }) {
  const [portals, setPortals] = useState<ReadonlyMap<number, ReactNode>>(() => new Map());
  const [host] = useState<PortalHost>(() => ({
    mount: (key, content) => setPortals((current) => new Map(current).set(key, content)),
    unmount: (key) =>
      setPortals((current) => {
        if (!current.has(key)) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      }),
  }));
  return (
    <Portal.Provider value={host}>
      {children}
      {[...portals].map(([key, content]) => (
        <Fragment key={key}>{content}</Fragment>
      ))}
    </Portal.Provider>
  );
}

let nextPortalKey = 0;
const presented = new Set<Modal>();

class Modal extends Component<ModalProps & { host: PortalHost }, { visible: boolean }> {
  state = { visible: false };
  private readonly portalKey = nextPortalKey++;

  componentDidMount() {
    this.syncPortal();
  }

  componentDidUpdate() {
    this.syncPortal();
  }

  componentWillUnmount() {
    presented.delete(this);
    this.props.host.unmount(this.portalKey);
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

  // Nothing renders in place: the content goes to the provider's portal (see the file header).
  render() {
    return null;
  }

  private syncPortal() {
    if (this.state.visible) this.props.host.mount(this.portalKey, this.renderSheet());
    else this.props.host.unmount(this.portalKey);
  }

  private renderSheet() {
    const {
      children,
      backdropComponent: Backdrop,
      backgroundComponent,
      backgroundStyle,
      containerComponent: Container = Fragment,
      handleComponent: Handle = BottomSheetHandle,
      accessible = true,
      accessibilityRole = "adjustable",
      accessibilityLabel = "Bottom Sheet",
      maxDynamicContentSize,
      enablePanDownToClose = true,
      animationConfigs,
    } = this.props;
    // As in the library: `undefined` means the default background, `null` none.
    const Background = backgroundComponent === undefined ? DefaultBackground : backgroundComponent;

    return (
      <Container>
        <InsideModal.Provider value>
          {Backdrop ? <Backdrop /> : null}
          {Background ? <Background pointerEvents="none" style={backgroundStyle} /> : null}
          <View
            accessible={accessible ?? undefined}
            accessibilityRole={accessibilityRole ?? undefined}
            accessibilityLabel={accessibilityLabel ?? undefined}
            {...{
              [SHEET_MAX_HEIGHT_PROP]: maxDynamicContentSize,
              [SHEET_PAN_CLOSE_PROP]: enablePanDownToClose,
              [SHEET_ANIMATION_DURATION_PROP]: animationConfigs?.duration,
            }}
          >
            {children}
          </View>
          {Handle ? <Handle /> : null}
        </InsideModal.Provider>
      </Container>
    );
  }
}

/** `present()` / `dismiss()` through a ref, as on the library's modal; needs the provider above. */
export const BottomSheetModal = forwardRef<Modal, ModalProps>((props, ref) => {
  const host = useContext(Portal);
  if (host === null) throw new Error(NO_PROVIDER);
  return <Modal ref={ref} host={host} {...props} />;
});
BottomSheetModal.displayName = "BottomSheetModal";

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
  BottomSheetModalProvider: _stockProvider,
  BottomSheetBackdrop: _stockBackdrop,
  BottomSheetTextInput: _stockTextInput,
  BottomSheetScrollView: _stockScrollView,
  ...stock
} = jest.requireActual<StockMock>("@gorhom/bottom-sheet/mock");
Object.assign(module.exports, stock);
