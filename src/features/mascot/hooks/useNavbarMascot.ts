/**
 * Owns the navbar mascot's playback state and flattens it into a view model.
 *
 * This is the seam between the pure engine and the browser. The engine decides
 * *what* should be displayed; this hook supplies the things the engine refuses
 * to know about — the activation timer, the `matchMedia` and visibility
 * signals, the hover-release debounce, and the GIF source lifecycle — and hands
 * the view a flat set of strings and callbacks. The view itself makes no
 * decisions.
 *
 * Every number and string comes from the registry or the central config; there
 * are no literals here.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import {
  ACTIVATION_DURATION_MS,
  HOVER_RELEASE_DELAY_MS,
  NAVBAR_MASCOT_CLIPS,
  NAVBAR_MASCOT_STILL,
  NAV_SLOT_SIZE_PX,
} from "../data/navbarMascotClips";
import { NAVBAR_MASCOT_CONFIG as NAV_CFG } from "../data/navbarMascotConfig";
import {
  INITIAL_PLAYBACK_STATE,
  reducePlayback,
  resolveFrame,
} from "../engine/navbarMascotPlayback";
import { useClipSource } from "./useClipSource";
import { useDocumentHidden, usePrefersReducedMotion } from "./useEnvironmentFlags";

/** Everything the view needs, and nothing it has to interpret. */
export interface NavbarMascotViewModel {
  /** `null` when even the still failed, so the box renders empty. */
  readonly imageSrc: string | null;
  /** Changes whenever a fresh image element is required. */
  readonly imageKey: string;
  readonly sizePx: number;
  readonly accessibleName: string;
  readonly onPointerEnter: () => void;
  readonly onPointerLeave: () => void;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
  readonly onActivate: () => void;
  readonly onImageError: () => void;
}

export function useNavbarMascot(): NavbarMascotViewModel {
  const [state, dispatch] = useReducer(reducePlayback, INITIAL_PLAYBACK_STATE);

  const prefersReducedMotion = usePrefersReducedMotion();
  const documentHidden = useDocumentHidden();

  /** Set only if the fallback still itself fails to load (Requirement 10.4). */
  const [stillFailed, setStillFailed] = useState(false);

  // Feed the media query into the machine. Guarded on a real difference so the
  // effect cannot loop, and so the engine sees one event per actual change
  // (Requirements 9.3, 9.4).
  useEffect(() => {
    if (prefersReducedMotion !== state.reducedMotion) {
      dispatch({ type: "REDUCED_MOTION_CHANGED", reduced: prefersReducedMotion });
    }
  }, [prefersReducedMotion, state.reducedMotion]);

  const frame = useMemo(
    () => resolveFrame(state, NAVBAR_MASCOT_CLIPS, NAVBAR_MASCOT_STILL),
    [state],
  );

  // Requirement 6.9's other half: a GIF fires no "ended" event, so the return
  // from an activation is a timer. Keyed on `restartKey`, so a repeat
  // activation's cleanup clears the previous timer and the countdown restarts
  // along with the clip. Skipped entirely under reduced motion, where there is
  // no activation to finish.
  useEffect(() => {
    if (state.phase !== "activating" || state.reducedMotion) return;

    const timer = setTimeout(
      () => dispatch({ type: "ACTIVATION_COMPLETE" }),
      ACTIVATION_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [state.phase, state.restartKey, state.reducedMotion]);

  // Hover release is debounced here rather than in the engine, so the engine's
  // POINTER_LEAVE stays immediate and testable. Without it, a pointer crossing
  // the box on its way to the MENU button would restart both clips.
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingRelease = useCallback(() => {
    if (releaseTimerRef.current !== null) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
  }, []);

  // Requirement 11.6: no timer outlives the component.
  useEffect(() => cancelPendingRelease, [cancelPendingRelease]);

  const onPointerEnter = useCallback(() => {
    cancelPendingRelease();
    dispatch({ type: "POINTER_ENTER" });
  }, [cancelPendingRelease]);

  const onPointerLeave = useCallback(() => {
    cancelPendingRelease();
    releaseTimerRef.current = setTimeout(() => {
      releaseTimerRef.current = null;
      dispatch({ type: "POINTER_LEAVE" });
    }, HOVER_RELEASE_DELAY_MS);
  }, [cancelPendingRelease]);

  // Keyboard focus is treated as hover (Requirements 8.4, 8.5). Activation is
  // the button's onClick, which native Enter/Space handling already triggers
  // (Requirement 8.3).
  const onActivate = useCallback(() => dispatch({ type: "ACTIVATE" }), []);

  const clipSource = useClipSource({
    clipId: frame.kind === "clip" ? frame.clip.id : null,
    path: frame.kind === "clip" ? frame.clip.path : null,
    restartKey: frame.restartKey,
    enabled: !state.reducedMotion && !documentHidden,
    stillPath: NAVBAR_MASCOT_STILL.path,
  });

  const onImageError = useCallback(() => {
    // Only a failed *still* is unrecoverable: a failed clip has already fallen
    // back to the still inside useClipSource.
    setStillFailed(true);
  }, []);

  const imageKey =
    clipSource.status === "clip" && frame.kind === "clip"
      ? `${frame.clip.id}:${frame.restartKey}`
      : "still";

  return {
    imageSrc: stillFailed ? null : clipSource.src,
    imageKey,
    sizePx: NAV_SLOT_SIZE_PX,
    accessibleName: NAV_CFG.accessibleName,
    onPointerEnter,
    onPointerLeave,
    onFocus: onPointerEnter,
    onBlur: onPointerLeave,
    onActivate,
    onImageError,
  };
}
