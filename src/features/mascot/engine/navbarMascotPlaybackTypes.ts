/**
 * Type surface of the navbar mascot's playback state machine.
 *
 * Types only — no runtime values live here, not even constants, because a
 * constant in this file would be a behavioural decision sitting outside the
 * transition table in `navbarMascotPlayback.ts`. `INITIAL_PLAYBACK_STATE` and
 * the three functions belong there; the shapes they speak in belong here.
 *
 * Everything imported from the registry is imported with `import type`, so the
 * compiled engine carries no value dependency on `data/navbarMascotClips` and
 * cannot trip that module's load-time role invariant just by being imported.
 * The registry arrives as a *parameter* (see `PlaybackResolver`) rather than an
 * import, which keeps the engine free of data coupling and lets property tests
 * resolve against arbitrary role-complete registries.
 *
 * Requirements 6.11 and 12.1: no React, no `next/*`, no `window`, `document`,
 * `fetch`, `performance` or timers anywhere in `engine/`. Timing, media queries,
 * visibility and DOM work all live above it in `hooks/`. The `engine` Vitest
 * project runs in `environment: "node"` precisely so that this is enforced
 * rather than merely documented.
 */

import type {
  ClipRole,
  MascotClip,
  MascotClipRegistry,
  MascotStill,
} from "../data/navbarMascotClips";

// ── State ──

/**
 * The three states playback can be in.
 *
 * Deliberately independent of `ClipRole`: the phase says what the mascot is
 * doing, the role says which file plays, and `resolveFrame` is the only thing
 * that maps between them. Reduced motion is *not* a phase — it is a flag on the
 * state, so that turning it off returns the mascot to whatever phase it was
 * already in (Requirement 9.4) instead of losing that information.
 */
export type PlaybackPhase = "resting" | "hovering" | "activating";

/**
 * The complete state of the machine. Immutable: `reducePlayback` returns a new
 * value rather than mutating, which is what makes the transition table
 * property-testable against arbitrary states.
 */
export interface PlaybackState {
  readonly phase: PlaybackPhase;
  /**
   * Last recorded pointer or focus state. Tracked separately from `phase`
   * because an activation in flight keeps its own clip while still recording
   * pointer movement (Requirement 6.8), so that activation-complete can resolve
   * to hover or idle according to where the pointer ended up (Requirement 6.7).
   */
  readonly pointerInside: boolean;
  /** Whether `prefers-reduced-motion: reduce` is currently reported. */
  readonly reducedMotion: boolean;
  /**
   * Monotone counter incremented on every activation start (Requirement 6.9).
   *
   * A GIF cannot be seeked or rewound through the DOM, so the only way to
   * restart one at frame 0 is to point the element at a fresh image resource.
   * This counter is the engine's contribution to that: it changes on every
   * activation, including an activation that interrupts one already playing, and
   * the DOM layer keys the image off it. The engine itself never reads the
   * counter for a decision — it only surfaces it through `ResolvedFrame`.
   */
  readonly restartKey: number;
}

// ── Events ──

/**
 * Every input the machine accepts. `reducePlayback` is an exhaustive switch over
 * `type` and therefore total over this union (Requirement 6.1) — adding a member
 * here fails the build until the transition table handles it.
 *
 * Note what is absent: no tick, no timeout, no media-query event. The activation
 * timer and the `matchMedia` subscription live in `hooks/`, and reach the engine
 * only as `ACTIVATION_COMPLETE` and `REDUCED_MOTION_CHANGED`. The hover-release
 * debounce is likewise a hook concern, so `POINTER_LEAVE` here means the release
 * has already been decided.
 */
export type PlaybackEvent =
  | { readonly type: "POINTER_ENTER" }
  | { readonly type: "POINTER_LEAVE" }
  | { readonly type: "ACTIVATE" }
  | { readonly type: "ACTIVATION_COMPLETE" }
  | { readonly type: "REDUCED_MOTION_CHANGED"; readonly reduced: boolean };

// ── Resolution ──

/**
 * The single thing to display for a given state (Requirement 6.2), as a
 * discriminated union on `kind` so that "a still is showing" and "a clip is
 * playing" cannot be confused for one another and neither variant carries
 * fields belonging to the other.
 *
 * The `still` variant pins `restartKey` to the literal `0`: a static image has
 * no playback position to restart, so there is nothing for the DOM layer to key
 * off. Pinning it in the type rather than just passing the state's value keeps
 * every reduced-motion frame identical, which is what lets `isSameFrame`
 * suppress re-renders while reduced motion holds.
 *
 * The `clip` variant carries the clip, its role, whether it loops, and the
 * current `restartKey` for the DOM layer to force a fresh GIF resource from
 * (Requirement 6.9).
 */
export type ResolvedFrame =
  | {
      readonly kind: "still";
      readonly still: MascotStill;
      readonly restartKey: 0;
    }
  | {
      readonly kind: "clip";
      readonly clip: MascotClip;
      readonly role: ClipRole;
      readonly loop: boolean;
      readonly restartKey: number;
    };

/**
 * Maps a state to exactly one displayable frame.
 *
 * The registry and the still are parameters, not imports, for two reasons: the
 * engine stays free of data coupling, and property tests can generate arbitrary
 * role-complete registries to resolve against. Total for every state and every
 * role-complete registry — there is no "nothing to show" case, because reduced
 * motion resolves to the still and every phase maps to a role the registry
 * guarantees is present.
 */
export type PlaybackResolver = (
  state: PlaybackState,
  registry: MascotClipRegistry,
  still: MascotStill,
) => ResolvedFrame;
