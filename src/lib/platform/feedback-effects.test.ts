/**
 * The scan tone and vibration. Each test loads a fresh copy of the module, so the players it caches
 * start empty; the library mocks come from src/test/setup.ts.
 */
import type * as FeedbackEffects from "./feedback-effects";
import type * as AudioMock from "@/test/mocks/expo-audio";
import type * as HapticsMock from "@/test/mocks/expo-haptics";

function load() {
  jest.resetModules();
  return {
    effects: jest.requireActual<typeof FeedbackEffects>("./feedback-effects"),
    audio: jest.requireMock<typeof AudioMock>("expo-audio"),
    haptics: jest.requireMock<typeof HapticsMock>("expo-haptics"),
  };
}

type Player = ReturnType<typeof AudioMock.createAudioPlayer>;

function createdPlayers(audio: typeof AudioMock): Player[] {
  return audio.createAudioPlayer.mock.results.map(({ value }) => value);
}

let warn: jest.SpyInstance;

beforeEach(() => {
  warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("playScanTone", () => {
  it("mixes the tone with other audio instead of taking the audio focus", () => {
    // Without a mode expo-audio asks Android for transient focus: every scan paused the music.
    const { effects, audio } = load();
    expect(audio.setAudioModeAsync).not.toHaveBeenCalled();

    effects.playScanTone("positive");
    effects.playScanTone("danger");

    expect(audio.setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(audio.setAudioModeAsync).toHaveBeenCalledWith({ interruptionMode: "mixWithOthers" });
    // Set before the first player exists, so the very first tone already mixes.
    expect(audio.setAudioModeAsync.mock.invocationCallOrder[0]).toBeLessThan(
      audio.createAudioPlayer.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("still plays when the audio mode cannot be set", async () => {
    const { effects, audio } = load();
    audio.setAudioModeAsync.mockRejectedValueOnce(new Error("no audio session"));

    effects.playScanTone("positive");
    await Promise.resolve();

    expect(audio.__played).toHaveBeenCalled();
  });

  it("creates one player per tone, lazily, and rewinds it before each play", () => {
    const { effects, audio } = load();
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();

    effects.playScanTone("positive");
    effects.playScanTone("positive");
    effects.playScanTone("danger");

    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(2);
    const [positive, danger] = createdPlayers(audio);
    expect(positive?.play).toHaveBeenCalledTimes(2);
    expect(positive?.seekTo).toHaveBeenCalledWith(0);
    expect(danger?.play).toHaveBeenCalledTimes(1);
    // Rewound first: a finished player would otherwise stay at its end and play nothing.
    const seekOrder = positive?.seekTo.mock.invocationCallOrder[0] ?? Infinity;
    const playOrder = positive?.play.mock.invocationCallOrder[0] ?? -Infinity;
    expect(seekOrder).toBeLessThan(playOrder);
  });

  it("swallows a player that cannot be created", () => {
    const { effects, audio } = load();
    audio.createAudioPlayer.mockImplementationOnce(() => {
      throw new Error("no audio session");
    });

    expect(() => effects.playScanTone("danger")).not.toThrow();
    expect(warn).toHaveBeenCalled();

    // The next scan tries again.
    effects.playScanTone("danger");
    expect(audio.__played).toHaveBeenCalledTimes(1);
  });

  it("swallows a failed rewind", async () => {
    const { effects, audio } = load();
    effects.playScanTone("positive");
    const [player] = createdPlayers(audio);
    player?.seekTo.mockRejectedValueOnce(new Error("released"));

    expect(() => effects.playScanTone("positive")).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalled();
  });
});

describe("scanHaptic", () => {
  it("vibrates success for positive and error for danger", () => {
    const { effects, haptics } = load();

    effects.scanHaptic("positive");
    effects.scanHaptic("danger");

    expect(haptics.notificationAsync.mock.calls).toEqual([["success"], ["error"]]);
  });

  it("swallows a haptic failure", async () => {
    const { effects, haptics } = load();
    haptics.notificationAsync.mockRejectedValueOnce(new Error("no vibrator"));

    expect(() => effects.scanHaptic("danger")).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalled();
  });
});
