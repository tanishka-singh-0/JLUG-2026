/**
 * The Media_Pipeline entry point (Requirements 12.2, 2.1).
 *
 * `npm run mascot:clips` — the single documented command that regenerates every
 * served mascot asset from the read-only sources in `assets/mascot/`.
 *
 *     npm run mascot:clips           full run: still + clips + manifest
 *     npm run mascot:clips:verify    --verify-only: toolchain check, then stop
 *     npm run mascot:clips:probe     --probe-segments: advisory probe, no writes
 *
 * ── What this module is ──────────────────────────────────────────────────────
 * The CLI layer, and nothing else. It sequences the five library modules in the
 * one order their headers agree on, reports what they raise, and owns every
 * `process.exit`:
 *
 *     ensureEncoder      resolve/install ffmpeg + ffprobe   (Requirement 2.1)
 *     probeAllSources    measure the Source_Videos          (Requirement 2.4)
 *     validateSegments   check SEGMENTS against those        (Requirements 3.3, 3.4)
 *     encodeAllClips     two-pass GIF encode + size ladder  (Requirements 4.1–4.7)
 *     writeManifest      still, measurements, generated .ts  (Requirements 1.1–1.4, 4.5, 4.8)
 *
 * The order is forced. `ensureEncoder` comes first because Requirement 2.1 says
 * the toolchain is verified *before any probing or encoding step runs*, and
 * because it is the only module that resolves binary paths — every other module
 * takes `ffmpegBin` / `ffprobeBin` as a parameter and never imports it. Probing
 * precedes validation because validation needs the measured durations. Validation
 * precedes encoding so a bad segment table costs no ffmpeg time. Encoding
 * precedes the manifest because the manifest records facts measured from the
 * files the encoder produced.
 *
 * ── What this module must not become ─────────────────────────────────────────
 * It re-implements nothing the five modules already do, and it declares no
 * tunable: every path, geometry value, frame rate, palette size and budget lives
 * in `clipPipelineConfig.mjs` (Requirement 12.3). If a behaviour needs changing,
 * it changes in the module that owns it, not here.
 *
 * ── Error vs. exit code ──────────────────────────────────────────────────────
 * Every library module *throws*; this file is where a throw becomes a status
 * code, so every failure branch propagates non-zero:
 *
 *   EncoderToolchainError  → reportEncoderFailure prints the failing command and
 *                            the manual install command      (Requirement 2.3)
 *   ClipSizeBudgetError    → clip id and its measured bytes   (Requirement 4.7)
 *   ClipBudgetError        → the measured combined total      (Requirement 4.5)
 *   anything else          → its message
 *
 * Plain Node ESM, no dependencies, no loader.
 */

import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  EncoderToolchainError,
  ensureEncoder,
  reportEncoderFailure,
} from "./ensureEncoder.mjs";
import { SEGMENTS } from "./clipPipelineConfig.mjs";
import { detectAllSegments } from "./detectSegments.mjs";
import { ClipSizeBudgetError, encodeAllClips } from "./encodeClips.mjs";
import { probeAllSources, validateSegments } from "./probeSources.mjs";
import { ClipBudgetError, writeManifest } from "./writeManifest.mjs";

/**
 * Recognised flags, so an unknown one is a typo rather than a silent full run.
 * Null-prototype, so an argument like `--constructor` cannot look up an inherited
 * property and be mistaken for a mode.
 */
export const MODE_FLAGS = Object.assign(Object.create(null), {
  "--verify-only": "verify-only",
  "--probe-segments": "probe-segments",
});

/**
 * Pick the run mode from argv. Exported and pure so the flag surface is
 * inspectable without running the pipeline.
 *
 * @param {readonly string[]} argv arguments after the script path
 * @returns {{ mode: "full"|"verify-only"|"probe-segments", unknown: string[] }}
 */
export function parseArgs(argv = []) {
  const unknown = [];
  let mode = "full";
  for (const arg of argv) {
    const known = MODE_FLAGS[arg];
    if (known) mode = known;
    else unknown.push(arg);
  }
  return { mode, unknown };
}

/**
 * Run the pipeline.
 *
 * Returns rather than exits, so the sequencing stays testable; the exit codes are
 * applied by the entry point below.
 *
 * @param {{ argv?: readonly string[], log?: (line: string) => void }} [options]
 * @returns {Promise<{ mode: string, clips?: object[], still?: object, totalBytes?: number, manifestPath?: string }>}
 */
export async function run(options = {}) {
  const { argv = process.argv.slice(2), log = console.log } = options;
  const { mode, unknown } = parseArgs(argv);

  if (unknown.length > 0) {
    throw new Error(
      `unrecognised argument(s): ${unknown.join(", ")}. Supported flags: ` +
        `${Object.keys(MODE_FLAGS).join(", ")}.`,
    );
  }

  // Requirement 2.1: the toolchain is verified before anything is probed.
  const { ffmpeg, ffprobe } = await ensureEncoder({ log });

  if (mode === "verify-only") {
    log("[pipeline] --verify-only: toolchain is invocable, nothing was written.");
    return { mode };
  }

  const factsBySource = await probeAllSources({ ffprobeBin: ffprobe, log });

  if (mode === "probe-segments") {
    // Advisory only. `detectAllSegments` writes nothing — not the config, not a
    // temp file, not a clip — so boundary selection stays a human decision and
    // reruns of the encode step keep reproducing identical cuts.
    await detectAllSegments({
      ffmpegBin: ffmpeg,
      durationsBySource: Object.fromEntries(
        Object.entries(factsBySource).map(([key, facts]) => [key, facts.durationS]),
      ),
      log,
    });
    return { mode };
  }

  validateSegments(SEGMENTS, factsBySource);
  log(`[pipeline] segment table is valid: ${SEGMENTS.length} segment(s)`);

  const clips = await encodeAllClips({ ffmpegBin: ffmpeg, factsBySource, log });

  const result = await writeManifest(
    clips.map((clip) => ({ id: clip.id, path: clip.outputPath })),
    { ffmpegBin: ffmpeg, ffprobeBin: ffprobe, log },
  );

  return { mode, ...result };
}

/**
 * Print a failure the way the requirement that owns it asks for, then hand back
 * the status code. Exported so the reporting is inspectable on its own.
 *
 * @param {unknown} error
 * @param {(line: string) => void} [logError]
 * @returns {number} the process exit code to use — always non-zero
 */
export function reportFailure(error, logError = console.error) {
  if (error instanceof EncoderToolchainError) {
    // Requirement 2.3: failing command plus the manual installation command.
    reportEncoderFailure(error, logError);
    return 1;
  }

  logError(error instanceof Error ? error.message : String(error));

  if (error instanceof ClipSizeBudgetError) {
    // Requirement 4.7: the clip id and its measured size.
    logError(
      `[pipeline] clip "${error.clipId}" measured ${error.bytes} bytes against a ` +
        `${error.maxBytes}-byte per-clip budget.`,
    );
  } else if (error instanceof ClipBudgetError) {
    // Requirement 4.5: the measured combined total.
    logError(
      `[pipeline] combined clip size measured ${error.totalBytes} bytes against a ` +
        `${error.maxTotalBytes}-byte total budget.`,
    );
  }

  return 1;
}

/* ───────────────────────────────── entry point ───────────────────────────── */

/**
 * Guarded the same way the library modules guard theirs, so importing this file
 * to inspect `parseArgs` or `reportFailure` cannot kick off an encode.
 */
const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    await run();
    // Success leaves the exit code at 0 by falling off the end rather than
    // calling process.exit, which can truncate buffered stdout on Windows.
  } catch (error) {
    process.exitCode = reportFailure(error);
  }
}
