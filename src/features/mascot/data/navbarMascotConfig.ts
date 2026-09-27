/**
 * Centralized configuration for the navbar Pingu Tiwari mascot.
 * Adheres to JLUG core rule: No magic numbers scattered across components.
 *
 * This is the ONLY place navbar-mascot sizing, timing and copy are declared.
 * The hooks (`../hooks/*`), the engine (`../engine/*`) and the view
 * (`../components/NavbarMascot*`) read every such value from here — they must
 * not restate a number or a string literal of their own. Tuning the mascot's
 * feel means editing this file and nothing else.
 *
 * Measured facts about the encoded clips (path, dimensions, duration, fps,
 * bytes) are NOT here: they live in `./navbarMascotClipManifest.generated.ts`,
 * written by `npm run mascot:clips`. Everything here is a hand-authored
 * preference; everything there is a measurement. Keeping the two apart is what
 * stops a tuned value from being overwritten by a pipeline rerun.
 *
 * Imported as `NAVBAR_MASCOT_CONFIG as NAV_CFG`, mirroring the 3D mascot's
 * `MASCOT_CONFIG as CFG` convention.
 */

export const NAVBAR_MASCOT_CONFIG = {
  // ── Geometry ──

  /**
   * Nav_Slot box, CSS px. Drives the slot container, the `<button>` and the
   * `<img>` width/height attributes, so the still and every clip occupy the
   * identical box and the still→clip swap contributes zero layout shift.
   *
   * 48 is fixed at every viewport width with no responsive variants: the
   * navigation row is ~56 px tall (a `text-base` wordmark inside `py-4`), so a
   * 48 px box centres inside the row without setting its height. It is also the
   * conventional 48 px minimum touch target, which matters below `md` where the
   * mascot sits immediately beside the MENU toggle.
   *
   * The clips are encoded at 96×96 — exactly 2× — so the slot renders at full
   * device pixels on a 2× display with no upscaling blur, and downsamples
   * cleanly on a 1× display.
   */
  slotSizePx: 48,

  // ── Timing ──

  /**
   * Extra time added to the activate clip's own measured duration (from the
   * generated manifest) before the engine resolves back to the idle or hover
   * clip. Summed into `ACTIVATION_DURATION_MS` in `./navbarMascotClips.ts`.
   *
   * A GIF exposes no "ended" event, so the return to idle is driven by a
   * `setTimeout`. Firing at exactly the clip's duration races the last frame:
   * `setTimeout` is a floor, not a guarantee, and the clip's duration is the sum
   * of its frame delays, which the decoder may round. 80 ms is a little over one
   * and a half frames at the clips' 20 fps (50 ms per frame) — enough to let the
   * final frame land and absorb normal timer jitter, short enough that nobody
   * perceives a pause before the mascot settles.
   */
  activationTailMs: 80,

  /**
   * Grace period after pointer-leave (or blur) before the idle clip is
   * requested. Debounced in `useNavbarMascot`, deliberately not in the engine,
   * so the engine's pointer-leave semantics stay immediate and testable.
   *
   * Without it, a pointer crossing the 48 px box on its way to the MENU button,
   * or skimming the button's own edge, would swap hover→idle→hover and visibly
   * restart both clips from frame 0. 120 ms is longer than such an incidental
   * crossing and well under the ~200 ms at which a deliberate pointer-out starts
   * to feel unresponsive.
   */
  hoverReleaseDelayMs: 120,

  /**
   * Abort a clip fetch that stalls; the mascot falls back to the still and the
   * button stays operable. Bounds the `AbortController` in `useClipSource`.
   *
   * Clips are at most 300 KB, so 6 s is generous even on a slow connection —
   * long enough that a merely sluggish network still yields an animated mascot,
   * short enough that a dead request does not leave a request hanging for the
   * page's lifetime. A decorative navbar element never justifies waiting longer.
   */
  clipFetchTimeoutMs: 6000,

  // ── Copy ──

  /**
   * Accessible name for the mascot `<button>` (`aria-label`). The clip `<img>`
   * itself is decorative (`alt=""`, `aria-hidden`), so this string is the whole
   * of what assistive technology announces — hence it names the character and
   * states what activating does, rather than describing the picture.
   *
   * "Pingu Tiwari" is the mascot's name, matching the committed asset names
   * (`pingu-tiwari.png`, `pingu-tiwari-still.png`). The name is unchanged under
   * reduced motion, where the still renders but the button stays focusable.
   */
  accessibleName: "Pingu Tiwari mascot — activate for a reaction",

  // ── Environment ──

  /**
   * Media query string for the reduced-motion signal, read via
   * `window.matchMedia` after mount in `usePrefersReducedMotion`. Named here so
   * the `subscribe` and `getSnapshot` halves of that `useSyncExternalStore`
   * cannot drift onto two different query strings.
   */
  reducedMotionQuery: "(prefers-reduced-motion: reduce)",
} as const;
