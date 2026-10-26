/**
 * What a worker hears and feels after a scan: a short tone (expo-audio) and a vibration
 * (expo-haptics, N10 — the floor is loud and nobody looks at the screen). Both are fire-and-forget:
 * a phone without an audio session or a vibrator still scans, the colour and text of the feedback
 * remain, so every failure is swallowed (and logged in development only).
 *
 * Components reach this through `useScanFeedback`, which also applies the sound and vibration
 * switches of the account tab.
 */
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";

import scanErrorTone from "../../../assets/sounds/scan-error.wav";
import scanOkTone from "../../../assets/sounds/scan-ok.wav";

import type { AudioPlayer } from "expo-audio";

export type ScanTone = "positive" | "danger";

/** One scan's result: green and gone after a moment, or red until the next scan (as on the web). */
export type ScanFeedback = { tone: ScanTone; message: string };

/** 1046 Hz / 90 ms and 220 Hz / 320 ms, written by `scripts/generate-scan-tones.mjs`. */
const TONE_SOURCES: Record<ScanTone, number> = { positive: scanOkTone, danger: scanErrorTone };

const HAPTIC_TYPES: Record<ScanTone, NotificationFeedbackType> = {
  positive: NotificationFeedbackType.Success,
  danger: NotificationFeedbackType.Error,
};

// One player per tone, made on its first scan and kept for the life of the app (two tiny files):
// making a player per scan would load the file again each time.
const players = new Map<ScanTone, AudioPlayer>();

function report(what: string, error: unknown): void {
  if (__DEV__) console.warn(`Scan feedback: ${what}`, error);
}

// A beep is a UI sound: it plays over the music instead of pausing it. Without a mode expo-audio asks
// Android for transient audio focus, which stopped other apps' audio at every scan.
let audioModeSet = false;
function mixWithOtherAudio(): void {
  if (audioModeSet) return;
  audioModeSet = true;
  setAudioModeAsync({ interruptionMode: "mixWithOthers" }).catch((error: unknown) =>
    report("could not set the audio mode", error),
  );
}

export function playScanTone(tone: ScanTone): void {
  try {
    mixWithOtherAudio();
    let player = players.get(tone);
    if (player === undefined) {
      player = createAudioPlayer(TONE_SOURCES[tone]);
      players.set(tone, player);
    }
    // A player that has played once stays at its end: rewind it first, or it plays nothing.
    void player.seekTo(0).catch((error: unknown) => report("could not rewind the tone", error));
    player.play();
  } catch (error: unknown) {
    report("could not play the tone", error);
  }
}

export function scanHaptic(tone: ScanTone): void {
  try {
    void notificationAsync(HAPTIC_TYPES[tone]).catch((error: unknown) =>
      report("could not vibrate", error),
    );
  } catch (error: unknown) {
    report("could not vibrate", error);
  }
}
