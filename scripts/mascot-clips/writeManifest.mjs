/**
 * Output ingestion and manifest emission (Requirements 1.1–1.4, 4.5, 4.8, 12.4).
 *
 * Responsibilities, and nothing else:
 *   - render the Source_Still into the served tree under a kebab-case name
 *     (Requirement 1.1) by cropping STILL_CROP_RECT out of it and scaling that
 *     square to OUTPUT_HEIGHT_PX, leaving the read-only sources untouched
 *     (Requirement 1.3)
 *   - log `overwrite: <path>` before replacing anything that already exists
 *     (Requirement 1.4)
 *   - re-probe every produced GIF and `fs.stat` its bytes, so the manifest records
 *     *measured* facts rather than the values the encoder was asked for
 *   - check the summed clip size against MAX_TOTAL_BYTES (Requirement 4.5)
 *   - print file name, duration, pixel dimensions and byte size per clip
 *     (Requirement 4.8)
 *   - emit `navbarMascotClipManifest.generated.ts`, entries sorted by clip id and
 *     formatted deterministically so an unchanged rerun rewrites a byte-identical
 *     file (Requirement 12.4)
 *
 * ── What this module deliberately does NOT do ────────────────────────────────
 * Per-clip budget enforcement (MAX_CLIP_BYTES, Requirements 4.4/4.6/4.7) belongs
 * to `encodeClips.mjs`, which owns the quality ladder. This module measures and
 * reports, and only the *combined* budget is its call. It encodes no *clip*
 * either: the produced clips arrive as a parameter (`[{ id, path }]`), never by
 * importing the encoder, so `generate-mascot-clips.mjs` is the only place the two
 * meet. The single ffmpeg run it does own is the still's crop-and-scale, which
 * has no ladder, no palette and no budget.
 *
 * ── Error vs. exit code (documented split, matching ensureEncoder.mjs) ───────
 * The library functions *throw*. `ClipBudgetError` carries `totalBytes`,
 * `maxTotalBytes` and the measured per-clip breakdown so a caller can print the
 * numbers Requirement 4.5 asks for. `process.exit(1)` is owned by the CLI layer:
 * `generate-mascot-clips.mjs`, and this module's own direct-run entry point at
 * the bottom, which exists so the exit-code behaviour is verifiable on its own.
 *
 * ── Binary-resolution contract (same as probeSources.mjs) ────────────────────
 * This module never resolves ffprobe or ffmpeg itself and never imports
 * `ensureEncoder.mjs`. Every entry point takes optional `ffprobeBin` / `ffmpegBin`
 * defaulting to the bare commands. The orchestrator is expected to do:
 *
 *     const { ffmpeg, ffprobe } = await ensureEncoder();
 *     await writeManifest(encodedClips, { ffmpegBin: ffmpeg, ffprobeBin: ffprobe });
 *
 * A bare `ffprobe` does not resolve in-process on this machine when ffmpeg was
 * installed by winget during the same run, so callers must pass the resolved path.
 *
 * ── Tunables ────────────────────────────────────────────────────────────────
 * `clipPipelineConfig.mjs` is the single source of truth (Requirement 12.3). This
 * module imports STILL_SOURCE, STILL_CROP_RECT, STILL_OUTPUT, OUTPUT_HEIGHT_PX,
 * SOURCE_DIR, CLIP_OUTPUT_DIR, MANIFEST_OUTPUT and MAX_TOTAL_BYTES from there and
 * declares no tunable of its own.
 *
 * Plain Node ESM, no dependencies, no loader.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  CLIP_OUTPUT_DIR,
  MANIFEST_OUTPUT,
  MAX_TOTAL_BYTES,
  OUTPUT_HEIGHT_PX,
  SOURCE_DIR,
  STILL_CROP_RECT,
  STILL_OUTPUT,
  STILL_SOURCE,
} from "./clipPipelineConfig.mjs";
import {
  buildProbeArgs,
  parseFrameRate,
  parseNumericField,
} from "./probeSources.mjs";

const execFileAsync = promisify(execFile);

/** Bare commands used when the caller does not hand us resolved paths. */
export const DEFAULT_FFPROBE_BIN = "ffprobe";
export const DEFAULT_FFMPEG_BIN = "ffmpeg";

/**
 * Downscale filter for the still. Not a media tunable — the same resampler
 * `encodeClips.mjs` uses for the clips, named here so the still and the clips
 * cannot drift apart in sharpness across the swap.
 */
const STILL_SCALE_FLAGS = "lanczos";

/**
 * Requirements 1.1 / 1.2: lowercase letters, digits and hyphens only, plus the
 * extension. Not a tunable — it is the requirement, restated as a predicate.
 */
const KEBAB_CASE_FILE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+$/;

/**
 * @typedef {object} ProducedClip
 * @property {string} id   clip id from the SEGMENTS table
 * @property {string} path path to the encoded GIF, absolute or repo-relative
 */

/**
 * @typedef {object} ClipManifestEntry
 * @property {string} id
 * @property {string} path       served URL path, e.g. /assets/mascot/clips/x.gif
 * @property {number} width      measured pixels
 * @property {number} height     measured pixels
 * @property {number} durationMs measured duration, rounded to a whole millisecond
 * @property {number} fps        measured average frame rate
 * @property {number} bytes      measured file size
 */

/**
 * Thrown when the combined clip size exceeds the budget (Requirement 4.5).
 * Carries the measured total so the CLI can print it before exiting non-zero.
 */
export class ClipBudgetError extends Error {
  constructor(message, { totalBytes, maxTotalBytes, clips = [] } = {}) {
    super(message);
    this.name = "ClipBudgetError";
    /** Summed byte size of every measured clip. */
    this.totalBytes = totalBytes;
    /** The budget that was exceeded. */
    this.maxTotalBytes = maxTotalBytes;
    /** Per-clip breakdown, so the report is actionable. */
    this.clips = clips;
  }
}

/* ────────────────────────────── pure helpers ────────────────────────────── */

/**
 * Repo-relative path with forward slashes, for log lines that stay readable and
 * identical across platforms. A path outside the repo (a temp directory, say) is
 * reported absolute rather than as a chain of `../`, so `overwrite:` lines always
 * name something a human can find.
 *
 * @param {string} absPath
 * @param {string} cwd
 * @returns {string}
 */
export function repoRelative(absPath, cwd = process.cwd()) {
  const rel = path.relative(cwd, absPath);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return absPath;
  return rel.split(path.sep).join("/");
}

/**
 * Map a file inside `public/` to the URL path the browser requests. Deriving it
 * instead of hand-writing it is what keeps the manifest honest when
 * CLIP_OUTPUT_DIR or STILL_OUTPUT moves.
 *
 * @param {string} absPath
 * @param {string} [cwd]
 * @returns {string}
 */
export function servedPathFor(absPath, cwd = process.cwd()) {
  const publicRoot = path.resolve(cwd, "public");
  const rel = path.relative(publicRoot, absPath);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `cannot derive a served path for "${absPath}": it is not inside ` +
        `"${publicRoot}". Check STILL_OUTPUT / CLIP_OUTPUT_DIR in clipPipelineConfig.mjs.`,
    );
  }
  return `/${rel.split(path.sep).join("/")}`;
}

/**
 * Requirements 1.1 and 1.2 hold only if the *configured* names are kebab-case,
 * so they are checked rather than assumed.
 *
 * @param {string} absPath
 * @param {string} expectedExt e.g. ".gif"
 * @param {string} what human label used in the failure message
 */
export function assertKebabCaseFileName(absPath, expectedExt, what) {
  const fileName = path.basename(absPath);
  if (!KEBAB_CASE_FILE_NAME.test(fileName)) {
    throw new Error(
      `${what} file name "${fileName}" is not kebab-case; Requirements 1.1/1.2 ` +
        `allow lowercase letters, digits and hyphens only.`,
    );
  }
  if (path.extname(fileName) !== expectedExt) {
    throw new Error(
      `${what} file name "${fileName}" must end in "${expectedExt}".`,
    );
  }
}

/**
 * Normalise one ffprobe JSON payload for a *produced* file.
 *
 * Rational frame rates and ffprobe's "N/A" are handled by `parseFrameRate` /
 * `parseNumericField` from `probeSources.mjs`; this function only decides what
 * counts as a usable measurement for a manifest entry.
 *
 * @param {string} stdout
 * @param {string} label used in failure messages, typically the clip id
 * @returns {{ width: number|null, height: number|null, containerFps: number|null, nbFrames: number|null, durationS: number|null }}
 */
export function parseMediaProbe(stdout, label) {
  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    throw new Error(`ffprobe returned unparseable JSON for ${label}.`);
  }

  const stream = Array.isArray(payload?.streams) ? payload.streams[0] : undefined;
  if (!stream) {
    throw new Error(`ffprobe found no video stream in ${label}.`);
  }

  return {
    width: parseNumericField(stream.width),
    height: parseNumericField(stream.height),
    containerFps: parseFrameRate(stream.r_frame_rate),
    nbFrames: parseNumericField(stream.nb_frames),
    durationS: parseNumericField(payload?.format?.duration),
  };
}

/**
 * The frame rate to record for a GIF.
 *
 * A GIF has no single declared rate: ffprobe's `r_frame_rate` is derived from the
 * *smallest* inter-frame delay, so with any delay variation it overstates what
 * plays. Frames ÷ duration is the rate the viewer actually sees, so it is
 * preferred and `r_frame_rate` is only the fallback. Rounded to two decimals so
 * the emitted file is byte-stable (Requirement 12.4).
 *
 * @param {{ containerFps: number|null, nbFrames: number|null, durationS: number|null }} probe
 * @returns {number|null}
 */
export function measuredFps(probe) {
  const { containerFps, nbFrames, durationS } = probe;
  if (nbFrames !== null && nbFrames > 0 && durationS !== null && durationS > 0) {
    return roundTo(nbFrames / durationS, 2);
  }
  return containerFps === null ? null : roundTo(containerFps, 2);
}

/**
 * Duration as a whole number of milliseconds.
 *
 * GIF frame delays are quantised to centiseconds, so a measured duration differs
 * slightly from the requested segment length. The measured value is what gets
 * recorded — the playback engine times activation off it, so it must describe the
 * file, not the intent.
 *
 * @param {{ durationS: number|null, nbFrames: number|null, containerFps: number|null }} probe
 * @returns {number|null}
 */
export function measuredDurationMs(probe) {
  if (probe.durationS !== null && probe.durationS > 0) {
    return Math.round(probe.durationS * 1000);
  }
  // Some GIF writers omit format.duration; frames ÷ rate still describes the file.
  if (
    probe.nbFrames !== null &&
    probe.nbFrames > 0 &&
    probe.containerFps !== null &&
    probe.containerFps > 0
  ) {
    return Math.round((probe.nbFrames / probe.containerFps) * 1000);
  }
  return null;
}

/** @param {number} value @param {number} digits */
function roundTo(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Integers stay integers; fractions lose trailing zeros. Deterministic either way. */
function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(roundTo(value, 2));
}

/** Byte counts are only ever printed, never emitted, so KB rounding is cosmetic. */
function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Sort by clip id. Extracted so the emitter and any test agree on the ordering
 * that makes the generated file byte-stable (Requirement 12.4).
 *
 * @param {readonly ClipManifestEntry[]} entries
 * @returns {ClipManifestEntry[]}
 */
export function sortByClipId(entries) {
  // Explicit codepoint comparison: localeCompare is locale-sensitive, and a
  // generated file that reorders with the machine's locale is not reproducible.
  return [...entries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Render the generated TypeScript module. Pure, so determinism is testable
 * without touching ffprobe or the filesystem. Contains no timestamp, no absolute
 * path and no run-dependent value — the only inputs are measured facts.
 *
 * @param {{ clips: readonly ClipManifestEntry[], still: { path: string, width: number, height: number } }} input
 * @returns {string}
 */
export function formatManifestModule({ clips, still }) {
  const entries = sortByClipId(clips)
    .map((clip) =>
      [
        "  {",
        `    id: ${JSON.stringify(clip.id)},`,
        `    path: ${JSON.stringify(clip.path)},`,
        `    width: ${formatNumber(clip.width)},`,
        `    height: ${formatNumber(clip.height)},`,
        `    durationMs: ${formatNumber(clip.durationMs)},`,
        `    fps: ${formatNumber(clip.fps)},`,
        `    bytes: ${formatNumber(clip.bytes)},`,
        "  },",
      ].join("\n"),
    )
    .join("\n");

  return `// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Written by \`npm run mascot:clips\` (scripts/mascot-clips/writeManifest.mjs).
// Every value below is measured from the produced file with ffprobe and fs.stat,
// never copied from the encoder's request, so dimensions and timings cannot drift
// away from the bytes actually served.
//
// To change a clip: edit SEGMENTS in scripts/mascot-clips/clipPipelineConfig.mjs
// and re-run the command. Entries are sorted by clip id, so an unchanged config
// rewrites this file byte-for-byte identically.
//
// Clip roles and human labels are NOT here: they are authored in
// ./navbarMascotClips.ts, which maps these measurements through a role table.

export const NAVBAR_MASCOT_CLIP_MANIFEST = [
${entries}
] as const;

export const NAVBAR_MASCOT_STILL_MANIFEST = {
  path: ${JSON.stringify(still.path)},
  width: ${formatNumber(still.width)},
  height: ${formatNumber(still.height)},
} as const;
`;
}

/**
 * One report line per clip carrying the four facts Requirement 4.8 demands: file
 * name, duration, pixel dimensions and byte size.
 *
 * @param {ClipManifestEntry} clip
 * @returns {string}
 */
export function formatClipReport(clip) {
  return [
    `clip ${clip.id}:`,
    path.posix.basename(clip.path),
    `${clip.width}x${clip.height} px`,
    `${(clip.durationMs / 1000).toFixed(3)} s (${clip.durationMs} ms)`,
    `${formatNumber(clip.fps)} fps`,
    `${clip.bytes} bytes (${formatKb(clip.bytes)})`,
  ].join(" ");
}

/* ─────────────────────────── filesystem + ffprobe ────────────────────────── */

/**
 * Probe any media file. `execFile` takes an argv array, so a path containing
 * spaces and commas — such as the Source_Still — needs no quoting and can never
 * be re-split by a shell.
 *
 * @param {string} absPath
 * @param {string} label used in failure messages
 * @param {{ ffprobeBin?: string }} [options]
 */
export async function probeMediaFile(absPath, label, options = {}) {
  const { ffprobeBin = DEFAULT_FFPROBE_BIN } = options;
  const args = buildProbeArgs(absPath);

  let stdout;
  try {
    ({ stdout } = await execFileAsync(ffprobeBin, args, {
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    }));
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.message || String(error);
    throw new Error(
      `ffprobe failed for ${label} (${absPath}):\n  ${detail}\n` +
        `  command: ${ffprobeBin} ${args.join(" ")}`,
    );
  }

  return parseMediaProbe(stdout, label);
}

/**
 * Create a directory and log an `overwrite: <path>` line when the target file is
 * already there (Requirement 1.4). Returns true when it existed.
 *
 * @param {string} absPath
 * @param {{ cwd?: string, log?: (line: string) => void }} [options]
 */
async function prepareWriteTarget(absPath, options = {}) {
  const { cwd = process.cwd(), log = console.log } = options;
  await fsp.mkdir(path.dirname(absPath), { recursive: true });
  const existed = fs.existsSync(absPath);
  if (existed) log(`overwrite: ${repoRelative(absPath, cwd)}`);
  return existed;
}

/**
 * The exact ffmpeg argument vector that renders the served still, exported so it
 * can be asserted on without spawning anything.
 *
 * `crop` precedes `scale` for the same reason it does in `encodeClips.mjs`: the
 * 96 px of output has to be spent on one pose rather than on the whole sprite
 * sheet. The crop rect is square, so `scale=-2:<heightPx>` resolves to
 * `heightPx x heightPx` — the square output is derived from the rect rather than
 * hard-coded here.
 *
 * @param {{ sourcePath: string, outputPath: string, cropRect?: object, heightPx?: number }} params
 * @returns {string[]} argv after the binary name
 */
export function buildStillArgs({
  sourcePath,
  outputPath,
  cropRect = STILL_CROP_RECT,
  heightPx = OUTPUT_HEIGHT_PX,
}) {
  const chain = [
    `crop=${cropRect.width}:${cropRect.height}:${cropRect.x}:${cropRect.y}`,
    `scale=-2:${heightPx}:flags=${STILL_SCALE_FLAGS}`,
  ].join(",");
  return [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    sourcePath,
    "-vf",
    chain,
    "-frames:v",
    "1",
    outputPath,
  ];
}

/**
 * Render the served fallback still out of the Source_Still and measure it
 * (Requirements 1.1, 1.3, 1.4).
 *
 * Not a copy. STILL_SOURCE is a sprite sheet of ~25 poses, so a verbatim copy
 * renders in the 48 px Nav_Slot as a strip of tiny penguins; STILL_CROP_RECT
 * names the one neutral pose and this function crops to it and scales that
 * square to OUTPUT_HEIGHT_PX. ffmpeg opens the source for reading only and
 * writes a separate destination, so Requirement 1.3 still holds by construction.
 *
 * Dimensions are probed from the *output* rather than derived from the rect,
 * because NAVBAR_MASCOT_STILL_MANIFEST is what the `<img>` reserves its box from
 * and it must describe the bytes actually served.
 *
 * @param {{ ffmpegBin?: string, ffprobeBin?: string, cwd?: string, log?: (line: string) => void, stillCropRect?: object, heightPx?: number }} [options]
 * @returns {Promise<{ path: string, width: number, height: number, bytes: number, absPath: string }>}
 */
export async function copyStill(options = {}) {
  const {
    cwd = process.cwd(),
    log = console.log,
    ffmpegBin = DEFAULT_FFMPEG_BIN,
    stillCropRect = STILL_CROP_RECT,
    heightPx = OUTPUT_HEIGHT_PX,
  } = options;

  const sourceAbs = path.resolve(cwd, SOURCE_DIR, STILL_SOURCE);
  const destAbs = path.resolve(cwd, STILL_OUTPUT);

  if (!fs.existsSync(sourceAbs)) {
    throw new Error(
      `Source_Still not found at "${sourceAbs}". Check STILL_SOURCE / SOURCE_DIR ` +
        `in clipPipelineConfig.mjs.`,
    );
  }

  assertKebabCaseFileName(destAbs, ".png", "Source_Still output");

  await prepareWriteTarget(destAbs, { cwd, log });

  const args = buildStillArgs({
    sourcePath: sourceAbs,
    outputPath: destAbs,
    cropRect: stillCropRect,
    heightPx,
  });
  try {
    await execFileAsync(ffmpegBin, args, {
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.message || String(error);
    throw new Error(
      `ffmpeg failed while cropping the fallback still out of "${sourceAbs}":\n  ` +
        `${detail}\n  command: ${ffmpegBin} ${args.join(" ")}`,
    );
  }

  const probe = await probeMediaFile(destAbs, "the fallback still", options);
  if (probe.width === null || probe.height === null) {
    throw new Error(
      `ffprobe could not measure the pixel dimensions of the fallback still ` +
        `"${repoRelative(destAbs, cwd)}"; the manifest needs real numbers.`,
    );
  }

  const { size: bytes } = await fsp.stat(destAbs);

  log(
    `still: ${path.basename(destAbs)} ${probe.width}x${probe.height} px ` +
      `${bytes} bytes (${formatKb(bytes)})`,
  );

  return {
    path: servedPathFor(destAbs, cwd),
    width: probe.width,
    height: probe.height,
    bytes,
    absPath: destAbs,
  };
}

/**
 * Re-probe and stat every produced clip, then check the combined budget
 * (Requirements 4.5, 4.8).
 *
 * @param {readonly ProducedClip[]} producedClips ids plus paths, from encodeClips
 * @param {{ ffprobeBin?: string, cwd?: string, log?: (line: string) => void, maxTotalBytes?: number }} [options]
 * @returns {Promise<{ clips: ClipManifestEntry[], totalBytes: number }>}
 * @throws {ClipBudgetError} when the summed size exceeds the budget
 */
export async function measureClips(producedClips, options = {}) {
  const {
    cwd = process.cwd(),
    log = console.log,
    maxTotalBytes = MAX_TOTAL_BYTES,
  } = options;

  if (!Array.isArray(producedClips) || producedClips.length === 0) {
    throw new Error(
      "no produced clips were handed to writeManifest; nothing to measure. " +
        "The encode step must run first.",
    );
  }

  /** @type {ClipManifestEntry[]} */
  const clips = [];
  const seenIds = new Set();

  for (const produced of producedClips) {
    const id = produced?.id;
    if (typeof id !== "string" || id === "") {
      throw new Error(`produced clip is missing an id: ${JSON.stringify(produced)}`);
    }
    if (seenIds.has(id)) {
      throw new Error(`clip "${id}": duplicate clip id in the produced clip list.`);
    }
    seenIds.add(id);

    if (typeof produced.path !== "string" || produced.path === "") {
      throw new Error(`clip "${id}": missing output path.`);
    }

    const absPath = path.resolve(cwd, produced.path);
    if (!fs.existsSync(absPath)) {
      throw new Error(`clip "${id}": encoded file not found at "${absPath}".`);
    }
    assertKebabCaseFileName(absPath, ".gif", `clip "${id}"`);

    const probe = await probeMediaFile(absPath, `clip "${id}"`, options);
    if (probe.width === null || probe.height === null) {
      throw new Error(`clip "${id}": ffprobe could not measure pixel dimensions.`);
    }

    const durationMs = measuredDurationMs(probe);
    if (durationMs === null) {
      throw new Error(`clip "${id}": ffprobe could not measure a playback duration.`);
    }

    const fps = measuredFps(probe);
    if (fps === null) {
      throw new Error(`clip "${id}": ffprobe could not measure a frame rate.`);
    }

    const { size: bytes } = await fsp.stat(absPath);

    clips.push({
      id,
      path: servedPathFor(absPath, cwd),
      width: probe.width,
      height: probe.height,
      durationMs,
      fps,
      bytes,
    });
  }

  const sorted = sortByClipId(clips);
  const totalBytes = sorted.reduce((sum, clip) => sum + clip.bytes, 0);

  // Requirement 4.8: every clip's four facts, in the emitted order.
  for (const clip of sorted) log(formatClipReport(clip));
  log(
    `total: ${sorted.length} clips ${totalBytes} bytes (${formatKb(totalBytes)}) ` +
      `of ${maxTotalBytes} bytes (${formatKb(maxTotalBytes)}) budget`,
  );

  if (totalBytes > maxTotalBytes) {
    throw new ClipBudgetError(
      `combined clip size ${totalBytes} bytes (${formatKb(totalBytes)}) exceeds the ` +
        `${maxTotalBytes} byte (${formatKb(maxTotalBytes)}) budget by ` +
        `${totalBytes - maxTotalBytes} bytes.`,
      { totalBytes, maxTotalBytes, clips: sorted },
    );
  }

  return { clips: sorted, totalBytes };
}

/**
 * Convenience discovery for the standalone CLI below: treat whatever GIFs are in
 * CLIP_OUTPUT_DIR as the produced set. The orchestrator does NOT use this — it
 * passes the encoder's own results, so clip ids come from the SEGMENTS table
 * rather than from parsing file names.
 *
 * Id derivation strips an optional `mascot-` prefix, which is the naming
 * `encodeClips.mjs` owns; anything else is taken verbatim.
 *
 * @param {{ cwd?: string, clipOutputDir?: string }} [options]
 * @returns {ProducedClip[]}
 */
export function discoverClips(options = {}) {
  const { cwd = process.cwd(), clipOutputDir = CLIP_OUTPUT_DIR } = options;
  const dirAbs = path.resolve(cwd, clipOutputDir);
  if (!fs.existsSync(dirAbs)) return [];

  return fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".gif"))
    .map((entry) => ({
      id: entry.name.replace(/\.gif$/i, "").replace(/^mascot-/, ""),
      path: path.join(dirAbs, entry.name),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Render the still, measure the clips, emit the generated manifest.
 *
 * @param {readonly ProducedClip[]} producedClips ids plus paths, from encodeClips
 * @param {{ ffmpegBin?: string, ffprobeBin?: string, cwd?: string, log?: (line: string) => void, maxTotalBytes?: number, manifestOutput?: string }} [options]
 * @returns {Promise<{ clips: ClipManifestEntry[], still: object, totalBytes: number, manifestPath: string }>}
 */
export async function writeManifest(producedClips, options = {}) {
  const {
    cwd = process.cwd(),
    log = console.log,
    manifestOutput = MANIFEST_OUTPUT,
  } = options;

  const still = await copyStill(options);
  const { clips, totalBytes } = await measureClips(producedClips, options);

  const manifestAbs = path.resolve(cwd, manifestOutput);
  await prepareWriteTarget(manifestAbs, { cwd, log });
  await fsp.writeFile(
    manifestAbs,
    formatManifestModule({
      clips,
      still: { path: still.path, width: still.width, height: still.height },
    }),
    "utf8",
  );
  log(`manifest: ${repoRelative(manifestAbs, cwd)} (${clips.length} clips)`);

  return { clips, still, totalBytes, manifestPath: manifestAbs };
}

/* ───────────────────────────────── CLI layer ─────────────────────────────── */

/**
 * `node scripts/mascot-clips/writeManifest.mjs [ffprobePath] [ffmpegPath]`
 *
 * Measures whatever is already in CLIP_OUTPUT_DIR. Exists so the Requirement 4.5
 * exit code is verifiable independently of the orchestrator, which reuses
 * `writeManifest` directly and owns its own exit.
 */
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const ffprobeBin = process.argv[2] ?? DEFAULT_FFPROBE_BIN;
  const ffmpegBin = process.argv[3] ?? DEFAULT_FFMPEG_BIN;
  try {
    await writeManifest(discoverClips(), { ffprobeBin, ffmpegBin });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof ClipBudgetError) {
      console.error(`total bytes: ${error.totalBytes}`);
    }
    process.exit(1);
  }
}
