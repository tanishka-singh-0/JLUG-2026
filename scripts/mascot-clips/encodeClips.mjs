/**
 * Clip encoding: two-pass palettegen/paletteuse plus the size ladder
 * (Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.9, 4.10, 4.11).
 *
 * Responsibilities, and nothing else:
 *   - build the exact ffmpeg argument vectors for the palette pass and the
 *     encode pass, cropping to the Crop_Region before scaling
 *   - walk QUALITY_LADDER in order and keep the first rung inside MAX_CLIP_BYTES
 *   - fail, naming the clip id and its measured bytes, when the ladder runs out
 *   - delete every temporary palette PNG, including on the failure path
 *
 * Measuring the finished GIFs, the combined-size budget and the Requirement 4.8
 * report all belong to `writeManifest.mjs`; this module only returns what it
 * encoded.
 *
 * ── Tunables ─────────────────────────────────────────────────────────────────
 * `clipPipelineConfig.mjs` is the single home for tunables (Requirement 12.3).
 * This module imports CROP_RECT, OUTPUT_HEIGHT_PX, QUALITY_LADDER,
 * MAX_CLIP_BYTES, CLIP_OUTPUT_DIR, SOURCE_DIR, SOURCES and SEGMENTS from there
 * and declares none of its own.
 *
 * ── Binary-resolution contract ───────────────────────────────────────────────
 * Like `probeSources.mjs`, this module never resolves ffmpeg itself and never
 * imports `ensureEncoder.mjs`. Every entry point takes an `ffmpegBin` and the
 * orchestrator is expected to do:
 *
 *     const { ffmpeg, ffprobe } = await ensureEncoder();
 *     const sources = await probeAllSources({ ffprobeBin: ffprobe });
 *     validateSegments(SEGMENTS, sources);
 *     const clips = await encodeAllClips({ ffmpegBin: ffmpeg, factsBySource: sources });
 *
 * A bare `ffmpeg` does not resolve in this process on the development machine —
 * winget extended PATH only for shells started after the install — so the
 * default bare command is a convenience for interactive use, not a fallback the
 * pipeline may rely on.
 *
 * Pure parts (filter-chain construction, argument vectors, geometry validation,
 * ladder selection) are exported separately from the process-spawning parts so
 * they are testable without ffmpeg.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  CLIP_OUTPUT_DIR,
  CROP_RECT,
  MAX_CLIP_BYTES,
  OUTPUT_HEIGHT_PX,
  QUALITY_LADDER,
  SEGMENTS,
  SOURCE_DIR,
  SOURCES,
} from "./clipPipelineConfig.mjs";
import { outputWidthForHeight, sourceAspectRatio } from "./probeSources.mjs";

const execFileAsync = promisify(execFile);

/** Bare command used when the caller does not hand us a resolved path. */
export const DEFAULT_FFMPEG_BIN = "ffmpeg";

/**
 * An ffmpeg run that produces a ~1 s GIF should take seconds. Not a media
 * tunable — a liveness bound, so a wedged child process fails the run instead of
 * hanging it forever.
 */
const ENCODE_TIMEOUT_MS = 5 * 60_000;

/** ffmpeg is chatty on stderr even with -hide_banner; cap the buffer. */
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

/**
 * Downscale filter. `lanczos` is the design's choice and applies to a ~6x
 * reduction here, where it behaves as a sharp, ring-free resampler.
 */
const SCALE_FLAGS = "lanczos";

/**
 * @typedef {object} LadderRung
 * @property {number} fps
 * @property {number} palette  max palette colours
 * @property {string} dither   ffmpeg `paletteuse=dither=` value
 */

/**
 * @typedef {object} EncodedClip
 * @property {string} id            segment id
 * @property {string} label
 * @property {string} source        source key
 * @property {string} outputPath    absolute path of the written GIF
 * @property {string} fileName      base name of the written GIF
 * @property {number} startS
 * @property {number} durationS     requested duration (end - start)
 * @property {number} fps           frame rate of the winning rung
 * @property {number} palette       palette size of the winning rung
 * @property {string} dither
 * @property {number} rungIndex     index into QUALITY_LADDER
 * @property {number} bytes         measured size of the written GIF
 * @property {boolean} overwritten  true when a file already existed at outputPath
 */

/* ───────────────────────────── crop geometry ─────────────────────────────── */

/**
 * The Crop_Region has to hold up to three separate promises, so they are checked
 * rather than assumed:
 *
 *   - integral and even, so the crop lands on clean chroma boundaries;
 *   - square, which is what makes `scale=-2:<height>` produce a square output
 *     with no anamorphic stretching (Requirements 4.9, 4.10). A non-square rect
 *     would silently yield a non-square GIF, so it is rejected here instead;
 *   - inside the probed source frame, when source facts are available.
 *
 * @param {{ x: number, y: number, width: number, height: number }} [cropRect]
 * @param {{ facts?: object, heightPx?: number }} [options]
 * @returns {string[]} empty when the rect is usable
 */
export function collectCropIssues(cropRect = CROP_RECT, options = {}) {
  const { facts, heightPx = OUTPUT_HEIGHT_PX } = options;
  const issues = [];

  if (!cropRect || typeof cropRect !== "object") {
    return ["CROP_RECT is missing; expected { x, y, width, height }."];
  }

  for (const key of ["x", "y", "width", "height"]) {
    const value = cropRect[key];
    if (!Number.isInteger(value)) {
      issues.push(`CROP_RECT.${key} must be an integer, got ${value}.`);
    } else if (value % 2 !== 0) {
      issues.push(`CROP_RECT.${key} must be even, got ${value}.`);
    }
  }
  if (issues.length > 0) return issues;

  if (cropRect.width <= 0 || cropRect.height <= 0) {
    issues.push(
      `CROP_RECT must have positive dimensions, got ${cropRect.width}x${cropRect.height}.`,
    );
  }
  if (cropRect.x < 0 || cropRect.y < 0) {
    issues.push(
      `CROP_RECT origin must be non-negative, got (${cropRect.x}, ${cropRect.y}).`,
    );
  }
  if (cropRect.width !== cropRect.height) {
    issues.push(
      `CROP_RECT must be square so the ${heightPx}px output is square and uniformly ` +
        `scaled, got ${cropRect.width}x${cropRect.height}.`,
    );
  }

  if (facts?.width != null && facts?.height != null) {
    if (cropRect.x + cropRect.width > facts.width) {
      issues.push(
        `CROP_RECT extends to x=${cropRect.x + cropRect.width}, past the ` +
          `${facts.width}px width of source "${facts.key}" (${facts.file}).`,
      );
    }
    if (cropRect.y + cropRect.height > facts.height) {
      issues.push(
        `CROP_RECT extends to y=${cropRect.y + cropRect.height}, past the ` +
          `${facts.height}px height of source "${facts.key}" (${facts.file}).`,
      );
    }
  }

  return issues;
}

/**
 * Throwing wrapper over {@link collectCropIssues}, run once per source before
 * any encode so a bad rect costs no ffmpeg time.
 *
 * @param {{ x: number, y: number, width: number, height: number }} [cropRect]
 * @param {{ facts?: object, heightPx?: number }} [options]
 */
export function validateCropRect(cropRect = CROP_RECT, options = {}) {
  const issues = collectCropIssues(cropRect, options);
  if (issues.length > 0) {
    throw new Error(`Crop region is invalid:\n  - ${issues.join("\n  - ")}`);
  }
  return cropRect;
}

/**
 * Output pixel dimensions `crop=…,scale=-2:<heightPx>` will produce. Delegates
 * the even-rounding rule to `probeSources.outputWidthForHeight` by handing it the
 * crop rectangle in place of a source, because after the crop it is the crop's
 * aspect that the scaler preserves — not the source's.
 *
 * @param {{ width: number, height: number }} [cropRect]
 * @param {number} [heightPx]
 * @returns {{ width: number, height: number }}
 */
export function outputDimensions(cropRect = CROP_RECT, heightPx = OUTPUT_HEIGHT_PX) {
  const asSource = {
    width: cropRect.width,
    height: cropRect.height,
    aspectRatio: cropRect.width / cropRect.height,
  };
  return {
    width: outputWidthForHeight(asSource, heightPx),
    height: heightPx,
  };
}

/* ─────────────────────────── filter construction ─────────────────────────── */

/** `crop=w:h:x:y` for the Crop_Region (Requirement 4.11 — one rect for all clips). */
export function buildCropFilter(cropRect = CROP_RECT) {
  return `crop=${cropRect.width}:${cropRect.height}:${cropRect.x}:${cropRect.y}`;
}

/**
 * The shared head of both passes: decimate to the rung's frame rate, crop to the
 * Crop_Region, then scale.
 *
 * Order matters. The crop precedes the scale (Requirement 4.1) so the 96 px of
 * output height is spent on the mascot rather than on white background, and
 * `scale=-2:<heightPx>` is used instead of `scale=<heightPx>:<heightPx>` so the
 * scale stays uniform by construction: it derives the width from the incoming
 * aspect rather than forcing one (Requirement 4.10). With the square Crop_Region
 * that `validateCropRect` insists on, `-2` resolves to `heightPx`, giving the
 * required 96x96 (Requirement 4.9) without this module hard-coding 96.
 *
 * @param {{ fps: number, cropRect?: object, heightPx?: number }} params
 * @returns {string}
 */
export function buildScaleChain({
  fps,
  cropRect = CROP_RECT,
  heightPx = OUTPUT_HEIGHT_PX,
}) {
  return [
    `fps=${fps}`,
    buildCropFilter(cropRect),
    `scale=-2:${heightPx}:flags=${SCALE_FLAGS}`,
  ].join(",");
}

/**
 * Pass 1 — palette generation.
 *
 * `-ss` / `-t` precede `-i` so the palette is generated from exactly the frames
 * that get encoded, and the filter head is identical to pass 2's so the palette
 * sees the post-crop, post-scale pixels rather than the full frame.
 * `stats_mode=diff` biases the palette toward moving pixels, which for a mostly
 * static mascot on a flat background is where the colour budget is worth
 * spending.
 *
 * @param {object} params
 * @returns {string[]} argv after the binary name
 */
export function buildPaletteArgs({
  sourcePath,
  startS,
  durationS,
  fps,
  palette,
  palettePath,
  cropRect = CROP_RECT,
  heightPx = OUTPUT_HEIGHT_PX,
}) {
  const chain = `${buildScaleChain({ fps, cropRect, heightPx })},palettegen=max_colors=${palette}:stats_mode=diff`;
  return [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    formatSeconds(startS),
    "-t",
    formatSeconds(durationS),
    "-i",
    sourcePath,
    "-vf",
    chain,
    "-frames:v",
    "1",
    palettePath,
  ];
}

/**
 * Pass 2 — encode against the generated palette.
 *
 * `diff_mode=rectangle` limits re-dithering to the changed rectangle of each
 * frame, which is the single biggest GIF size win here. `-loop 0` writes infinite
 * loop metadata (Requirement 4.3).
 *
 * @param {object} params
 * @returns {string[]} argv after the binary name
 */
export function buildEncodeArgs({
  sourcePath,
  startS,
  durationS,
  fps,
  dither,
  palettePath,
  outputPath,
  cropRect = CROP_RECT,
  heightPx = OUTPUT_HEIGHT_PX,
}) {
  const chain =
    `${buildScaleChain({ fps, cropRect, heightPx })}[v];` +
    `[v][1:v]paletteuse=dither=${dither}:diff_mode=rectangle`;
  return [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    formatSeconds(startS),
    "-t",
    formatSeconds(durationS),
    "-i",
    sourcePath,
    "-i",
    palettePath,
    "-lavfi",
    chain,
    "-loop",
    "0",
    outputPath,
  ];
}

/** Seconds as a plain decimal — never exponential notation, which ffmpeg rejects. */
function formatSeconds(value) {
  return Number(value).toFixed(3);
}

/** Render an argv pair as a copy-pasteable command string. */
function formatCommand(file, args = []) {
  const quote = (part) => (/[\s"]/.test(String(part)) ? `"${part}"` : String(part));
  return [quote(file), ...args.map(quote)].join(" ");
}

/* ──────────────────────────────── size ladder ────────────────────────────── */

/** Thrown when the ladder is exhausted and the clip is still over budget. */
export class ClipSizeBudgetError extends Error {
  constructor(message, { clipId, bytes, maxBytes, rung, attempts = [] } = {}) {
    super(message);
    this.name = "ClipSizeBudgetError";
    /** The clip that could not be squeezed into budget (Requirement 4.7). */
    this.clipId = clipId;
    /** Its measured size at the last rung (Requirement 4.7). */
    this.bytes = bytes;
    this.maxBytes = maxBytes;
    this.rung = rung;
    /** Every rung tried, in order, with its measured size. */
    this.attempts = attempts;
  }
}

/**
 * Walk the quality ladder and keep the first rung that lands inside budget.
 *
 * Pure with respect to the file system and ffmpeg: the only thing it does is
 * call `encodeFn`, which is injected. That is what makes Requirements 4.6 and
 * 4.7 testable without an encoder (task 2.10) — a test hands in an arbitrary
 * rung → bytes function and asserts the attempt order and the selection.
 *
 * Contract:
 *   - rungs are attempted strictly in the given order, never reordered, never
 *     skipped, and no rung after the winner is attempted;
 *   - the winner is the first rung whose measured size is `<= maxBytes`
 *     (Requirement 4.6 — "reduce … until the file is at most 300 KB", with the
 *     ladder's last rung being the 12 fps / 64 colour floor);
 *   - exhausting the ladder throws a `ClipSizeBudgetError` naming the clip id
 *     and the measured bytes of the last attempt (Requirement 4.7).
 *
 * @param {readonly LadderRung[]} rungs
 * @param {(rung: LadderRung, index: number) => Promise<number>|number} encodeFn
 *   Encodes at the given rung and resolves to the produced byte size.
 * @param {{ clipId?: string, maxBytes?: number }} [options]
 * @returns {Promise<{ rung: LadderRung, rungIndex: number, bytes: number, attempts: Array<{ rung: LadderRung, rungIndex: number, bytes: number }> }>}
 */
export async function selectLadderRung(rungs, encodeFn, options = {}) {
  const { clipId = "<unknown clip>", maxBytes = MAX_CLIP_BYTES } = options;

  if (!Array.isArray(rungs) || rungs.length === 0) {
    throw new ClipSizeBudgetError(
      `clip "${clipId}": the quality ladder is empty, so there is nothing to encode.`,
      { clipId, bytes: null, maxBytes, attempts: [] },
    );
  }

  const attempts = [];

  for (let rungIndex = 0; rungIndex < rungs.length; rungIndex += 1) {
    const rung = rungs[rungIndex];
    const bytes = await encodeFn(rung, rungIndex);
    attempts.push({ rung, rungIndex, bytes });

    if (bytes <= maxBytes) {
      return { rung, rungIndex, bytes, attempts };
    }
  }

  const last = attempts[attempts.length - 1];
  throw new ClipSizeBudgetError(
    `clip "${clipId}" is ${last.bytes} bytes at the last ladder rung ` +
      `(${last.rung.fps} fps, ${last.rung.palette} colours), over the ` +
      `${maxBytes}-byte per-clip budget.`,
    { clipId, bytes: last.bytes, maxBytes, rung: last.rung, attempts },
  );
}

/* ───────────────────────────── ffmpeg execution ──────────────────────────── */

async function runFfmpeg(ffmpegBin, args) {
  try {
    return await execFileAsync(ffmpegBin, args, {
      timeout: ENCODE_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      windowsHide: true,
    });
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.message || String(error);
    throw new Error(`ffmpeg failed:\n  ${detail}\n  command: ${formatCommand(ffmpegBin, args)}`);
  }
}

/**
 * Temp palette path. It goes in `os.tmpdir()` rather than the repository so a
 * crashed run cannot leave an untracked PNG behind for someone to commit, and it
 * carries the pid so concurrent runs cannot collide.
 */
function palettePathFor(clipId, rungIndex, tmpDir) {
  return path.join(
    tmpDir,
    `mascot-palette-${clipId}-r${rungIndex}-${process.pid}.png`,
  );
}

/** Best-effort unlink: a missing temp file is the desired end state either way. */
async function removeQuietly(filePath) {
  try {
    await fsp.rm(filePath, { force: true });
  } catch {
    /* ignore */
  }
}

/**
 * Encode one segment at one ladder rung and return the produced byte size.
 *
 * The palette PNG is deleted in a `finally`, so it is removed whether pass 2
 * succeeds, fails, or times out (the "nothing extra gets committed" half of this
 * task).
 *
 * @param {object} params
 * @returns {Promise<number>} bytes of the written GIF
 */
export async function encodeAtRung({
  ffmpegBin = DEFAULT_FFMPEG_BIN,
  clipId,
  sourcePath,
  outputPath,
  startS,
  durationS,
  rung,
  rungIndex,
  cropRect = CROP_RECT,
  heightPx = OUTPUT_HEIGHT_PX,
  tmpDir = os.tmpdir(),
}) {
  const palettePath = palettePathFor(clipId, rungIndex, tmpDir);

  try {
    await runFfmpeg(
      ffmpegBin,
      buildPaletteArgs({
        sourcePath,
        startS,
        durationS,
        fps: rung.fps,
        palette: rung.palette,
        palettePath,
        cropRect,
        heightPx,
      }),
    );

    await runFfmpeg(
      ffmpegBin,
      buildEncodeArgs({
        sourcePath,
        startS,
        durationS,
        fps: rung.fps,
        dither: rung.dither,
        palettePath,
        outputPath,
        cropRect,
        heightPx,
      }),
    );
  } finally {
    await removeQuietly(palettePath);
  }

  const { size } = await fsp.stat(outputPath);
  return size;
}

/** `mascot-<id>.gif` — kebab-case, matching the clip id (Requirements 1.1, 1.2). */
export function clipFileName(segmentId) {
  return `mascot-${segmentId}.gif`;
}

/**
 * Encode one segment, descending the ladder until it fits.
 *
 * @param {object} segment  one entry of the committed SEGMENTS table
 * @param {object} [options]
 * @returns {Promise<EncodedClip>}
 */
export async function encodeSegment(segment, options = {}) {
  const {
    ffmpegBin = DEFAULT_FFMPEG_BIN,
    factsBySource = {},
    sources = SOURCES,
    sourceDir = SOURCE_DIR,
    outputDir = CLIP_OUTPUT_DIR,
    cropRect = CROP_RECT,
    heightPx = OUTPUT_HEIGHT_PX,
    ladder = QUALITY_LADDER,
    maxBytes = MAX_CLIP_BYTES,
    tmpDir = os.tmpdir(),
    cwd = process.cwd(),
    log = console.log,
  } = options;

  const sourceFile = sources[segment.source];
  if (!sourceFile) {
    throw new Error(
      `segment "${segment.id}": unknown source key "${segment.source}" ` +
        `(configured sources: ${Object.keys(sources).join(", ") || "none"}).`,
    );
  }

  const sourcePath = path.resolve(cwd, sourceDir, sourceFile);
  const resolvedOutputDir = path.resolve(cwd, outputDir);
  const fileName = clipFileName(segment.id);
  const outputPath = path.join(resolvedOutputDir, fileName);
  const durationS = segment.end - segment.start;

  validateCropRect(cropRect, {
    facts: factsBySource[segment.source],
    heightPx,
  });

  await fsp.mkdir(resolvedOutputDir, { recursive: true });

  // Requirement 1.4 is writeManifest's to report in full, but the encode is the
  // step that actually clobbers the file, so it says so here too.
  const overwritten = fs.existsSync(outputPath);
  if (overwritten && log) log(`overwrite: ${path.relative(cwd, outputPath)}`);

  const selection = await selectLadderRung(
    ladder,
    async (rung, rungIndex) => {
      const bytes = await encodeAtRung({
        ffmpegBin,
        clipId: segment.id,
        sourcePath,
        outputPath,
        startS: segment.start,
        durationS,
        rung,
        rungIndex,
        cropRect,
        heightPx,
        tmpDir,
      });
      if (log) {
        log(
          `[encode] ${segment.id} rung ${rungIndex} (${rung.fps} fps, ` +
            `${rung.palette} colours): ${bytes} bytes ` +
            `${bytes <= maxBytes ? "— within budget" : `— over ${maxBytes}, descending`}`,
        );
      }
      return bytes;
    },
    { clipId: segment.id, maxBytes },
  );

  return {
    id: segment.id,
    label: segment.label,
    source: segment.source,
    outputPath,
    fileName,
    startS: segment.start,
    durationS,
    fps: selection.rung.fps,
    palette: selection.rung.palette,
    dither: selection.rung.dither,
    rungIndex: selection.rungIndex,
    bytes: selection.bytes,
    overwritten,
  };
}

/**
 * Encode every committed segment, in table order.
 *
 * @param {object} [options] same shape as {@link encodeSegment}, plus `segments`
 * @returns {Promise<EncodedClip[]>}
 */
export async function encodeAllClips(options = {}) {
  const {
    segments = SEGMENTS,
    cropRect = CROP_RECT,
    heightPx = OUTPUT_HEIGHT_PX,
    factsBySource = {},
    log = console.log,
  } = options;

  if (log) {
    const { width, height } = outputDimensions(cropRect, heightPx);
    log(
      `[encode] crop ${buildCropFilter(cropRect)} -> ${width}x${height} ` +
        `(one shared crop region for all ${segments.length} clips)`,
    );
    for (const [key, facts] of Object.entries(factsBySource)) {
      const aspect = sourceAspectRatio(facts);
      log(
        `[encode] source ${key}: ${facts.width}x${facts.height} ` +
          `(aspect ${aspect === null ? "unknown" : aspect.toFixed(4)}) cropped to ` +
          `${cropRect.width}x${cropRect.height} (aspect ` +
          `${(cropRect.width / cropRect.height).toFixed(4)})`,
      );
    }
  }

  const clips = [];
  for (const segment of segments) {
    clips.push(await encodeSegment(segment, options));
  }
  return clips;
}

/* Direct run: `node scripts/mascot-clips/encodeClips.mjs` resolves the encoder,
 * probes the sources, validates the segment table and encodes every clip. The
 * orchestrator (task 2.7) wires the same calls; this entry point exists so the
 * encode step is runnable on its own. */
const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { ensureEncoder, EncoderToolchainError, reportEncoderFailure } = await import(
    "./ensureEncoder.mjs"
  );
  const { probeAllSources, validateSegments } = await import("./probeSources.mjs");

  try {
    const { ffmpeg, ffprobe } = await ensureEncoder();
    const factsBySource = await probeAllSources({ ffprobeBin: ffprobe });
    validateSegments(SEGMENTS, factsBySource);

    const clips = await encodeAllClips({ ffmpegBin: ffmpeg, factsBySource });
    for (const clip of clips) {
      console.log(
        `[encode] ${clip.fileName}: ${clip.durationS.toFixed(2)}s @ ${clip.fps} fps, ` +
          `rung ${clip.rungIndex}, ${clip.bytes} bytes`,
      );
    }
  } catch (error) {
    if (error instanceof EncoderToolchainError) {
      reportEncoderFailure(error);
      process.exit(1);
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
