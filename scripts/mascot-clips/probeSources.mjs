/**
 * Source probing and segment-range validation (Requirements 2.4, 3.3, 3.4, 4.1).
 *
 * Responsibilities, and nothing else:
 *   - run ffprobe once per Source_Video and normalise its JSON into measured facts
 *   - print duration, pixel dimensions, frame rate and frame count (Requirement 2.4)
 *   - expose the source aspect ratio the encode step needs (Requirement 4.1)
 *   - validate the committed SEGMENTS table against the probed durations,
 *     naming the offending segment id (Requirements 3.3, 3.4)
 *
 * Tunables live in `clipPipelineConfig.mjs` only; this module imports
 * SOURCE_DIR, SOURCES, SEGMENTS and DURATION_RANGE_S from there and declares none.
 *
 * ── Binary-resolution contract (for task 2.7 wiring) ─────────────────────────
 * This module never resolves the ffprobe binary itself and never imports
 * `ensureEncoder.mjs`. Every entry point takes an optional `ffprobeBin` and
 * defaults to the bare command `"ffprobe"`. The orchestrator is expected to do:
 *
 *     const { ffprobeBin } = await ensureEncoder();
 *     const sources = await probeAllSources({ ffprobeBin });
 *     validateSegments(SEGMENTS, sources);
 *
 * That keeps this module usable when ffprobe is on PATH and equally usable when
 * it only exists in an install directory a fresh `winget install` added for
 * future shells but not for the current process.
 *
 * Pure parts (rate parsing, JSON normalisation, validation) are exported
 * separately from the process-spawning parts so they are testable without ffprobe.
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  DURATION_RANGE_S,
  SEGMENTS,
  SOURCE_DIR,
  SOURCES,
} from "./clipPipelineConfig.mjs";

const execFileAsync = promisify(execFile);

/** Bare command used when the caller does not hand us a resolved path. */
export const DEFAULT_FFPROBE_BIN = "ffprobe";

/**
 * Float-comparison slack, not a tunable: probed durations are decimal floats
 * (e.g. 4.083333) and segment boundaries are two-decimal literals, so exact
 * `<=` would reject ranges that are in fact inside the source by a rounding hair.
 */
const FLOAT_SLACK_S = 1e-6;

/**
 * @typedef {object} SourceFacts
 * @property {string} key             short id used by the SEGMENTS table ("a", "b")
 * @property {string} file            file name inside SOURCE_DIR
 * @property {string} filePath        absolute path that was probed
 * @property {number|null} width      pixels
 * @property {number|null} height     pixels
 * @property {number|null} fps        parsed from the r_frame_rate rational
 * @property {number|null} nbFrames   probed, or derived from fps × duration
 * @property {boolean} nbFramesDerived true when nb_frames was absent or "N/A"
 * @property {number|null} durationS  seconds, from format.duration
 * @property {number|null} aspectRatio width ÷ height
 */

/**
 * @typedef {object} Segment
 * @property {string} id
 * @property {string} source
 * @property {number} start
 * @property {number} end
 * @property {string} [label]
 */

/* ────────────────────────────── pure helpers ────────────────────────────── */

/**
 * ffprobe reports fields it cannot determine as the literal string "N/A", and
 * omits them entirely for some containers. Both mean "unknown", which is `null`
 * here — never NaN, so downstream arithmetic fails loudly rather than silently.
 *
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseNumericField(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.toUpperCase() === "N/A") return null;

  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * `r_frame_rate` is a rational string: "30/1", "30000/1001", or "0/0" when
 * unknown. Returns frames per second as a number, or `null` when unknown.
 *
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseFrameRate(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.toUpperCase() === "N/A") return null;

  if (!trimmed.includes("/")) {
    const plain = Number(trimmed);
    return Number.isFinite(plain) && plain > 0 ? plain : null;
  }

  const parts = trimmed.split("/");
  if (parts.length !== 2) return null;

  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0 || numerator <= 0) return null;

  const fps = numerator / denominator;
  return fps > 0 ? fps : null;
}

/**
 * The exact ffprobe argument vector, exported so it can be asserted on without
 * spawning anything.
 *
 * @param {string} filePath
 * @returns {string[]}
 */
export function buildProbeArgs(filePath) {
  return [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate,nb_frames",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    filePath,
  ];
}

/**
 * Normalise one ffprobe JSON payload into measured facts.
 *
 * @param {string} stdout raw ffprobe stdout
 * @param {{ key: string, file: string, filePath: string }} source
 * @returns {SourceFacts}
 */
export function parseProbeOutput(stdout, source) {
  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    throw new Error(
      `ffprobe returned unparseable JSON for source "${source.key}" (${source.file}).`,
    );
  }

  const stream = Array.isArray(payload?.streams) ? payload.streams[0] : undefined;
  if (!stream) {
    throw new Error(
      `ffprobe found no video stream in source "${source.key}" (${source.file}).`,
    );
  }

  const width = parseNumericField(stream.width);
  const height = parseNumericField(stream.height);
  const fps = parseFrameRate(stream.r_frame_rate);
  const durationS = parseNumericField(payload?.format?.duration);

  const probedFrames = parseNumericField(stream.nb_frames);
  const derivedFrames =
    fps !== null && durationS !== null ? Math.round(fps * durationS) : null;

  return {
    key: source.key,
    file: source.file,
    filePath: source.filePath,
    width,
    height,
    fps,
    nbFrames: probedFrames ?? derivedFrames,
    nbFramesDerived: probedFrames === null,
    durationS,
    aspectRatio: width !== null && height ? width / height : null,
  };
}

/**
 * Source aspect ratio, which the encode step preserves (Requirement 4.1).
 *
 * @param {SourceFacts} facts
 * @returns {number|null}
 */
export function sourceAspectRatio(facts) {
  if (facts?.aspectRatio != null) return facts.aspectRatio;
  if (facts?.width != null && facts?.height) return facts.width / facts.height;
  return null;
}

/**
 * Width ffmpeg's `scale=-2:<heightPx>` will choose for this source: the
 * aspect-preserving width rounded to the nearest even number. Height is a
 * caller-supplied parameter so this module stays free of geometry tunables.
 *
 * @param {SourceFacts} facts
 * @param {number} heightPx
 * @returns {number|null}
 */
export function outputWidthForHeight(facts, heightPx) {
  const aspect = sourceAspectRatio(facts);
  if (aspect === null || !Number.isFinite(heightPx) || heightPx <= 0) return null;
  return Math.max(2, Math.round((heightPx * aspect) / 2) * 2);
}

/** @param {number|null} value @param {number} digits */
function fmt(value, digits) {
  return value === null || value === undefined ? "unknown" : value.toFixed(digits);
}

/**
 * One human-readable line carrying all four probed facts: pixel dimensions,
 * frame rate, frame count and duration (Requirement 2.4).
 *
 * @param {SourceFacts} facts
 * @returns {string}
 */
export function formatSourceFacts(facts) {
  const dims =
    facts.width !== null && facts.height !== null
      ? `${facts.width}x${facts.height}`
      : "unknown";
  const frames =
    facts.nbFrames === null
      ? "unknown"
      : `${facts.nbFrames}${facts.nbFramesDerived ? " (derived)" : ""}`;

  return [
    `source ${facts.key} (${facts.file}):`,
    `${dims} px`,
    `${fmt(facts.fps, 3)} fps`,
    `${frames} frames`,
    `${fmt(facts.durationS, 3)} s`,
    `aspect ${fmt(sourceAspectRatio(facts), 4)}`,
  ].join(" ");
}

/**
 * @param {Record<string, SourceFacts>} factsBySource
 * @param {(line: string) => void} [log]
 */
export function printSourceFacts(factsBySource, log = console.log) {
  for (const key of Object.keys(factsBySource)) {
    log(formatSourceFacts(factsBySource[key]));
  }
}

/* ──────────────────────────── segment validation ─────────────────────────── */

/**
 * Every reason the committed segment table cannot be encoded against these
 * probed sources, each message naming the offending segment id. Pure, so the
 * whole validation surface is testable with stubbed durations.
 *
 * Covers: unknown source key, malformed or inverted boundaries, ranges outside
 * the probed duration of the segment's own source (Requirement 3.3), and clip
 * lengths outside the permitted window (Requirement 3.4).
 *
 * @param {readonly Segment[]} segments
 * @param {Record<string, SourceFacts>} factsBySource
 * @param {{ durationRangeS?: { min: number, max: number } }} [options]
 * @returns {string[]} empty when the table is valid
 */
export function collectSegmentIssues(segments, factsBySource, options = {}) {
  const durationRangeS = options.durationRangeS ?? DURATION_RANGE_S;
  const issues = [];
  const seenIds = new Set();

  for (const segment of segments) {
    const id = segment?.id ?? "<missing id>";

    if (seenIds.has(id)) {
      issues.push(`segment "${id}": duplicate segment id.`);
    }
    seenIds.add(id);

    const facts = factsBySource?.[segment?.source];
    if (!facts) {
      const known = Object.keys(factsBySource ?? {}).join(", ") || "none";
      issues.push(
        `segment "${id}": unknown source key "${segment?.source}" (probed sources: ${known}).`,
      );
      continue;
    }

    const { start, end } = segment;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      issues.push(`segment "${id}": start and end must be finite numbers, got ${start}..${end}.`);
      continue;
    }
    if (start < 0) {
      issues.push(`segment "${id}": start ${start.toFixed(2)}s is negative.`);
    }
    if (end <= start) {
      issues.push(
        `segment "${id}": end ${end.toFixed(2)}s must be greater than start ${start.toFixed(2)}s.`,
      );
      continue;
    }

    if (facts.durationS === null) {
      issues.push(
        `segment "${id}": source "${segment.source}" (${facts.file}) has no probed duration to validate against.`,
      );
    } else if (
      start > facts.durationS + FLOAT_SLACK_S ||
      end > facts.durationS + FLOAT_SLACK_S
    ) {
      issues.push(
        `segment "${id}": range ${start.toFixed(2)}..${end.toFixed(2)}s falls outside the probed ` +
          `duration of source "${segment.source}" (${facts.file}, ${facts.durationS.toFixed(3)}s).`,
      );
    }

    const length = end - start;
    if (
      length < durationRangeS.min - FLOAT_SLACK_S ||
      length > durationRangeS.max + FLOAT_SLACK_S
    ) {
      issues.push(
        `segment "${id}": length ${length.toFixed(2)}s is outside the permitted ` +
          `${durationRangeS.min.toFixed(2)}..${durationRangeS.max.toFixed(2)}s window.`,
      );
    }
  }

  return issues;
}

/**
 * Throwing wrapper: fails with the offending segment ids, or returns the table
 * unchanged. Never mutates the table (Requirement 3.6).
 *
 * @param {readonly Segment[]} [segments]
 * @param {Record<string, SourceFacts>} factsBySource
 * @param {{ durationRangeS?: { min: number, max: number } }} [options]
 * @returns {readonly Segment[]}
 */
export function validateSegments(segments = SEGMENTS, factsBySource, options = {}) {
  const issues = collectSegmentIssues(segments, factsBySource, options);
  if (issues.length > 0) {
    throw new Error(
      `Segment table is invalid against the probed sources:\n  - ${issues.join("\n  - ")}`,
    );
  }
  return segments;
}

/* ───────────────────────────── ffprobe execution ─────────────────────────── */

/**
 * Probe one source file.
 *
 * @param {{ key: string, file: string }} source
 * @param {{ ffprobeBin?: string, sourceDir?: string, cwd?: string }} [options]
 * @returns {Promise<SourceFacts>}
 */
export async function probeSource(source, options = {}) {
  const {
    ffprobeBin = DEFAULT_FFPROBE_BIN,
    sourceDir = SOURCE_DIR,
    cwd = process.cwd(),
  } = options;

  const filePath = path.resolve(cwd, sourceDir, source.file);

  let stdout;
  try {
    ({ stdout } = await execFileAsync(ffprobeBin, buildProbeArgs(filePath), {
      maxBuffer: 1024 * 1024,
    }));
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.message || String(error);
    throw new Error(
      `ffprobe failed for source "${source.key}" (${filePath}):\n  ${detail}\n` +
        `  command: ${ffprobeBin} ${buildProbeArgs(filePath).join(" ")}`,
    );
  }

  return parseProbeOutput(stdout, { key: source.key, file: source.file, filePath });
}

/**
 * Probe every configured source, keyed by the short id the SEGMENTS table uses.
 *
 * @param {{ ffprobeBin?: string, sources?: Record<string, string>, sourceDir?: string, cwd?: string, log?: ((line: string) => void)|null }} [options]
 * @returns {Promise<Record<string, SourceFacts>>}
 */
export async function probeAllSources(options = {}) {
  const { sources = SOURCES, log = console.log } = options;

  /** @type {Record<string, SourceFacts>} */
  const factsBySource = {};
  for (const [key, file] of Object.entries(sources)) {
    factsBySource[key] = await probeSource({ key, file }, options);
  }

  if (log) printSourceFacts(factsBySource, log);
  return factsBySource;
}

/* Direct run: `node scripts/mascot-clips/probeSources.mjs [ffprobePath]` prints
 * the probed facts and validates the committed segment table. */
const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const ffprobeBin = process.argv[2] ?? DEFAULT_FFPROBE_BIN;
  try {
    const factsBySource = await probeAllSources({ ffprobeBin });
    validateSegments(SEGMENTS, factsBySource);
    console.log("segment table is valid against the probed sources");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
