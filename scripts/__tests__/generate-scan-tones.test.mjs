import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_OUT_DIR,
  SCAN_TONES,
  makeToneWav,
  writeScanTones,
} from "../generate-scan-tones.mjs";

const HEADER_BYTES = 44;
const FULL_SCALE = 32767;

function samples(wav) {
  const values = [];
  for (let offset = HEADER_BYTES; offset < wav.length; offset += 2) {
    values.push(wav.readInt16LE(offset));
  }
  return values;
}

describe("makeToneWav", () => {
  it("wav header is riff pcm mono 16-bit", () => {
    const wav = makeToneWav({ frequency: 1046, durationMs: 90 });

    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.readUInt32LE(4), wav.length - 8);
    assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.equal(wav.toString("ascii", 12, 16), "fmt ");
    assert.equal(wav.readUInt32LE(16), 16, "fmt chunk size");
    assert.equal(wav.readUInt16LE(20), 1, "PCM");
    assert.equal(wav.readUInt16LE(22), 1, "mono");
    assert.equal(wav.readUInt32LE(24), 44100, "sample rate");
    assert.equal(wav.readUInt32LE(28), 44100 * 2, "byte rate");
    assert.equal(wav.readUInt16LE(32), 2, "block align");
    assert.equal(wav.readUInt16LE(34), 16, "bits per sample");
    assert.equal(wav.toString("ascii", 36, 40), "data");
    assert.equal(wav.readUInt32LE(40), wav.length - HEADER_BYTES);
  });

  it("sample count matches duration", () => {
    // 90 ms × 44100 Hz = 3969 samples of 2 bytes.
    assert.equal(samples(makeToneWav({ frequency: 1046, durationMs: 90 })).length, 3969);
    assert.equal(
      samples(makeToneWav({ frequency: 220, durationMs: 320, sampleRate: 8000 })).length,
      2560,
    );
  });

  it("stays under the amplitude and fades linearly to silence", () => {
    const values = samples(makeToneWav({ frequency: 220, durationMs: 320 }));
    const peak = Math.max(...values.map(Math.abs));

    assert.ok(peak <= Math.round(0.08 * FULL_SCALE), `peak ${peak} above the 0.08 default`);
    assert.ok(peak > 0.07 * FULL_SCALE, `peak ${peak} far under the 0.08 default`);
    assert.equal(values.at(-1), 0);
    const firstHalf = Math.max(...values.slice(0, values.length / 2).map(Math.abs));
    const lastTenth = Math.max(...values.slice((values.length * 9) / 10).map(Math.abs));
    assert.ok(lastTenth < firstHalf / 4, "the tone does not fade out");
  });

  it("rejects a tone that cannot be written", () => {
    assert.throws(() => makeToneWav({ frequency: 0, durationMs: 90 }), RangeError);
    assert.throws(() => makeToneWav({ frequency: 1046, durationMs: 0 }), RangeError);
    assert.throws(() => makeToneWav({ frequency: 1046, durationMs: 90, amplitude: 2 }), RangeError);
  });
});

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = path.join(REPO, "scripts");

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("the committed tones", () => {
  // Read-only: asserts what ships in the app, and never writes into assets/sounds.
  for (const { file, frequency, durationMs } of SCAN_TONES) {
    it(`${file} is exactly what makeToneWav renders`, () => {
      assert.deepEqual(
        fs.readFileSync(path.join(DEFAULT_OUT_DIR, file)),
        makeToneWav({ frequency, durationMs }),
      );
    });
  }
});

describe("DEFAULT_OUT_DIR", () => {
  it("is the app's assets/sounds, found from the script and not from the working directory", () => {
    assert.equal(DEFAULT_OUT_DIR, path.join(REPO, "assets", "sounds"));
  });
});

describe("the CLI", () => {
  it("writes the tones into the directory it is given, not into the working directory", () => {
    const cwd = tempDir("scan-tones-cwd-");
    const outDir = tempDir("scan-tones-out-");
    try {
      const run = spawnSync(
        process.execPath,
        [path.join(SCRIPTS, "generate-scan-tones.mjs"), outDir],
        {
          cwd,
          encoding: "utf8",
        },
      );
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(fs.readdirSync(cwd), []);
      assert.deepEqual(fs.readdirSync(outDir).sort(), ["scan-error.wav", "scan-ok.wav"]);
      assert.ok(run.stdout.includes(outDir), run.stdout);
      assert.deepEqual(
        fs.readFileSync(path.join(outDir, "scan-ok.wav")),
        makeToneWav({ frequency: 1046, durationMs: 90 }),
      );
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("without a directory writes to assets/sounds next to its own folder, wherever it is run from", () => {
    // A copy of the script in <temp>/scripts, so the default lands in <temp>/assets/sounds and the
    // committed files are never touched.
    const temp = tempDir("scan-tones-default-");
    const cwd = tempDir("scan-tones-elsewhere-");
    try {
      fs.mkdirSync(path.join(temp, "scripts"));
      for (const file of ["generate-scan-tones.mjs", "is-main-module.mjs"]) {
        fs.copyFileSync(path.join(SCRIPTS, file), path.join(temp, "scripts", file));
      }
      const run = spawnSync(
        process.execPath,
        [path.join(temp, "scripts", "generate-scan-tones.mjs")],
        {
          cwd,
          encoding: "utf8",
        },
      );
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(fs.readdirSync(cwd), []);
      assert.deepEqual(fs.readdirSync(path.join(temp, "assets", "sounds")).sort(), [
        "scan-error.wav",
        "scan-ok.wav",
      ]);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("still runs when node is started through a link to the scripts folder", () => {
    const temp = tempDir("scan-tones-link-");
    const outDir = path.join(temp, "out");
    try {
      // A junction works without admin rights on Windows; elsewhere the type is ignored.
      fs.symlinkSync(SCRIPTS, path.join(temp, "link"), "junction");
      const run = spawnSync(
        process.execPath,
        [path.join(temp, "link", "generate-scan-tones.mjs"), outDir],
        { cwd: temp, encoding: "utf8" },
      );
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(fs.readdirSync(outDir).sort(), ["scan-error.wav", "scan-ok.wav"]);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});

describe("writeScanTones", () => {
  it("writes the ok and error tones of the web scan station", () => {
    assert.deepEqual(SCAN_TONES, [
      { file: "scan-ok.wav", frequency: 1046, durationMs: 90 },
      { file: "scan-error.wav", frequency: 220, durationMs: 320 },
    ]);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-tones-"));
    try {
      writeScanTones(dir);
      assert.deepEqual(fs.readdirSync(dir).sort(), ["scan-error.wav", "scan-ok.wav"]);
      assert.deepEqual(
        fs.readFileSync(path.join(dir, "scan-ok.wav")),
        makeToneWav({ frequency: 1046, durationMs: 90 }),
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
