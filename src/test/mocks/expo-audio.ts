// Stand-in for `expo-audio` (registered in src/test/setup.ts). Every player is a bundle of spies, and
// every player's `play` also reports to `__played`: an app that caches its players across tests
// (as the scan tones do) can still be checked with one spy that `jest.clearAllMocks()` resets.
export const __played = jest.fn((_source?: unknown) => undefined);

export const createAudioPlayer = jest.fn((source?: unknown) => ({
  play: jest.fn(() => __played(source)),
  pause: jest.fn(),
  seekTo: jest.fn(async (_seconds?: number) => {}),
  remove: jest.fn(),
}));

export const useAudioPlayer = jest.fn((source?: unknown) => createAudioPlayer(source));
export const setAudioModeAsync = jest.fn(async (_mode?: unknown) => {});
