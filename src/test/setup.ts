import "react-native-gesture-handler/jestSetup";
import { setUpTests } from "react-native-reanimated";

setUpTests();

// Libraries that later tasks install are registered as virtual mocks, so this file loads (and the
// mock activates by itself) whether or not the package is in node_modules yet. The factories only
// run when something imports the library.
jest.mock("expo-secure-store", () => jest.requireActual("./mocks/secure-store"), { virtual: true });
jest.mock("expo-camera", () => jest.requireActual("./mocks/expo-camera"), { virtual: true });
jest.mock("expo-haptics", () => jest.requireActual("./mocks/expo-haptics"), { virtual: true });
jest.mock("expo-audio", () => jest.requireActual("./mocks/expo-audio"), { virtual: true });
jest.mock(
  "@react-native-community/netinfo",
  () => jest.requireActual("@react-native-community/netinfo/jest/netinfo-mock.js"),
  { virtual: true },
);
jest.mock("@gorhom/bottom-sheet", () => jest.requireActual("@gorhom/bottom-sheet/mock"), {
  virtual: true,
});

// FlashList ships a setup script that registers its own mock; run it once the package exists.
function isInstalled(moduleName: string): boolean {
  try {
    require.resolve(moduleName);
    return true;
  } catch {
    return false;
  }
}

if (isInstalled("@shopify/flash-list/jestSetup")) {
  jest.requireActual("@shopify/flash-list/jestSetup");
}
