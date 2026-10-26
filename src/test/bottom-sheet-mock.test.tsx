import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { act, render, screen } from "@testing-library/react-native";
import { createContext, createRef, useContext } from "react";
import { Text, View } from "react-native";

import { __userDismissSheets } from "./mocks/gorhom-bottom-sheet";

import type { BottomSheetModalProps } from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";

// What a screen provides between the app's sheet provider and its sheet: route params, a form, the
// tab bar height. On a device a presented sheet renders in the provider's portal, without them.
const ScreenContext = createContext("outside the screen");

function ReadScreenContext() {
  return <Text>{useContext(ScreenContext)}</Text>;
}

type ModalProps = Partial<Pick<BottomSheetModalProps, "backgroundComponent">>;

/** A screen with a sheet; returns the sheet's ref to present or dismiss it. */
async function screenWithSheet(props: ModalProps = {}, wrap = true) {
  const sheet = createRef<BottomSheetModal>();
  const ui = (
    <ScreenContext.Provider value="inside the screen">
      <BottomSheetModal ref={sheet} accessibilityLabel="Chọn kho" {...props}>
        <ReadScreenContext />
      </BottomSheetModal>
    </ScreenContext.Provider>
  );
  await render(wrap ? <BottomSheetModalProvider>{ui}</BottomSheetModalProvider> : ui);
  return sheet;
}

async function present(sheet: { current: BottomSheetModal | null }) {
  await act(async () => sheet.current?.present());
}

function PlainBackground(): ReactNode {
  return <View accessible={false} testID="plain-background" />;
}

describe("@gorhom/bottom-sheet test double", () => {
  it("renders presented content in the provider's portal, outside the screen's contexts", async () => {
    const sheet = await screenWithSheet();
    expect(screen.queryByText(/the screen/)).toBeNull();

    await present(sheet);

    expect(screen.getByText("outside the screen")).toBeOnTheScreen();
    expect(screen.queryByText("inside the screen")).toBeNull();
  });

  it("takes the content out of the portal when the sheet is dismissed or unmounted", async () => {
    const sheet = await screenWithSheet();
    await present(sheet);

    await act(async () => sheet.current?.dismiss());
    expect(screen.queryByText("outside the screen")).toBeNull();

    await present(sheet);
    await __userDismissSheets();
    expect(screen.queryByText("outside the screen")).toBeNull();
  });

  it("throws without a BottomSheetModalProvider, as the library does", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(screenWithSheet({}, false)).rejects.toThrow(
      "'BottomSheetModalInternalContext' cannot be null!",
    );

    consoleError.mockRestore();
  });

  it("draws the library's English background unless the sheet passes its own", async () => {
    const sheet = await screenWithSheet();
    await present(sheet);
    // The library's default background is an adjustable element read as "Bottom Sheet".
    expect(screen.getByLabelText("Bottom Sheet")).toHaveProp("accessibilityRole", "adjustable");
  });

  it("draws the background the sheet passes, or none for null", async () => {
    const own = await screenWithSheet({ backgroundComponent: PlainBackground });
    await present(own);
    expect(screen.queryByLabelText("Bottom Sheet")).toBeNull();
    expect(screen.getByTestId("plain-background")).toBeOnTheScreen();

    screen.unmount();
    const none = await screenWithSheet({ backgroundComponent: null });
    await present(none);
    expect(screen.queryByLabelText("Bottom Sheet")).toBeNull();
  });
});
