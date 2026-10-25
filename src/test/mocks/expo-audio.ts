// Stand-in for `expo-audio` (registered in src/test/setup.ts). Every player is a bundle of spies.
export const createAudioPlayer = jest.fn((_source?: unknown) => ({
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(async (_seconds?: number) => {}),
  remove: jest.fn(),
}));

export const useAudioPlayer = jest.fn((source?: unknown) => createAudioPlayer(source));
export const setAudioModeAsync = jest.fn(async (_mode?: unknown) => {});
