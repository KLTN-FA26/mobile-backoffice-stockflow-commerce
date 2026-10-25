import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import type * as AudioMock from "./mocks/expo-audio";
import type * as CameraMock from "./mocks/expo-camera";
import type * as HapticsMock from "./mocks/expo-haptics";
import type * as KvStoreMock from "./mocks/kv-store";
import type * as SecureStoreMock from "./mocks/secure-store";
import type * as SonnerMock from "./mocks/sonner-native";

// The libraries below are installed by later tasks, so they are loaded by name (and typed from the
// mock files) instead of imported.
describe("jest setup", () => {
  it("renders text", async () => {
    await render(<Text>ok</Text>);
    expect(screen.getByText("ok")).toBeTruthy();
  });

  it("maps expo-sqlite/kv-store to the in-memory store", () => {
    const { Storage } = jest.requireActual<typeof KvStoreMock>("expo-sqlite/kv-store");
    Storage.setItemSync("smoke:key", "1");
    expect(Storage.getItemSync("smoke:key")).toBe("1");
    expect(Storage.getAllKeysSync()).toEqual(["smoke:key"]);
    expect(Storage.removeItemSync("smoke:key")).toBe(true);
    expect(Storage.getItemSync("smoke:key")).toBeNull();
    Storage.clearSync();
  });

  it("registers the expo-secure-store mock", async () => {
    const SecureStore = jest.requireMock<typeof SecureStoreMock>("expo-secure-store");
    await SecureStore.setItemAsync("token", "abc");
    expect(await SecureStore.getItemAsync("token")).toBe("abc");
    await SecureStore.deleteItemAsync("token");
    expect(await SecureStore.getItemAsync("token")).toBeNull();
  });

  it("lets a test drive the camera permission", async () => {
    const Camera = jest.requireMock<typeof CameraMock>("expo-camera");
    function Probe() {
      const [permission] = Camera.useCameraPermissions();
      return (
        <>
          <Text>{permission === null ? "loading" : `granted:${permission.granted}`}</Text>
          <Camera.CameraView />
        </>
      );
    }

    await render(<Probe />);
    expect(screen.getByText("loading")).toBeTruthy();
    expect(screen.getByTestId("camera-view")).toBeTruthy();

    await act(async () => {
      Camera.__setCameraPermission({ granted: false, canAskAgain: false });
    });
    expect(screen.getByText("granted:false")).toBeTruthy();

    await act(async () => {
      Camera.__setCameraPermission({ granted: true });
    });
    expect(screen.getByText("granted:true")).toBeTruthy();
  });

  it("registers spies for expo-haptics and expo-audio", async () => {
    const Haptics = jest.requireMock<typeof HapticsMock>("expo-haptics");
    const Audio = jest.requireMock<typeof AudioMock>("expo-audio");

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");

    const player = Audio.createAudioPlayer();
    await player.seekTo(0);
    player.play();
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("registers spies for sonner-native", () => {
    const { Toaster, toast } = jest.requireMock<typeof SonnerMock>("sonner-native");

    toast.success("saved", { description: "details" });

    expect(toast.success).toHaveBeenCalledWith("saved", { description: "details" });
    expect(jest.isMockFunction(Toaster)).toBe(true);
  });
});
