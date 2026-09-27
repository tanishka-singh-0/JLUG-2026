/**
 * Toolchain provisioning for the mascot clip pipeline (Requirements 2.1, 2.2, 2.3).
 *
 * Responsibilities, in order:
 *   1. Verify `ffmpeg -version` / `ffprobe -version` are invocable, honouring the
 *      MASCOT_FFMPEG_BIN / MASCOT_FFPROBE_BIN overrides.
 *   2. If not, install through a Windows package manager (winget, then choco) and
 *      re-verify after each attempt, retrying the well-known install directories
 *      because an installer extends PATH only for *new* shells.
 *   3. If still not invocable, fail with the exact failing command plus the manual
 *      installation command.
 *
 * ── Error vs. exit code (documented split) ────────────────────────────────────
 * `ensureEncoder()` is a library function: on unrecoverable failure it *throws*
 * an `EncoderToolchainError` carrying `failingCommand` and `manualCommand`. The
 * CLI layer owns `process.exit(1)`. Two CLI layers exist:
 *   - the orchestrator (`generate-mascot-clips.mjs`, task 2.7), which catches the
 *     error, prints it via `reportEncoderFailure()` and exits non-zero;
 *   - this module's own `node scripts/mascot-clips/ensureEncoder.mjs` entry point
 *     below, which does the same, so the Requirement 2.3 exit-code behaviour is
 *     verifiable before the orchestrator exists.
 *
 * ── Tunables ─────────────────────────────────────────────────────────────────
 * `clipPipelineConfig.mjs` is the single source of truth for *media* tunables
 * (paths, geometry, frame rates, palette sizes, budgets, segments) and holds
 * nothing about provisioning. The constants below are platform facts about this
 * toolchain (package ids, install locations, process timeouts), not media knobs,
 * and they are used by this module alone — so they live here rather than being
 * added to a config file this task is not allowed to edit.
 *
 * Plain Node ESM, no dependencies.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

/** Binaries the pipeline needs, in report order. */
export const REQUIRED_BINARIES = ["ffmpeg", "ffprobe"];

/** Env var that pins an explicit binary, per required binary. */
export const BIN_OVERRIDE_ENV = {
  ffmpeg: "MASCOT_FFMPEG_BIN",
  ffprobe: "MASCOT_FFPROBE_BIN",
};

/** A `-version` probe should answer immediately; anything slower is a failure. */
const VERSION_TIMEOUT_MS = 20_000;

/** Package-manager installs download an archive; give them room. */
const INSTALL_TIMEOUT_MS = 10 * 60_000;

/** `ffmpeg -version` prints a banner; don't let it fill memory. */
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

/** Printed to the user when every automated attempt has failed (Requirement 2.3). */
export const MANUAL_INSTALL_COMMAND = "winget install --id Gyan.FFmpeg -e";

/** Package-manager attempts, tried strictly in this order (Requirement 2.2). */
export const INSTALL_ATTEMPTS = [
  {
    manager: "winget",
    file: "winget",
    args: [
      "install",
      "--id",
      "Gyan.FFmpeg",
      "-e",
      "--accept-source-agreements",
      "--accept-package-agreements",
    ],
  },
  {
    manager: "choco",
    file: "choco",
    args: ["install", "ffmpeg", "-y"],
  },
];

/** Package folder prefix winget extracts Gyan.FFmpeg into. */
const WINGET_PACKAGE_PREFIX = "Gyan.FFmpeg";

function subdirectories(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

/**
 * winget extracts a *portable archive* package into
 * `…\WinGet\Packages\<id>_<source>\<archive-root>\bin` and only adds a shim under
 * `…\WinGet\Links` when the manifest declares portable commands. Gyan.FFmpeg on
 * this machine produced no shim, so the extracted `bin` directories are searched
 * as well — the extraction root carries the ffmpeg version, so it cannot be a
 * hard-coded constant.
 */
function wingetPackageBinDirs(env = process.env) {
  const localAppData = env.LOCALAPPDATA;
  if (!localAppData) return [];
  const packagesRoot = path.join(localAppData, "Microsoft", "WinGet", "Packages");
  const dirs = [];
  for (const pkgDir of subdirectories(packagesRoot)) {
    if (!path.basename(pkgDir).startsWith(WINGET_PACKAGE_PREFIX)) continue;
    dirs.push(pkgDir, path.join(pkgDir, "bin"));
    for (const archiveRoot of subdirectories(pkgDir)) {
      dirs.push(archiveRoot, path.join(archiveRoot, "bin"));
    }
  }
  return dirs;
}

/**
 * Directories an installer drops the binaries into. Re-verification retries these
 * explicitly because `winget` / `choco` extend PATH for new shells only — the
 * already-running Node process never sees the updated PATH.
 */
export function wellKnownBinDirs(env = process.env) {
  const dirs = [];
  const localAppData = env.LOCALAPPDATA;
  if (localAppData) {
    dirs.push(path.join(localAppData, "Microsoft", "WinGet", "Links"));
  }
  dirs.push(
    path.join(env.ProgramData ?? "C:\\ProgramData", "chocolatey", "bin"),
    ...wingetPackageBinDirs(env),
  );
  // A candidate directory that does not exist is pointless to probe.
  return dirs.filter((dir) => fs.existsSync(dir));
}

/** Thrown when a binary cannot be made invocable. Carries what the CLI must print. */
export class EncoderToolchainError extends Error {
  constructor(message, { failingCommand, manualCommand, attempts = [] } = {}) {
    super(message);
    this.name = "EncoderToolchainError";
    /** The exact command that failed last, as a copy-pasteable string. */
    this.failingCommand = failingCommand;
    /** The command a human should run by hand. */
    this.manualCommand = manualCommand ?? MANUAL_INSTALL_COMMAND;
    /** Every command tried, in order, for diagnostics. */
    this.attempts = attempts;
  }
}

/** Render an argv pair as a copy-pasteable command string. */
function formatCommand(file, args = []) {
  const quote = (part) => (/\s/.test(part) ? `"${part}"` : part);
  return [quote(file), ...args.map(quote)].join(" ");
}

/**
 * Candidate invocations for one binary, most-preferred first.
 *
 * An explicit override is authoritative and is the *only* candidate, so the
 * failure branch is injectable: pointing MASCOT_FFMPEG_BIN at a missing file
 * cannot be masked by a PATH hit.
 */
export function encoderCandidates(name, env = process.env) {
  const override = env[BIN_OVERRIDE_ENV[name]];
  if (override && override.trim() !== "") {
    return [{ command: override.trim(), origin: "override" }];
  }
  return [
    { command: name, origin: "path" },
    ...wellKnownBinDirs(env).map((dir) => ({
      command: path.join(dir, `${name}.exe`),
      origin: "well-known-dir",
    })),
  ];
}

/** First line of a `-version` banner, e.g. `ffmpeg version 7.1 Copyright (c) ...`. */
function firstLine(text) {
  return String(text ?? "").split(/\r?\n/, 1)[0].trim();
}

/**
 * Try `<candidate> -version` for each candidate until one answers.
 *
 * @returns {Promise<{ resolved: object | null, attempts: object[] }>}
 *   `resolved` is `{ name, command, origin, version }` or null when all failed.
 */
export async function resolveBinary(name, env = process.env) {
  const attempts = [];
  for (const candidate of encoderCandidates(name, env)) {
    const command = formatCommand(candidate.command, ["-version"]);
    try {
      const { stdout } = await execFileAsync(candidate.command, ["-version"], {
        timeout: VERSION_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      });
      return {
        resolved: {
          name,
          command: candidate.command,
          origin: candidate.origin,
          version: firstLine(stdout),
        },
        attempts,
      };
    } catch (error) {
      attempts.push({ command, error: error?.message ?? String(error) });
    }
  }
  return { resolved: null, attempts };
}

/**
 * Resolve every required binary. Never installs and never throws — this is the
 * helper the rest of the pipeline reuses when it just needs the paths.
 *
 * @returns {Promise<{ ok: boolean, binaries: Record<string, object>, missing: string[], attempts: object[] }>}
 */
export async function resolveEncoderBinaries(env = process.env) {
  const binaries = {};
  const missing = [];
  const attempts = [];
  for (const name of REQUIRED_BINARIES) {
    const { resolved, attempts: tried } = await resolveBinary(name, env);
    attempts.push(...tried);
    if (resolved) binaries[name] = resolved;
    else missing.push(name);
  }
  return { ok: missing.length === 0, binaries, missing, attempts };
}

/** True when any required binary is pinned via an env override. */
function hasOverride(env = process.env) {
  return REQUIRED_BINARIES.some((name) => {
    const value = env[BIN_OVERRIDE_ENV[name]];
    return typeof value === "string" && value.trim() !== "";
  });
}

/**
 * Verify the encoder toolchain, installing it if necessary (Requirement 2.1–2.3).
 *
 * Resolution order per binary: env override, then bare PATH lookup, then the
 * well-known install directories.
 *
 * @param {object} [options]
 * @param {NodeJS.ProcessEnv} [options.env] Environment to read overrides from.
 * @param {(line: string) => void} [options.log] Progress sink.
 * @param {boolean} [options.allowInstall]
 *   Defaults to false when an override is pinned (an explicit binary is
 *   authoritative, so installing over it would be wrong and would make the
 *   failure branch slow to test) and true otherwise.
 * @returns {Promise<{ ffmpeg: string, ffprobe: string, binaries: Record<string, object>, installedVia: string | null, resolvedViaPath: boolean }>}
 *   `ffmpeg` / `ffprobe` are the invocations that actually answered — absolute
 *   paths when found in a well-known directory, bare command names when PATH
 *   resolved them. Callers MUST invoke these rather than assuming bare `ffmpeg`.
 * @throws {EncoderToolchainError} When a binary stays non-invocable.
 */
export async function ensureEncoder(options = {}) {
  const env = options.env ?? process.env;
  const log = options.log ?? ((line) => console.log(line));
  const allowInstall = options.allowInstall ?? !hasOverride(env);

  const allAttempts = [];

  let state = await resolveEncoderBinaries(env);
  allAttempts.push(...state.attempts);
  let installedVia = null;

  if (!state.ok && allowInstall) {
    log(
      `[encoder] not invocable: ${state.missing.join(", ")} — attempting installation`,
    );
    for (const attempt of INSTALL_ATTEMPTS) {
      const command = formatCommand(attempt.file, attempt.args);
      log(`[encoder] ${command}`);
      try {
        await execFileAsync(attempt.file, attempt.args, {
          timeout: INSTALL_TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          windowsHide: true,
        });
        log(`[encoder] ${attempt.manager} reported success`);
      } catch (error) {
        allAttempts.push({ command, error: error?.message ?? String(error) });
        log(`[encoder] ${attempt.manager} failed: ${firstLine(error?.message)}`);
      }

      // Re-verify after every attempt, including the well-known install dirs:
      // the installer only extended PATH for shells started after it ran.
      state = await resolveEncoderBinaries(env);
      allAttempts.push(...state.attempts);
      if (state.ok) {
        installedVia = attempt.manager;
        break;
      }
    }
  }

  if (!state.ok) {
    const lastAttempt = allAttempts.at(-1);
    throw new EncoderToolchainError(
      `ffmpeg toolchain unavailable: ${state.missing.join(", ")} could not be invoked`,
      {
        failingCommand: lastAttempt?.command ?? `${state.missing[0]} -version`,
        manualCommand: MANUAL_INSTALL_COMMAND,
        attempts: allAttempts,
      },
    );
  }

  for (const name of REQUIRED_BINARIES) {
    const binary = state.binaries[name];
    log(`[encoder] ${name}: ${binary.version}`);
    log(`[encoder] ${name} resolved via ${binary.origin} -> ${binary.command}`);
  }

  return {
    ffmpeg: state.binaries.ffmpeg.command,
    ffprobe: state.binaries.ffprobe.command,
    binaries: state.binaries,
    installedVia,
    resolvedViaPath: REQUIRED_BINARIES.every(
      (name) => state.binaries[name].origin === "path",
    ),
  };
}

/**
 * Print an `EncoderToolchainError` the way Requirement 2.3 demands: the failing
 * command and the manual installation command. Exiting is the caller's job.
 */
export function reportEncoderFailure(error, logError = console.error) {
  logError(`[encoder] ${error.message}`);
  if (error.failingCommand) {
    logError(`[encoder] failing command: ${error.failingCommand}`);
  }
  logError(
    `[encoder] install it manually, then re-run: ${
      error.manualCommand ?? MANUAL_INSTALL_COMMAND
    }`,
  );
}

/**
 * CLI entry point: `node scripts/mascot-clips/ensureEncoder.mjs`.
 * Exists so the Requirement 2.3 exit code is verifiable on its own; the
 * orchestrator in task 2.7 reuses `ensureEncoder` + `reportEncoderFailure`.
 */
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    await ensureEncoder();
  } catch (error) {
    if (error instanceof EncoderToolchainError) {
      reportEncoderFailure(error);
      process.exit(1);
    }
    throw error;
  }
}
