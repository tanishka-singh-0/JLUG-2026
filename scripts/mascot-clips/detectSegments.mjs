/**
 * Advisory scene-change probing (Requirements 3.1–3.6, design §1.4).
 *
 * This module is *advisory only*. It runs exclusively under `--probe-segments`,
 * prints a paste-ready `SEGMENTS` block, and writes nothing — not the config,
 * not a temp file, not a clip. Boundary selection stays a human decision, which
 * is what makes reruns of the encode step reproduce identical cuts: encoding
 * reads boundaries only from the committed table in `clipPipelineConfig.mjs`,
 * never from a fresh probe (Requirements 3.6, 12.4).
 *
 * The ffmpeg invocation is the one from the design:
 *
 *     ffmpeg -hide_banner -i <source> -an \
 *       -vf "select='gt(scene,<threshold>)',metadata=print:file=-" -f null -
 *
 * `metadata=print:file=-` emits lines shaped like
 *
 *     frame:12   pts:12288   pts_time:0.5
 *     lavfi.scene_score=0.418231
 *
 * on *stderr* for `file=-` in current ffmpeg builds, and on stdout in others, so
 * both streams are parsed. Only `pts_time` is authoritative; the accompanying
 * `lavfi.scene_score` is carried through for review context.
 *
 * ── Tunables ─────────────────────────────────────────────────────────────────
 * None are declared here. `SOURCE_DIR`, `SOURCES`, `SCENE_CHANGE_THRESHOLD` and
 * `DURATION_RANGE_S` all come from `clipPipelineConfig.mjs` (Requirement 12.3).
 *
 * ── Binary resolution ────────────────────────────────────────────────────────
 * Like `probeSources.mjs`, this module never resolves ffmpeg itself. Callers
 * pass `ffmpegBin` (from `ensureEncoder()`); the bare command is only a default.
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  DURATION_RANGE_S,
  SCENE_CHANGE_THRESHOLD,
  SOURCE_DIR,
  SOURCES,
} from "./clipPipelineConfig.mjs";

const execFileAsync = promisify(execFile);

/** Bare command used when the caller does not hand us a resolved path. */
export const DEFAULT_FFMPEG_BIN = "ffmpeg";

/** Scene detection on a 20 s 720p clip is quick; anything slower is a failure. */
const DETECT_TIMEOUT_MS = 5 * 60_000;

/** The metadata filter prints one pair of lines per detected frame. */
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

/**
 * @typedef {object} SceneChange
 * @property {number} timeS  pts_time clamped to two decimals
 * @property {number|null} score  lavfi.scene_score when ffmpeg reported one
 */

/* ────────────────────────────── pure helpers ────────────────────────────── */

/**
 * Two-decimal clamp, applied to every printed time so the emitted block can be
 * pasted into `SEGMENTS` verbatim and satisfies "at least two decimal places"
 * (Requirement 3.3).
 *
 * @param {number} seconds
 * @returns {number}
 */
export function clampToTwoDecimals(seconds) {
  if (!Number.isFinite(seconds)) return 0;
  return Math.round(seconds * 100) / 100;
}

/**
 * The exact ffmpeg argument vector, exported so it can be asserted on without
 * spawning anything.
 *
 * @param {string} filePath
 * @param {number} threshold
 * @returns {string[]}
 */
export function buildDetectArgs(filePath, threshold = SCENE_CHANGE_THRESHOLD) {
  return [
    "-hide_banner",
    "-i",
    filePath,
    "-an",
    "-vf",
    `select='gt(scene,${threshold})',metadata=print:file=-`,
    "-f",
    "null",
    "-",
  ];
}

/**
 * Parse `pts_time` (and any adjacent `lavfi.scene_score`) out of the metadata
 * filter's output. Order is preserved, duplicate times after clamping are
 * collapsed, and anything unparseable is ignored rather than throwing — this is
 * an advisory probe, so a noisy line must not abort the review.
 *
 * @param {string} output combined stdout + stderr
 * @returns {SceneChange[]}
 */
export function parseSceneChanges(output) {
  const lines = String(output ?? "").split(/\r?\n/);
  /** @type {SceneChange[]} */
  const changes = [];
  const seen = new Set();

  for (const line of lines) {
    const timeMatch = /\bpts_time:\s*(-?\d+(?:\.\d+)?)/.exec(line);
    if (timeMatch) {
      const raw = Number(timeMatch[1]);
      if (!Number.isFinite(raw) || raw < 0) continue;
      const timeS = clampToTwoDecimals(raw);
      if (seen.has(timeS)) continue;
      seen.add(timeS);
      changes.push({ timeS, score: null });
      continue;
    }

    const scoreMatch = /lavfi\.scene_score\s*=\s*(\d+(?:\.\d+)?)/.exec(line);
    if (scoreMatch && changes.length > 0) {
      const last = changes[changes.length - 1];
      if (last.score === null) last.score = Number(scoreMatch[1]);
    }
  }

  return changes;
}

/**
 * Turn detected cut points into the candidate ranges between them, annotated
 * with whether each range's length already fits the permitted clip window
 * (Requirement 3.4). A reviewer reads this to see which candidates are usable
 * as-is and which need their boundaries nudged.
 *
 * @param {readonly SceneChange[]} changes
 * @param {number|null} durationS probed source duration; used as the final edge
 * @param {{ durationRangeS?: { min: number, max: number } }} [options]
 * @returns {{ index: number, start: number, end: number, lengthS: number, inRange: boolean }[]}
 */
export function candidateRanges(changes, durationS, options = {}) {
  const durationRangeS = options.durationRangeS ?? DURATION_RANGE_S;

  const edges = [0];
  for (const change of changes) {
    if (change.timeS > edges[edges.length - 1]) edges.push(change.timeS);
  }
  if (durationS != null && Number.isFinite(durationS)) {
    const end = clampToTwoDecimals(durationS);
    if (end > edges[edges.length - 1]) edges.push(end);
  }

  const ranges = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const start = edges[i];
    const end = edges[i + 1];
    const lengthS = clampToTwoDecimals(end - start);
    ranges.push({
      index: i,
      start,
      end,
      lengthS,
      inRange: lengthS >= durationRangeS.min && lengthS <= durationRangeS.max,
    });
  }
  return ranges;
}

/**
 * Render the paste-ready `SEGMENTS` block. Ids and labels are placeholders on
 * purpose: naming the observed motion is part of the human review this probe
 * exists to feed (Requirement 3.5).
 *
 * @param {Record<string, { changes: readonly SceneChange[], durationS: number|null }>} resultsBySource
 * @param {{ durationRangeS?: { min: number, max: number }, threshold?: number }} [options]
 * @returns {string}
 */
export function formatSegmentsBlock(resultsBySource, options = {}) {
  const threshold = options.threshold ?? SCENE_CHANGE_THRESHOLD;
  const durationRangeS = options.durationRangeS ?? DURATION_RANGE_S;

  const lines = [
    "/* ─── paste-ready candidate block (advisory) ───────────────────────────── */",
    `/* scene-change threshold ${threshold}; lengths outside ` +
      `${durationRangeS.min.toFixed(2)}..${durationRangeS.max.toFixed(2)}s are flagged. */`,
    "export const SEGMENTS = [",
  ];

  for (const [key, result] of Object.entries(resultsBySource)) {
    const ranges = candidateRanges(result.changes, result.durationS, { durationRangeS });
    lines.push(`  // source "${key}" — ${ranges.length} candidate range(s)`);
    if (ranges.length === 0) {
      lines.push("  //   (no scene changes detected; pick boundaries by eye)");
      continue;
    }
    for (const range of ranges) {
      const flag = range.inRange ? "" : "  <-- LENGTH OUT OF RANGE, adjust by review";
      lines.push(
        `  { id: "${key}-cut-${String(range.index + 1).padStart(2, "0")}", ` +
          `source: "${key}", start: ${range.start.toFixed(2)}, end: ${range.end.toFixed(2)}, ` +
          `label: "TODO name the observed motion" }, // ${range.lengthS.toFixed(2)}s${flag}`,
      );
    }
  }

  lines.push("];");
  return lines.join("\n");
}

/* ───────────────────────────── ffmpeg execution ──────────────────────────── */

/**
 * Detect scene changes in one source. Writes nothing (`-f null -`).
 *
 * @param {{ key: string, file: string }} source
 * @param {{ ffmpegBin?: string, sourceDir?: string, cwd?: string, threshold?: number }} [options]
 * @returns {Promise<{ key: string, file: string, filePath: string, changes: SceneChange[] }>}
 */
export async function detectSceneChanges(source, options = {}) {
  const {
    ffmpegBin = DEFAULT_FFMPEG_BIN,
    sourceDir = SOURCE_DIR,
    cwd = process.cwd(),
    threshold = SCENE_CHANGE_THRESHOLD,
  } = options;

  const filePath = path.resolve(cwd, sourceDir, source.file);
  const args = buildDetectArgs(filePath, threshold);

  let stdout = "";
  let stderr = "";
  try {
    ({ stdout, stderr } = await execFileAsync(ffmpegBin, args, {
      timeout: DETECT_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      windowsHide: true,
    }));
  } catch (error) {
    // ffmpeg writes the metadata lines to stderr and can still exit non-zero on
    // a trailing warning; keep whatever it managed to print before re-raising.
    stdout = error?.stdout?.toString() ?? "";
    stderr = error?.stderr?.toString() ?? "";
    if (!/pts_time:/.test(stdout + stderr)) {
      const detail = stderr.trim() || error?.message || String(error);
      throw new Error(
        `scene detection failed for source "${source.key}" (${filePath}):\n  ${detail}\n` +
          `  command: ${ffmpegBin} ${args.join(" ")}`,
      );
    }
  }

  return {
    key: source.key,
    file: source.file,
    filePath,
    changes: parseSceneChanges(`${stdout}\n${stderr}`),
  };
}

/**
 * Probe every configured source and print the advisory report plus the
 * paste-ready block. Nothing is written to disk.
 *
 * @param {{ ffmpegBin?: string, sources?: Record<string, string>, sourceDir?: string, cwd?: string, threshold?: number, durationsBySource?: Record<string, number|null>, log?: ((line: string) => void)|null }} [options]
 * @returns {Promise<Record<string, { key: string, file: string, filePath: string, changes: SceneChange[], durationS: number|null }>>}
 */
export async function detectAllSegments(options = {}) {
  const {
    sources = SOURCES,
    log = console.log,
    durationsBySource = {},
    threshold = SCENE_CHANGE_THRESHOLD,
  } = options;

  const resultsBySource = {};
  for (const [key, file] of Object.entries(sources)) {
    const result = await detectSceneChanges({ key, file }, { ...options, threshold });
    result.durationS = durationsBySource[key] ?? null;
    resultsBySource[key] = result;

    if (log) {
      log(
        `scene changes in source ${key} (${file}) at threshold ${threshold}: ` +
          `${result.changes.length} detected`,
      );
      for (const change of result.changes) {
        const score = change.score === null ? "unknown" : change.score.toFixed(4);
        log(`  pts_time ${change.timeS.toFixed(2)}s  scene_score ${score}`);
      }
    }
  }

  if (log) {
    log("");
    log(formatSegmentsBlock(resultsBySource, { threshold }));
    log("");
    log(
      "advisory only: nothing was written. Review the footage, then hand-edit " +
        "SEGMENTS in scripts/mascot-clips/clipPipelineConfig.mjs.",
    );
  }

  return resultsBySource;
}

/* Direct run: `node scripts/mascot-clips/detectSegments.mjs [ffmpegPath]`.
 * The orchestrator (task 2.7) calls `detectAllSegments` under --probe-segments. */
const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const ffmpegBin = process.argv[2] ?? DEFAULT_FFMPEG_BIN;
  try {
    await detectAllSegments({ ffmpegBin });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
