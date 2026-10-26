#!/usr/bin/env node
// Writes the two scan tones as WAV files (PCM 16-bit mono): a short high beep for a good scan and a
// long low one for a wrong scan, the same frequencies and lengths the web scan station synthesises
// with Web Audio (`use-scan-tone.ts`). expo-audio plays files, so the app ships them pre-rendered.
// Run: `node scripts/generate-scan-tones.mjs [outDir]` (default: the app's assets/sounds, found from
// this script's own location, so the working directory does not matter).
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isMainModule } from "./is-main-module.mjs";

/** `<repo>/assets/sounds`, where the app imports the tones from. */
export const DEFAULT_OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "sounds",
);

export const SCAN_TONES = [
  { file: "scan-ok.wav", frequency: 1046, durationMs: 90 },
  { file: "scan-error.wav", frequency: 220, durationMs: 320 },
];

const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const FULL_SCALE = 32767;

/**
 * A sine tone that starts at `amplitude` (of full scale) and fades linearly to silence on its last
 * sample, so it ends without a click.
 * @param {{ frequency: number, durationMs: number, sampleRate?: number, amplitude?: number }} tone
 * @returns {Buffer}
 */
export function makeToneWav({ frequency, durationMs, sampleRate = 44100, amplitude = 0.08 }) {
  if (!(frequency > 0) || !(durationMs > 0) || !(sampleRate > 0)) {
    throw new RangeError("frequency, durationMs and sampleRate must be positive");
  }
  if (!(amplitude > 0 && amplitude <= 1)) throw new RangeError("amplitude must be in (0, 1]");

  const sampleCount = Math.round((sampleRate * durationMs) / 1000);
  const dataBytes = sampleCount * BYTES_PER_SAMPLE;
  const wav = Buffer.alloc(HEADER_BYTES + dataBytes);

  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16); // fmt chunk size
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * BYTES_PER_SAMPLE, 28); // byte rate
  wav.writeUInt16LE(BYTES_PER_SAMPLE, 32); // block align
  wav.writeUInt16LE(16, 34); // bits per sample
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataBytes, 40);

  const lastIndex = Math.max(sampleCount - 1, 1);
  for (let i = 0; i < sampleCount; i += 1) {
    const envelope = 1 - i / lastIndex;
    const value = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude * envelope;
    wav.writeInt16LE(Math.round(value * FULL_SCALE), HEADER_BYTES + i * BYTES_PER_SAMPLE);
  }
  return wav;
}

/** Writes every tone of `SCAN_TONES` into `outDir` (created when missing). */
export function writeScanTones(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const { file, frequency, durationMs } of SCAN_TONES) {
    fs.writeFileSync(path.join(outDir, file), makeToneWav({ frequency, durationMs }));
  }
}

if (isMainModule(import.meta.url)) {
  const outDir = process.argv[2] === undefined ? DEFAULT_OUT_DIR : path.resolve(process.argv[2]);
  writeScanTones(outDir);
  console.log(
    `generate-scan-tones: wrote ${SCAN_TONES.map(({ file }) => file).join(", ")} to ${outDir}`,
  );
}
