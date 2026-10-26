/**
 * Scanning: the scan field (typed and camera codes), the in-memory scan bus, the deduper, the
 * camera scanner (one code / continuous, permission states) and the scanner route. The stand-ins
 * are the library mocks (expo-camera: permission and frames, see src/test/mocks/expo-camera) and,
 * for the field alone, the router's `push` (those tests render no navigator).
 */
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { AppState, Linking, Text } from "react-native";

import { MOBILE_LABELS, MOBILE_ROUTES, SCAN_MOBILE_LIMITS } from "@/constants/mobile";

import { Sheet } from "@/components/ui";

import {
  __cameraViewProps,
  __requestPermission,
  __scanBarcode,
  __setCameraPermission,
  __setSystemCameraPermission,
} from "@/test/mocks/expo-camera";

import ScannerRoute from "../../../../../app/(app)/scanner";
import { CameraScanner } from "../CameraScanner";
import { ScanField } from "../ScanField";
import { createScanDeduper } from "../dedupe";
import {
  createScanRequestId,
  publishScan,
  publishScanFeedback,
  publishScannerClosed,
  subscribeScan,
  subscribeScanFeedback,
  subscribeScannerClosed,
} from "../scan-bus";

import type { ScanFeedback } from "../scan-bus";
import type { ComponentProps } from "react";
import type { AppStateStatus } from "react-native";

const { scan } = MOBILE_LABELS;
const LABEL = "Mã vị trí";
const PLACEHOLDER = "Quét mã vị trí";
const upper = (code: string) => code.toUpperCase();

type FieldProps = Partial<ComponentProps<typeof ScanField>>;

async function renderField(props: FieldProps = {}) {
  const onSubmit = jest.fn();
  const view = await render(
    <ScanField label={LABEL} placeholder={PLACEHOLDER} onSubmit={onSubmit} {...props} />,
  );
  return { onSubmit, view, user: userEvent.setup() };
}

const field = () => screen.getByLabelText(LABEL);
const cameraButton = () => screen.getByRole("button", { name: scan.openCamera });

/** Presses the camera button and returns the request id the field sent to the scanner route. */
async function openCamera(user: ReturnType<typeof userEvent.setup>) {
  const push = jest.mocked(router.push);
  push.mockClear();
  await user.press(cameraButton());
  expect(push).toHaveBeenCalledTimes(1);
  const [href] = push.mock.calls[0] ?? [];
  if (typeof href !== "object" || href === null || !("params" in href)) {
    throw new Error("the field did not push the scanner route with params");
  }
  const { requestId } = href.params as { requestId: string };
  return requestId;
}

async function renderScanner(mode: "single" | "continuous", requestId = createScanRequestId()) {
  const onClose = jest.fn();
  const delivered = jest.fn();
  const unsubscribe = subscribeScan(requestId, delivered);
  await render(<CameraScanner requestId={requestId} mode={mode} title={LABEL} onClose={onClose} />);
  return { onClose, delivered, unsubscribe, requestId };
}

/**
 * The native `focus()` of every mocked host component (the TextInput mock shares it): the only way
 * to see that the field took the focus, since a mocked input never fires `onFocus` on its own.
 */
const nativeFocus = jest.requireActual<{ default: { focus: jest.Mock } }>(
  "@react-native/jest-preset/jest/MockNativeMethods",
).default.focus;

/** Captures AppState listeners, so a test can bring the app back to the foreground. */
function watchAppState() {
  const listeners = new Set<(state: AppStateStatus) => void>();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  });
  return {
    listening: () => listeners.size,
    emit: (state: AppStateStatus) => listeners.forEach((listener) => listener(state)),
  };
}

beforeEach(() => {
  __setCameraPermission(null);
  __requestPermission.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("ScanField", () => {
  beforeEach(() => {
    jest.spyOn(router, "push").mockImplementation(() => undefined);
  });

  it("typed code submits without camera", async () => {
    const { onSubmit, user } = await renderField({ normalize: upper });

    await user.type(field(), " ab-12 ", { submitEditing: true });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("AB-12");
    expect(field()).toHaveDisplayValue("");
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("empty input is ignored", async () => {
    const { onSubmit, user } = await renderField({ normalize: upper });

    await user.type(field(), "   ", { submitEditing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("is a monospace upper-case field without autocorrect", async () => {
    await renderField({ autoFocus: true });

    expect(field()).toHaveProp("autoCapitalize", "characters");
    expect(field()).toHaveProp("autoCorrect", false);
    expect(field()).toHaveProp("autoFocus", true);
    expect(field()).toHaveProp("placeholder", PLACEHOLDER);
    expect(field()).toHaveProp("accessibilityHint", scan.typeHint);
  });

  it("pending field still submits and shows a spinner", async () => {
    const { onSubmit, user } = await renderField({ pending: true, normalize: upper });

    expect(screen.getByRole("progressbar", { name: MOBILE_LABELS.processing })).toBeOnTheScreen();
    // As on the web ScanInput: a keyboard-wedge scanner keeps sending codes while the previous
    // one is handled; the next code is delivered (the station queues it), never appended.
    await user.type(field(), "ab-12", { submitEditing: true });

    expect(onSubmit).toHaveBeenCalledWith("AB-12");
    expect(field()).toHaveDisplayValue("");
    expect(cameraButton()).toBeEnabled();
  });

  it("disabled field ignores submit and camera", async () => {
    const { onSubmit, user } = await renderField({ disabled: true });

    await user.type(field(), "AB-12", { submitEditing: true });
    await user.press(cameraButton());

    expect(field()).not.toBeEnabled();
    expect(field()).toHaveDisplayValue("");
    expect(cameraButton()).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("disabled field drops camera codes", async () => {
    const onSubmit = jest.fn();
    const props = {
      label: LABEL,
      placeholder: PLACEHOLDER,
      onSubmit,
      cameraMode: "continuous" as const,
    };
    const view = await render(<ScanField {...props} />);
    const requestId = await openCamera(userEvent.setup());

    await view.rerender(<ScanField {...props} disabled />);
    await act(async () => publishScan(requestId, "PKG-1"));
    expect(onSubmit).not.toHaveBeenCalled();

    // Enabled again, the still-open continuous camera delivers once more.
    await view.rerender(<ScanField {...props} />);
    await act(async () => publishScan(requestId, "PKG-2"));
    expect(onSubmit.mock.calls).toEqual([["PKG-2"]]);
  });

  it("double tap on the camera button opens one scanner", async () => {
    const { user } = await renderField();
    const push = jest.mocked(router.push);

    await user.press(cameraButton());
    await user.press(cameraButton());
    expect(push).toHaveBeenCalledTimes(1);

    // Once that scanner has closed, the button opens a new one.
    const [href] = push.mock.calls[0] ?? [];
    const first =
      typeof href === "object" && href !== null && "params" in href
        ? String((href.params as { requestId: string }).requestId)
        : "";
    await act(async () => publishScannerClosed(first));
    const second = await openCamera(user);
    expect(second).not.toBe(first);
  });

  it("re-enabled field takes focus again", async () => {
    const props = { label: LABEL, placeholder: PLACEHOLDER, onSubmit: jest.fn() };
    const view = await render(<ScanField {...props} disabled />);
    nativeFocus.mockClear();

    await view.rerender(<ScanField {...props} disabled={false} />);
    expect(nativeFocus).toHaveBeenCalledTimes(1);

    // Staying enabled does not take the focus again.
    await view.rerender(<ScanField {...props} />);
    expect(nativeFocus).toHaveBeenCalledTimes(1);
  });

  it("max length is applied", async () => {
    const { user } = await renderField({ maxLength: 6 });

    await user.type(field(), "PKG-12345");

    expect(field()).toHaveProp("maxLength", 6);
    expect(field()).toHaveDisplayValue("PKG-12");
  });

  it("hint is shown", async () => {
    const hint = "Mã in trên nhãn kiện";
    const { view } = await renderField({ hint });

    expect(screen.getByText(hint)).toBeOnTheScreen();

    // As on the web, a scan result takes the hint's place.
    await view.rerender(
      <ScanField
        label={LABEL}
        placeholder={PLACEHOLDER}
        onSubmit={jest.fn()}
        hint={hint}
        feedback={{ tone: "danger", message: "Sai kiện" }}
      />,
    );
    expect(screen.queryByText(hint)).toBeNull();
    expect(screen.getByText("Sai kiện")).toBeOnTheScreen();
  });

  it("clear button empties the field", async () => {
    const { onSubmit, user } = await renderField();
    expect(screen.queryByRole("button", { name: scan.clear })).toBeNull();

    await user.type(field(), "AB-12");
    await user.press(screen.getByRole("button", { name: scan.clear }));

    expect(field()).toHaveDisplayValue("");
    expect(screen.queryByRole("button", { name: scan.clear })).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("camera button opens the scanner and the scanned code comes back once", async () => {
    const { onSubmit, user } = await renderField({ normalize: upper });

    const requestId = await openCamera(user);

    expect(router.push).toHaveBeenCalledWith({
      pathname: MOBILE_ROUTES.scanner,
      params: { requestId, mode: "single", title: LABEL },
    });
    await act(async () => publishScan(requestId, " loc-01 "));
    expect(onSubmit).toHaveBeenCalledWith("LOC-01");

    // Single mode: the subscription ends with the first code.
    await act(async () => publishScan(requestId, "LOC-02"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("reopening the camera replaces the previous subscription", async () => {
    const { onSubmit, user } = await renderField({ cameraMode: "continuous" });

    const first = await openCamera(user);
    await act(async () => publishScannerClosed(first));
    const second = await openCamera(user);

    expect(second).not.toBe(first);
    await act(async () => publishScan(first, "OLD"));
    await act(async () => publishScan(second, "NEW-1"));
    await act(async () => publishScan(second, "NEW-2"));
    expect(onSubmit.mock.calls).toEqual([["NEW-1"], ["NEW-2"]]);
  });

  it("unmounting the field unsubscribes", async () => {
    const { onSubmit, user, view } = await renderField({ cameraMode: "continuous" });
    const requestId = await openCamera(user);

    await view.unmount();
    publishScan(requestId, "AB-12");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("continuous field forwards each new feedback to the open camera", async () => {
    const { user, view } = await renderField({ cameraMode: "continuous", feedback: null });
    const requestId = await openCamera(user);
    const received = jest.fn();
    const stop = subscribeScanFeedback(requestId, received);
    const wrong: ScanFeedback = { tone: "danger", message: "Sai kiện" };

    await view.rerender(
      <ScanField
        label={LABEL}
        placeholder={PLACEHOLDER}
        onSubmit={jest.fn()}
        cameraMode="continuous"
        feedback={wrong}
      />,
    );

    expect(received).toHaveBeenCalledWith(wrong);
    expect(screen.getByText("Sai kiện")).toBeOnTheScreen();
    stop();
  });

  it("shows the feedback under the field", async () => {
    await renderField({ feedback: { tone: "positive", message: "Đã quét PKG-1" } });

    expect(screen.getByText("Đã quét PKG-1")).toBeOnTheScreen();
  });

  it("warns in development when it is put inside a sheet, not outside one", async () => {
    // scanning.md: no ScanField inside a Sheet (the camera opens over it, a station keeps its
    // field on screen). Only a development warning: nothing changes for the user.
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const field = <ScanField label={LABEL} placeholder={PLACEHOLDER} onSubmit={jest.fn()} />;
    const { rerender } = await render(field, { wrapper: BottomSheetModalProvider });
    expect(warn).not.toHaveBeenCalled();

    await rerender(
      <Sheet open onOpenChange={jest.fn()} title="Quét">
        {field}
      </Sheet>,
    );

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("ScanField");
  });
});

describe("scan bus", () => {
  it("scan bus delivers to matching request only", () => {
    const first = createScanRequestId();
    const second = createScanRequestId();
    const toFirst = jest.fn();
    const toSecond = jest.fn();
    const stopFirst = subscribeScan(first, toFirst);
    const stopSecond = subscribeScan(second, toSecond);

    expect(first).not.toBe(second);
    publishScan(first, "A");
    expect(toFirst).toHaveBeenCalledWith("A");
    expect(toSecond).not.toHaveBeenCalled();

    stopFirst();
    publishScan(first, "B");
    expect(toFirst).toHaveBeenCalledTimes(1);
    stopSecond();
  });

  it("delivers feedback by request id too", () => {
    const requestId = createScanRequestId();
    const listener = jest.fn();
    const stop = subscribeScanFeedback(requestId, listener);
    const ok: ScanFeedback = { tone: "positive", message: "OK" };

    publishScanFeedback(createScanRequestId(), ok);
    expect(listener).not.toHaveBeenCalled();
    publishScanFeedback(requestId, ok);
    expect(listener).toHaveBeenCalledWith(ok);

    stop();
    publishScanFeedback(requestId, ok);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("a listener may unsubscribe while it is being called", () => {
    const requestId = createScanRequestId();
    const calls: string[] = [];
    const stop = subscribeScan(requestId, (code) => {
      calls.push(`first:${code}`);
      stop();
    });
    const stopOther = subscribeScan(requestId, (code) => calls.push(`second:${code}`));

    publishScan(requestId, "A");
    publishScan(requestId, "B");

    expect(calls).toEqual(["first:A", "second:A", "second:B"]);
    stopOther();
  });
});

describe("createScanDeduper", () => {
  it("deduper ignores same code within 1500 ms and accepts after", () => {
    expect(SCAN_MOBILE_LIMITS.dedupeWindowMs).toBe(1500);
    const accept = createScanDeduper();

    expect(accept("PKG-1", 10_000)).toBe(true);
    expect(accept("PKG-2", 10_200)).toBe(true);
    expect(accept("PKG-1", 11_499)).toBe(false);
    // PKG-2 has not been seen since 10 200: accepted again 1500 ms later.
    expect(accept("PKG-2", 11_700)).toBe(true);
  });

  it("held barcode counts once", () => {
    const accept = createScanDeduper();
    const reads: boolean[] = [];

    // In view for 5 s, read every 100 ms: each sighting restarts the window.
    for (let at = 0; at <= 5000; at += 100) reads.push(accept("PKG-1", at));

    expect(reads.filter(Boolean)).toHaveLength(1);
    expect(reads[0]).toBe(true);
    // Out of view for 1500 ms after the last sighting: a new read counts.
    expect(accept("PKG-1", 6500)).toBe(true);
  });

  it("takes its own window", () => {
    const accept = createScanDeduper(100);

    expect(accept("A", 0)).toBe(true);
    expect(accept("A", 99)).toBe(false);
    expect(accept("A", 198)).toBe(false);
    expect(accept("A", 298)).toBe(true);
  });
});

describe("CameraScanner", () => {
  it("single mode publishes first code and closes", async () => {
    __setCameraPermission({ granted: true });
    const { onClose, delivered, unsubscribe } = await renderScanner("single");

    await __scanBarcode("LOC-01");

    expect(delivered).toHaveBeenCalledWith("LOC-01");
    expect(onClose).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("single mode publishes once when two codes arrive quickly", async () => {
    __setCameraPermission({ granted: true });
    const { onClose, delivered, unsubscribe } = await renderScanner("single");

    await __scanBarcode("LOC-01", "LOC-02");
    await __scanBarcode("LOC-03");

    expect(delivered.mock.calls).toEqual([["LOC-01"]]);
    expect(onClose).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("reads the warehouse barcode formats", async () => {
    __setCameraPermission({ granted: true });
    const { unsubscribe } = await renderScanner("single");

    expect(__cameraViewProps()?.barcodeScannerSettings).toEqual({
      barcodeTypes: ["code128", "code39", "ean13", "ean8", "upc_a", "upc_e", "qr", "datamatrix"],
    });
    unsubscribe();
  });

  it("continuous mode publishes deduped codes and stays open", async () => {
    jest.useFakeTimers();
    __setCameraPermission({ granted: true });
    const { onClose, delivered, unsubscribe } = await renderScanner("continuous");

    await __scanBarcode("PKG-1", "PKG-1", "PKG-2");
    await __scanBarcode("PKG-1");
    await act(async () => jest.advanceTimersByTime(SCAN_MOBILE_LIMITS.dedupeWindowMs));
    await __scanBarcode("PKG-1");

    expect(delivered.mock.calls).toEqual([["PKG-1"], ["PKG-2"], ["PKG-1"]]);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId("camera-view")).toBeOnTheScreen();
    unsubscribe();
  });

  it("continuous mode shows the station feedback over the camera", async () => {
    jest.useFakeTimers();
    __setCameraPermission({ granted: true });
    const { requestId, unsubscribe } = await renderScanner("continuous");

    await act(async () => publishScanFeedback(requestId, { tone: "danger", message: "Sai kiện" }));
    expect(screen.getByText("Sai kiện")).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(SCAN_MOBILE_LIMITS.positiveFeedbackMs * 2));
    expect(screen.getByText("Sai kiện")).toBeOnTheScreen();

    await act(async () => publishScanFeedback(requestId, { tone: "positive", message: "PKG-1" }));
    expect(screen.queryByText("Sai kiện")).toBeNull();
    expect(screen.getByText("PKG-1")).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(SCAN_MOBILE_LIMITS.positiveFeedbackMs));
    expect(screen.queryByText("PKG-1")).toBeNull();
    unsubscribe();
  });

  it("always shows the title and a close button", async () => {
    const { onClose, unsubscribe } = await renderScanner("single");
    const user = userEvent.setup();

    expect(screen.getByRole("header", { name: LABEL })).toBeOnTheScreen();
    // The permission is still loading: neither the camera nor a prompt.
    expect(screen.queryByTestId("camera-view")).toBeNull();
    expect(screen.queryByText(scan.permissionTitle)).toBeNull();
    expect(screen.queryByRole("button", { name: scan.allowCamera })).toBeNull();
    expect(screen.queryByRole("button", { name: scan.openSettings })).toBeNull();
    await user.press(screen.getByRole("button", { name: scan.close }));

    expect(onClose).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("the scanner tells the field when it closes", async () => {
    const closed = jest.fn();
    const requestId = createScanRequestId();
    const stop = subscribeScannerClosed(requestId, closed);
    const view = await render(
      <CameraScanner requestId={requestId} mode="single" title={LABEL} onClose={jest.fn()} />,
    );
    expect(closed).not.toHaveBeenCalled();

    await view.unmount();

    expect(closed).toHaveBeenCalledTimes(1);
    stop();
  });

  it("the scanner says when the worker chose to type instead", async () => {
    __setCameraPermission({ granted: false, canAskAgain: true });
    const closed = jest.fn();
    const requestId = createScanRequestId();
    const stop = subscribeScannerClosed(requestId, closed);
    const onClose = jest.fn();
    const view = await render(
      <CameraScanner requestId={requestId} mode="single" title={LABEL} onClose={onClose} />,
    );
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: scan.typeInstead }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await view.unmount();

    expect(closed).toHaveBeenCalledWith("type-instead");
    stop();
  });

  it("a scanner closed any other way does not ask for the keyboard", async () => {
    const closed = jest.fn();
    const requestId = createScanRequestId();
    const stop = subscribeScannerClosed(requestId, closed);
    const view = await render(
      <CameraScanner requestId={requestId} mode="single" title={LABEL} onClose={jest.fn()} />,
    );

    await view.unmount();

    expect(closed).toHaveBeenCalledWith("closed");
    stop();
  });

  it("typing instead from the camera puts the focus back in the field", async () => {
    jest.spyOn(router, "push").mockImplementation(() => undefined);
    const { user } = await renderField();
    const typed = await openCamera(user);
    nativeFocus.mockClear();

    await act(async () => publishScannerClosed(typed, "type-instead"));
    // Not while the camera screen is still sliding away: Android would drop the focus.
    expect(nativeFocus).not.toHaveBeenCalled();
    await waitFor(() => expect(nativeFocus).toHaveBeenCalledTimes(1));

    // Closing the camera with ✕ or by reading a code leaves the keyboard down.
    const closed = await openCamera(user);
    nativeFocus.mockClear();
    await act(async () => publishScannerClosed(closed, "closed"));
    await act(
      () =>
        new Promise((resolve) =>
          setTimeout(resolve, SCAN_MOBILE_LIMITS.typeInsteadFocusDelayMs + 50),
        ),
    );
    expect(nativeFocus).not.toHaveBeenCalled();
  });

  it("asks for the camera when it may", async () => {
    __setCameraPermission({ granted: false, canAskAgain: true });
    const { onClose, unsubscribe } = await renderScanner("single");
    const user = userEvent.setup();
    // The worker allows the camera in the system dialog.
    __setSystemCameraPermission({ granted: true });

    expect(screen.getByText(scan.permissionTitle)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: scan.allowCamera }));

    expect(__requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("camera-view")).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("a request denied for good switches to the settings prompt", async () => {
    __setCameraPermission({ granted: false, canAskAgain: true });
    const { unsubscribe } = await renderScanner("single");
    const user = userEvent.setup();
    // The worker refuses and the system will not show its dialog again.
    __setSystemCameraPermission({ granted: false, canAskAgain: false });

    await user.press(screen.getByRole("button", { name: scan.allowCamera }));

    expect(screen.getByText(scan.permissionDenied)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: scan.openSettings })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: scan.allowCamera })).toBeNull();
    unsubscribe();
  });

  it("returning from settings with the camera granted shows the camera", async () => {
    const appState = watchAppState();
    __setCameraPermission({ granted: false, canAskAgain: false });
    const { unsubscribe } = await renderScanner("single");
    expect(screen.getByRole("button", { name: scan.openSettings })).toBeOnTheScreen();
    expect(appState.listening()).toBe(1);

    // Allowed in Settings: the hook does not know until it asks again.
    __setSystemCameraPermission({ granted: true });
    expect(screen.queryByTestId("camera-view")).toBeNull();
    await act(async () => appState.emit("active"));

    expect(screen.getByTestId("camera-view")).toBeOnTheScreen();
    // Granted: nothing left to watch.
    expect(appState.listening()).toBe(0);
    unsubscribe();
  });

  it("denied permission shows settings prompt", async () => {
    __setCameraPermission({ granted: false, canAskAgain: false });
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    const { onClose, unsubscribe } = await renderScanner("single");
    const user = userEvent.setup();

    expect(screen.getByText(scan.permissionDenied)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: scan.allowCamera })).toBeNull();
    expect(screen.queryByTestId("camera-view")).toBeNull();

    await user.press(screen.getByRole("button", { name: scan.openSettings }));
    expect(openSettings).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole("button", { name: scan.typeInstead }));
    expect(onClose).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});

describe("scanner route", () => {
  function Home() {
    return <Text>home</Text>;
  }

  it("scanner route closes on missing request id", async () => {
    const view = await renderRouter({ index: Home, scanner: ScannerRoute }, { initialUrl: "/" });

    await act(async () => router.push("/scanner?mode=single"));

    expect(view.getPathname()).toBe("/");
    expect(screen.queryByTestId("camera-view")).toBeNull();
  });

  it("opened by a link with nothing behind it, goes to the start instead of crashing", async () => {
    const view = await renderRouter(
      { index: Home, scanner: ScannerRoute },
      { initialUrl: "/scanner" },
    );

    expect(view.getPathname()).toBe("/");
    expect(screen.getByText("home")).toBeOnTheScreen();
  });

  it("scanner route closes on an unknown mode", async () => {
    const view = await renderRouter({ index: Home, scanner: ScannerRoute }, { initialUrl: "/" });

    await act(async () => router.push("/scanner?requestId=scan-1&mode=burst"));

    expect(view.getPathname()).toBe("/");
  });

  it("opens the camera for a valid request, titled after the field", async () => {
    __setCameraPermission({ granted: true });
    const view = await renderRouter({ index: Home, scanner: ScannerRoute }, { initialUrl: "/" });
    const requestId = createScanRequestId();
    const delivered = jest.fn();
    const stop = subscribeScan(requestId, delivered);

    await act(async () =>
      router.push({ pathname: "/scanner", params: { requestId, title: LABEL } }),
    );
    expect(view.getPathname()).toBe("/scanner");
    expect(screen.getByRole("header", { name: LABEL })).toBeOnTheScreen();

    await __scanBarcode("LOC-01");
    expect(delivered).toHaveBeenCalledWith("LOC-01");
    expect(view.getPathname()).toBe("/");
    stop();
  });

  it("falls back to the default title", async () => {
    __setCameraPermission({ granted: true });
    await renderRouter({ index: Home, scanner: ScannerRoute }, { initialUrl: "/" });

    await act(async () => router.push("/scanner?requestId=scan-1"));

    expect(screen.getByRole("header", { name: scan.openCamera })).toBeOnTheScreen();
  });
});
