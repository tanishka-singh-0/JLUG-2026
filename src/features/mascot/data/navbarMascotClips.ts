/**
 * Clip registry for the navbar Pingu Tiwari mascot.
 *
 * This module is the single place the navbar mascot's UI reads paths, pixel
 * dimensions and timings from (Requirement 5.5). It joins two sources that must
 * stay apart:
 *
 * - `./navbarMascotClipManifest.generated.ts` — measured facts (path, width,
 *   height, duration), rewritten by `npm run mascot:clips`. Never hand-edited.
 * - `./navbarMascotConfig.ts` — hand-authored preferences (slot size, timings).
 *
 * What is authored *here* is the third, small thing neither of those can own:
 * which clip plays in which role, and the human label for each clip. A pipeline
 * rerun must not be able to reassign roles, and tuning a timing must not be able
 * to change a measurement — so role and label live in this file alone.
 *
 * The registry is built at module load. If a role is missing or claimed twice,
 * this module throws while it is being imported, so "exactly one clip per role"
 * (Requirement 5.2) is a load-time invariant rather than something the playback
 * engine has to defend against at runtime. `getClipByRole` is total for the
 * three roles because of it.
 *
 * DOM-free and Node-importable on purpose: the playback engine imports these
 * types, and the `engine` Vitest project runs in plain Node with no jsdom. No
 * React, no `next/*`, no browser globals belong in this file.
 */

import {
  NAVBAR_MASCOT_CLIP_MANIFEST,
  NAVBAR_MASCOT_STILL_MANIFEST,
} from "./navbarMascotClipManifest.generated";
import { NAVBAR_MASCOT_CONFIG as NAV_CFG } from "./navbarMascotConfig";

// ── Types (Requirement 5.6) ──

/**
 * The roles the navbar consumes, in resolution order. The runtime tuple is the
 * source of truth and `ClipRole` is derived from it, so the completeness check
 * below and the type can never drift apart — adding a fourth role here makes
 * the build fail until a clip is mapped to it.
 */
export const CLIP_ROLES = ["idle", "hover", "activate"] as const;

/** The role a clip plays in the navbar. */
export type ClipRole = (typeof CLIP_ROLES)[number];

/** One playable clip: measured facts joined to its authored role and label. */
export interface MascotClip {
  readonly id: string;
  readonly label: string;
  readonly role: ClipRole;
  /** Path as served, rooted at `public/`. */
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly durationMs: number;
}

/** The non-animated fallback rendered under reduced motion or on clip failure. */
export interface MascotStill {
  readonly path: string;
  readonly width: number;
  readonly height: number;
}

export type MascotClipRegistry = ReadonlyArray<MascotClip>;

/**
 * The slice of a generated manifest entry the registry consumes. Deliberately
 * narrower than what the manifest carries: `fps` and `bytes` are pipeline
 * budget facts that the UI has no business reading, so they stop here.
 */
interface ClipMeasurement {
  readonly id: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly durationMs: number;
}

// ── Authored role and label assignment ──

/**
 * Clip id → role. Ids come from the committed `SEGMENTS` table in
 * `scripts/mascot-clips/clipPipelineConfig.mjs`.
 *
 * A manifest entry with no entry here is dropped rather than rejected, so the
 * pipeline may produce more clips than the navbar consumes — an extra segment
 * can be encoded and reviewed before anything in the UI depends on it.
 */
const ROLE_BY_CLIP_ID: Readonly<Record<string, ClipRole>> = {
  "idle-blink": "idle",
  "hover-wave": "hover",
  "activate-hop": "activate",
};

/**
 * Clip id → human label, carried over from the reviewed segment table. Labels
 * are for developers reading the registry and for debugging output; the
 * mascot's accessible name is `NAV_CFG.accessibleName`, since the clip `<img>`
 * itself is decorative.
 */
const LABEL_BY_CLIP_ID: Readonly<Record<string, string>> = {
  "idle-blink": "Idle stand with a slow blink",
  "hover-wave": "Two-beat flipper wave",
  "activate-hop": "Crouch and hop with flippers spread",
};

// ── Registry construction ──

/**
 * Join measurements to authored roles and labels, returning the clips ordered
 * by `CLIP_ROLES`.
 *
 * Exported so the invariant can be exercised with synthetic manifests: the
 * generated file is the real machine's measurements and must never be mutated
 * to provoke a failure case.
 *
 * @throws if two measurements claim the same role, if a roled clip has no
 * label (a clip that reached the UI incomplete would break Requirement 5.1), or
 * if any role in `CLIP_ROLES` goes unclaimed.
 */
export function buildClipRegistry(
  measurements: ReadonlyArray<ClipMeasurement>,
  roleByClipId: Readonly<Record<string, ClipRole>>,
  labelByClipId: Readonly<Record<string, string>>,
): MascotClipRegistry {
  const byRole = new Map<ClipRole, MascotClip>();

  for (const measurement of measurements) {
    const role = roleByClipId[measurement.id];
    if (role === undefined) {
      // No role assigned: a clip the pipeline produced but the navbar does not
      // consume yet. Dropping it is the documented behaviour, not an oversight.
      continue;
    }

    const claimed = byRole.get(role);
    if (claimed !== undefined) {
      throw new Error(
        `navbarMascotClips: clips "${claimed.id}" and "${measurement.id}" both claim role "${role}". ` +
          `Exactly one clip per role is required — fix ROLE_BY_CLIP_ID in navbarMascotClips.ts.`,
      );
    }

    const label = labelByClipId[measurement.id];
    if (label === undefined) {
      throw new Error(
        `navbarMascotClips: clip "${measurement.id}" has role "${role}" but no label. ` +
          `Add it to LABEL_BY_CLIP_ID in navbarMascotClips.ts.`,
      );
    }

    byRole.set(role, {
      id: measurement.id,
      label,
      role,
      path: measurement.path,
      width: measurement.width,
      height: measurement.height,
      durationMs: measurement.durationMs,
    });
  }

  // Walking CLIP_ROLES rather than the map both orders the registry and
  // collects every missing role for one actionable message.
  const clips: MascotClip[] = [];
  const missingRoles: ClipRole[] = [];
  for (const role of CLIP_ROLES) {
    const clip = byRole.get(role);
    if (clip === undefined) {
      missingRoles.push(role);
    } else {
      clips.push(clip);
    }
  }

  if (missingRoles.length > 0) {
    throw new Error(
      `navbarMascotClips: no clip is mapped to role(s) ${missingRoles.map((role) => `"${role}"`).join(", ")}. ` +
        `Encode the missing segment with \`npm run mascot:clips\` and map its id in ROLE_BY_CLIP_ID.`,
    );
  }

  return Object.freeze(clips);
}

/**
 * Requirements 5.1, 5.2: every clip complete, exactly one per role. Built at
 * module load, so a broken mapping fails the import rather than a render.
 */
export const NAVBAR_MASCOT_CLIPS: MascotClipRegistry = buildClipRegistry(
  NAVBAR_MASCOT_CLIP_MANIFEST,
  ROLE_BY_CLIP_ID,
  LABEL_BY_CLIP_ID,
);

/** Requirement 5.3: the fallback still's served path and pixel dimensions. */
export const NAVBAR_MASCOT_STILL: MascotStill = NAVBAR_MASCOT_STILL_MANIFEST;

/**
 * Look up the single clip carrying `role`.
 *
 * Total for every `ClipRole` against any role-complete registry, which is what
 * `buildClipRegistry` guarantees for `NAVBAR_MASCOT_CLIPS`. The throw is
 * reachable only for a registry assembled some other way (an engine property
 * test's generated registry, say) and states what was wrong with it, rather
 * than handing back `undefined` under a non-null assertion.
 */
export function getClipByRole(registry: MascotClipRegistry, role: ClipRole): MascotClip {
  const clip = registry.find((candidate) => candidate.role === role);
  if (clip === undefined) {
    throw new Error(`navbarMascotClips: registry has no clip for role "${role}".`);
  }
  return clip;
}

// ── Named values the UI reads from here (Requirement 5.4) ──

/**
 * Nav_Slot display size, CSS px. Re-exported from the config so the slot, the
 * `<button>` and the `<img>` attributes all read one name from one module.
 */
export const NAV_SLOT_SIZE_PX = NAV_CFG.slotSizePx;

/**
 * How long the activation clip owns the mascot: its own measured duration plus
 * the configured tail that lets the last frame land before the engine resolves
 * back to idle or hover. Derived here because it is the one timing that spans
 * both a measurement and a preference.
 */
export const ACTIVATION_DURATION_MS =
  getClipByRole(NAVBAR_MASCOT_CLIPS, "activate").durationMs + NAV_CFG.activationTailMs;

/** Grace period after pointer-leave before the idle clip is requested. */
export const HOVER_RELEASE_DELAY_MS = NAV_CFG.hoverReleaseDelayMs;
