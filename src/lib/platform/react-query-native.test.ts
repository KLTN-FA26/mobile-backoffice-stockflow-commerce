import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";

import { wireReactQueryToNative } from "./react-query-native";

type AppStateListener = (state: AppStateStatus) => void;
type NetInfoListener = (state: NetInfoState) => void;

let emitAppState: AppStateListener = () => {};
let emitNetInfo: NetInfoListener = () => {};
const removeAppState = jest.fn();
const removeNetInfo = jest.fn();

function netInfo(isConnected: boolean | null): NetInfoState {
  return { isConnected } as NetInfoState;
}

describe("wireReactQueryToNative", () => {
  let unwire: () => void;

  beforeEach(() => {
    removeAppState.mockClear();
    removeNetInfo.mockClear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      emitAppState = listener;
      return { remove: removeAppState };
    });
    jest.mocked(NetInfo.addEventListener).mockImplementation((listener) => {
      emitNetInfo = listener;
      return removeNetInfo;
    });
    unwire = wireReactQueryToNative();
  });

  afterEach(() => {
    unwire();
    jest.restoreAllMocks();
  });

  it("app state active marks focused", () => {
    emitAppState("background");
    expect(focusManager.isFocused()).toBe(false);

    emitAppState("active");
    expect(focusManager.isFocused()).toBe(true);
  });

  it("inactive app state is not focused", () => {
    emitAppState("inactive");
    expect(focusManager.isFocused()).toBe(false);
  });

  it("netinfo offline marks offline", () => {
    emitNetInfo(netInfo(false));
    expect(onlineManager.isOnline()).toBe(false);

    emitNetInfo(netInfo(true));
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("an unknown connection state does not pause queries", () => {
    emitNetInfo(netInfo(false));
    emitNetInfo(netInfo(null));
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("the returned cleanup removes both native listeners and resets the managers", () => {
    emitAppState("background");
    emitNetInfo(netInfo(false));

    unwire();

    expect(removeAppState).toHaveBeenCalledTimes(1);
    expect(removeNetInfo).toHaveBeenCalledTimes(1);
    expect(focusManager.isFocused()).toBe(true);
    expect(onlineManager.isOnline()).toBe(true);
  });
});
