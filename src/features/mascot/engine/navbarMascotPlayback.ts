/**
 * The navbar mascot's playback state machine: an initial state, a total
 * transition function, a resolver from state to the one frame to display, and a
 * frame equality test.
 *
 * Everything here is pure and synchronous. There is no React, no `next/*`, no
 * `window`, `document`, `fetch`, `performance` and no timer anywhere in this
 * module, and the only value it imports is `getClipByRole` — a lookup over a
 * registry that arrives as a parameter (Requirements 6.11, 12.1). The activation
 * timer, the `matchMedia` subscription, the hover-release debounce and the GIF
 * source lifecycle all live above this layer in `hooks/`, and reach the machine
 * only as events. The `engine` Vitest project runs in `environment: "node"`, so
 * a stray browser global here fails the suite rather than passing unnoticed.
 *
 * Two design decisions are worth stating up front, because both are load-bearing
 * for consumers:
 *
 * - **No-ops return the same object.** When a transition changes nothing,
 *   `reducePlayback` hands back the state it was given, so a `useReducer`
 *   consumer does not re-render (Requirement 11.3). Every branch routes through
 *   `commit`, which makes that a property of the module rather than something
 *   each branch has to remember.
 * - **Reduced motion is checked before anything else.** `resolveFrame` returns
 *   the still before it touches the registry, so no clip path is ever derived
 *   while reduced motion holds — that is what backs "requests no clip file over
 *   the network" (Requirements 6.10, 9.2).
 */

import { getClipByRole, type ClipRole } from "../data/navbarMascotClips";
import type {
  PlaybackEvent,
  PlaybackPhase,
  PlaybackResolver,
  PlaybackState,
  ResolvedFrame,
} from "./navbarMascotPlaybackTypes";

// ── Initial state (Requirement 6.1) ──

/**
 * Where playback starts: resting, pointer outside, reduced motion off, restart
 * counter at zero.
 *
 * `reducedMotion: false` is the right cold start even on a machine that prefers
 * reduced motion, because the real value cannot be read during a server render.
 * The hook dispatches `REDUCED_MOTION_CHANGED` once it has mounted and can ask
 * `matchMedia`, and the view shows the still until a clip source is ready, so
 * the server and first client paints agree either way (Requirement 10.1).
 *
 * Frozen so a consumer that mutates state in place is caught here rather than
 * corrupting the shared constant for every later mount.
 */
export const INITIAL_PLAYBACK_STATE: PlaybackState = Object.freeze({
  phase: "resting",
  pointerInside: false,
  reducedMotion: false,
  restartKey: 0,
});

/**
 * Which clip role each phase plays. The phase→role mapping is the whole of the
 * engine's knowledge about clips, kept as data so the resolver reads as a lookup
 * rather than a second switch that could drift from the transition table.
 */
const ROLE_BY_PHASE: Readonly<Record<PlaybackPhase, ClipRole>> = {
  resting: "idle",
  hovering: "hover",
  activating: "activate",
};

/**
 * Return `state` when `next` is field-for-field identical to it, and `next`
 * otherwise.
 *
 * This is what makes the transition table's no-op cells genuinely free: a
 * repeated `POINTER_ENTER`, an `ACTIVATION_COMPLETE` arriving outside an
 * activation, or a `REDUCED_MOTION_CHANGED` carrying the value already held all
 * preserve object identity, so `useReducer` bails out of the re-render
 * (Requirement 11.3). Comparing the built candidate rather than guarding each
 * branch with its own condition means a branch cannot forget to do this.
 *
 * The comparison is exhaustive over `PlaybackState`'s four fields on purpose —
 * all four are primitives, so this is a complete value equality, not a partial
 * one.
 */
function commit(state: PlaybackState, next: PlaybackState): PlaybackState {
  return next.phase === state.phase &&
    next.pointerInside === state.pointerInside &&
    next.reducedMotion === state.reducedMotion &&
    next.restartKey === state.restartKey
    ? state
    : next;
}

// ── Transition function (Requirement 6.1) ──

/**
 * Apply one event to the current state.
 *
 * Total over `PlaybackEvent` by construction: the switch is exhaustive and the
 * default branch assigns `event` to `never`, so adding a member to the event
 * union fails the build here instead of silently falling through to a no-op.
 *
 * The transition table, with reduced-motion handling applying to any phase:
 *
 * | phase        | `POINTER_ENTER`            | `POINTER_LEAVE`             | `ACTIVATE`               | `ACTIVATION_COMPLETE`            |
 * | ------------ | -------------------------- | --------------------------- | ------------------------ | -------------------------------- |
 * | `resting`    | `hovering`, inside = true  | no-op (already outside)     | `activating`, key + 1    | no-op                            |
 * | `hovering`   | no-op, key unchanged       | `resting`, inside = false   | `activating`, key + 1    | no-op                            |
 * | `activating` | inside = true, clip kept   | inside = false, clip kept   | key + 1 (restart)        | `pointerInside ? hovering : resting` |
 *
 * `REDUCED_MOTION_CHANGED(true)` resets to resting with the pointer released
 * from any phase; `REDUCED_MOTION_CHANGED(false)` only clears the flag.
 */
export function reducePlayback(state: PlaybackState, event: PlaybackEvent): PlaybackState {
  switch (event.type) {
    case "POINTER_ENTER":
      // An activation in flight keeps its own clip and merely records that the
      // pointer is now inside, so completion can resolve to hover
      // (Requirements 6.8, 6.7). Outside an activation the pointer owns the
      // phase (Requirement 6.4).
      return commit(state, {
        ...state,
        phase: state.phase === "activating" ? "activating" : "hovering",
        pointerInside: true,
      });

    case "POINTER_LEAVE":
      // Symmetric to enter: retained clip plus recorded release while
      // activating (Requirement 6.8), back to resting otherwise
      // (Requirement 6.5). The grace period before a release is dispatched is
      // the hook's business, so leave here is immediate and testable.
      return commit(state, {
        ...state,
        phase: state.phase === "activating" ? "activating" : "resting",
        pointerInside: false,
      });

    case "ACTIVATE":
      // One branch for all three phases. `restartKey` increments on every
      // activation, including one that interrupts an activation already playing,
      // which is the engine's half of restarting a GIF from frame 0
      // (Requirement 6.9) — a fresh key lets the DOM layer point the element at a
      // fresh image resource. `pointerInside` is deliberately carried through
      // untouched: an activation says nothing about where the pointer is.
      return commit(state, {
        ...state,
        phase: "activating",
        restartKey: state.restartKey + 1,
      });

    case "ACTIVATION_COMPLETE":
      // Outside an activation there is nothing to complete, so the state is
      // returned unchanged rather than treated as a release. Inside one, the
      // last recorded pointer state decides where playback lands
      // (Requirement 6.7).
      return commit(state, {
        ...state,
        phase: state.phase === "activating" ? (state.pointerInside ? "hovering" : "resting") : state.phase,
      });

    case "REDUCED_MOTION_CHANGED":
      // Turning reduce on resets to resting and releases the pointer from
      // whatever phase was current. That reset is what makes leaving reduce land
      // on the looping idle clip (Requirement 9.4) instead of resuming a
      // half-finished activation whose timer was never started. Turning reduce
      // off only clears the flag — the phase is already resting if reduce was
      // ever on.
      return commit(
        state,
        event.reduced
          ? { phase: "resting", pointerInside: false, reducedMotion: true, restartKey: state.restartKey }
          : { ...state, reducedMotion: false },
      );

    default: {
      // Unreachable while the switch covers `PlaybackEvent`; the `never`
      // assignment is the compile-time guard that keeps it that way.
      const exhaustive: never = event;
      throw new Error(
        `navbarMascotPlayback: unhandled playback event ${JSON.stringify(exhaustive)}.`,
      );
    }
  }
}

// ── Resolution (Requirement 6.2) ──

/**
 * Map a state to exactly one displayable frame.
 *
 * Reduced motion is tested first and returns before the registry is consulted,
 * so no clip path is derived at all while it holds (Requirements 6.10, 9.2).
 * Otherwise the phase selects a role, the role selects the clip, and `loop` is
 * true for exactly the non-`activate` roles: idle and hover cycle
 * (Requirements 6.3, 6.4, 6.5) while an activation plays once
 * (Requirement 6.6). `restartKey` is surfaced unchanged for the DOM layer to
 * force a fresh GIF resource from (Requirement 6.9).
 *
 * Typed as `PlaybackResolver`, so the registry and still arrive as parameters:
 * the engine stays free of data coupling and property tests can resolve against
 * arbitrary role-complete registries. Total for every state against any such
 * registry — there is no "nothing to show" outcome.
 */
export const resolveFrame: PlaybackResolver = (state, registry, still): ResolvedFrame => {
  if (state.reducedMotion) {
    return { kind: "still", still, restartKey: 0 };
  }

  const role = ROLE_BY_PHASE[state.phase];
  return {
    kind: "clip",
    clip: getClipByRole(registry, role),
    role,
    loop: role !== "activate",
    restartKey: state.restartKey,
  };
};

/**
 * Whether two resolved frames would display identically.
 *
 * Two stills are always equal: there is one fallback still and it has no
 * playback position, so nothing about it can differ between two frames. Two
 * clips are equal when the clip id, the loop flag and the `restartKey` all
 * match — id and loop because they decide what plays and how, `restartKey`
 * because a bump means "start this same clip again from frame 0" and must not be
 * mistaken for no change. The clip's path and dimensions are not compared, since
 * they are properties of the id.
 *
 * This is what lets the hook skip emitting a new view model, and so skip
 * re-rendering the mascot, when a state change did not change what is on screen
 * (Requirement 11.3).
 */
export function isSameFrame(a: ResolvedFrame, b: ResolvedFrame): boolean {
  if (a.kind === "still" || b.kind === "still") {
    return a.kind === b.kind;
  }

  return a.clip.id === b.clip.id && a.loop === b.loop && a.restartKey === b.restartKey;
}
