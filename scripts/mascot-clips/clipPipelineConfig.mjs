/**
 * Single source of truth for every media-pipeline tunable (Requirement 12.3).
 *
 * No other module under `scripts/mascot-clips/` may declare a tunable: paths,
 * geometry, frame rates, palette sizes, size budgets, duration limits and the
 * segment table all live here so animation tuning happens in one place.
 *
 * Plain Node ESM with no imports, so the pipeline needs no loader or build step.
 */

/** Read-only source media. The pipeline never writes inside this directory. */
export const SOURCE_DIR = "assets/mascot";

/** Fallback still, relative to SOURCE_DIR. */
export const STILL_SOURCE = "ChatGPT Image Sep 26, 2026, 03_48_55 PM.png";

/** Served copy of the fallback still, relative to the repository root. */
export const STILL_OUTPUT = "public/assets/mascot/pingu-tiwari-still.png";

/**
 * THE Still_Crop_Region: the square rectangle, in Source_Still pixel
 * coordinates, that the served fallback still is cropped to before scaling.
 *
 * Why this exists at all. STILL_SOURCE is not a single mascot pose — it is a
 * 2172x724 pixel-art *sprite sheet* holding roughly 25 poses in three rows.
 * Served verbatim it renders in the 48x48 Nav_Slot as a 48x16 strip of two dozen
 * tiny penguins, which is not a fallback still in any useful sense: it breaks
 * Requirement 10.1 (the still is what SSR and first paint show), Requirement
 * 10.2 (the still→idle-clip swap must not read as a content change) and
 * Requirement 9.2 (the still is the *whole* mascot under Reduced_Motion). So one
 * pose is cropped out of the sheet instead.
 *
 * Which pose. The first pose of row 1: a plain forward-facing stand, eyes open,
 * both flippers down, no sparkle or emote marks. It is the sheet's neutral pose
 * and therefore the closest match to the resting frame of the `idle` clip, which
 * is the clip the still is swapped for.
 *
 * How these numbers were measured. Every pixel of the sheet was classified as
 * ink (any channel below 240 at non-zero alpha) or background, then reduced to
 * column and row ink profiles to find the pose gutters. Row 1's first ink run is
 * x 222..373 and that pose's ink bounding box — body, feet and ground shadow —
 * is:
 *
 *   pose 1 (row 1)   x 222..373, y 69..270   → 152 x 202
 *
 * The neighbouring pose's ink begins at x=432, row 1's ink band ends at y=272
 * and row 2's begins at y=311, so the rect below reaches into no other pose.
 *
 * Why 248 on a side. The side length is set by scale parity with the clips, not
 * by the margin. A frame pulled out of `mascot-idle-blink.gif` measures the
 * resting mascot at 57x78 ink inside the 96x96 output, i.e. 81.3% of the height.
 * Reproducing that fill for a 202 px tall pose needs 202 x 96 / 78 = 248.6 px of
 * crop, so 248: the pose then lands at 202 x 96 / 248 = 78.2 px tall and
 * 58.8 px wide against the clip's 78 x 57, which is within a pixel on both axes.
 * A larger rect would shrink the mascot on the still→clip swap and a smaller one
 * would grow it; either pops.
 *
 * The rect is centred on the pose exactly — 174 + 421 = 595 = 222 + 373 and
 * 46 + 293 = 339 = 69 + 270 — leaving a 48 px horizontal and 23 px vertical
 * margin. The residual mismatch after the swap is vertical placement, not size:
 * the clip's mascot sits 16 px from the top of its 96 px box and 2 px from the
 * bottom, while a centred still sits 9 px from each edge, so the mascot settles
 * about 4 CSS px lower when the clip takes over in the 48 px slot. Centring is
 * kept regardless, because bottom-anchoring to match would leave the shadow 5 px
 * from the crop edge and read as clipped in the still itself.
 *
 * All four values are even, and x + width = 422 <= 2172, y + height = 294 <= 724,
 * so the rect is inside the Source_Still frame.
 *
 * Verified visually: the produced still shows exactly one penguin, centred and
 * uncut, at the same apparent size as the mascot in the encoded GIFs.
 */
export const STILL_CROP_RECT = { x: 174, y: 46, width: 248, height: 248 };

/** Served clip directory, relative to the repository root. */
export const CLIP_OUTPUT_DIR = "public/assets/mascot/clips";

/** Generated manifest of measured facts, relative to the repository root. */
export const MANIFEST_OUTPUT =
  "src/features/mascot/data/navbarMascotClipManifest.generated.ts";

/** Source videos, keyed by the short id used in the SEGMENTS table. */
export const SOURCES = {
  a: "gemini_generated_video_284857f9.mp4",
  b: "gemini_generated_video_3c0a4e76.mp4",
};

/** Output geometry — 96 px tall so the 48 px slot renders at 2× device pixels. */
export const OUTPUT_HEIGHT_PX = 96;

/**
 * THE Crop_Region: the one square rectangle, in source pixel coordinates, that
 * every segment is cropped to before scaling (Requirements 4.1, 4.10, 4.11).
 *
 * Why a crop exists at all. The sources are 1280x720 but the mascot occupies
 * roughly the middle third, so an uncropped `scale=-2:96` yields a 170x96 clip
 * in which the mascot is about 18 px tall inside the 48 px Nav_Slot — legible as
 * a smudge and nothing more. Cropping to the mascot first makes the same 96 px
 * of output height carry the mascot instead of white background.
 *
 * Why *one shared* rectangle rather than one per segment. The navbar swaps clips
 * on hover and click. A per-segment crop would rescale the mascot differently in
 * each clip, so it would visibly jump in size and position at every swap. A
 * single rect keeps the mascot pinned (Requirement 4.11), at the cost of the
 * rect being sized for the most demanding frame across all segments.
 *
 * Why square. The Nav_Slot is a 48x48 box and the output is 96x96, so a square
 * crop scales uniformly into it (Requirements 4.9, 4.10). A non-square crop
 * would need either anamorphic stretching or letterboxing.
 *
 * How these numbers were measured. Every frame of the three committed SEGMENTS
 * windows of source "a" was run through ffmpeg's `negate,cropdetect` (negate
 * first, because cropdetect looks for dark borders and this footage has a white
 * background). The per-segment unions of the detected mascot bounding box, in
 * source pixels:
 *
 *   idle-blink     x 440..840, y 158..635   (25 frames)
 *   hover-wave     x 388..835, y 156..635   (27 frames)  ← widest: raised flipper
 *   activate-hop   x 405..876, y  73..635   (24 frames)  ← tallest: airborne apex
 *   ────────────────────────────────────────────────────
 *   union          x 388..876, y  73..635   → 489 x 563
 *
 * The binding axis is vertical and it is the hop: the head reaches y=73 at the
 * apex while the ground shadow stays at y=635, so 563 px of vertical travel plus
 * body must fit no matter how little horizontal room the mascot needs. The
 * square side is therefore driven by that 563 px, rounded up to 592 to leave a
 * ~15 px (2.6%) margin on all four sides of the union — enough that sub-pixel
 * motion and cropdetect's own threshold slack cannot clip the hop apex, without
 * wasting so much of the frame that the mascot shrinks again.
 *
 * The rect is centred on the union's horizontal centre (x=632), giving 52 px of
 * spare room either side; that slack is unavoidable once the side length is
 * fixed by the vertical extent. The ground shadow is deliberately inside the
 * rect: it costs almost nothing (the feet already reach y≈622 at rest) and it is
 * what makes the hop read as leaving the ground.
 *
 * All four values are even so the crop lands on clean chroma boundaries, and
 * x + width = 928 <= 1280, y + height = 650 <= 720, so the rect is inside the
 * source frame.
 *
 * Verified visually: frames sampled across all three windows and a frame pulled
 * back out of each produced GIF show the mascot centred and uncut, including at
 * the hop apex.
 */
export const CROP_RECT = { x: 336, y: 58, width: 592, height: 592 };

/** Frame-rate window permitted by the spec; the ladder never leaves it. */
export const FPS_RANGE = { min: 12, max: 20 };

/**
 * Deterministic quality ladder. The first rung whose encode is within
 * MAX_CLIP_BYTES wins; rungs are tried strictly in order. The last rung is
 * 12 fps / 64 colours, so "reduce until 300 KB or 12 fps is reached" is
 * expressed as data rather than control flow.
 */
export const QUALITY_LADDER = [
  { fps: 20, palette: 128, dither: "bayer:bayer_scale=3" },
  { fps: 16, palette: 128, dither: "bayer:bayer_scale=3" },
  { fps: 16, palette: 96, dither: "bayer:bayer_scale=4" },
  { fps: 14, palette: 80, dither: "bayer:bayer_scale=4" },
  { fps: 12, palette: 64, dither: "bayer:bayer_scale=5" },
];

/** Per-clip size budget in bytes (300 KB). */
export const MAX_CLIP_BYTES = 300 * 1024; // 307200

/** Combined size budget across all clips in bytes (1200 KB). */
export const MAX_TOTAL_BYTES = 1200 * 1024; // 1228800

/** Permitted clip length window, seconds. */
export const DURATION_RANGE_S = { min: 0.6, max: 4.0 };

/** Advisory probe threshold used by --probe-segments only. */
export const SCENE_CHANGE_THRESHOLD = 0.25;

/**
 * THE authoritative segment table. Times are seconds authored to two decimals
 * (hundredth-of-a-second precision, Requirement 3.3), and nothing in the
 * pipeline mutates this table — encoding reads boundaries only from here, never
 * from a fresh probe, so reruns reproduce identical cuts (Requirements 3.6, 12.4).
 *
 * ── These are the reviewed values (task 2.4) ─────────────────────────────────
 * Replaces the placeholder table. Boundaries were chosen by human review of the
 * footage, not by the advisory probe: `detectSegments.mjs` at
 * SCENE_CHANGE_THRESHOLD reports *zero* cuts in either source, because both are
 * continuous single takes with no hard scene changes. Lowering the threshold
 * only surfaces per-frame motion peaks, which say when something moves but not
 * what moved — so the windows below come from looking at sampled frames.
 *
 * What the footage contains. Source "a" runs 20.01 s and loops one choreography
 * roughly every 10 s: stand + blink, one-flipper wave, crouch-and-hop, startle,
 * turn-around, mouth chatter, head tilt, sparkle celebration, waddle off-frame
 * and back, stand. Source "b" is a re-encode of the same first 10 s — matched
 * timestamps compare at SSIM 0.988–0.994 — so it carries no motion that "a"
 * does not, and "a" is the longer, higher-quality master. Every segment below
 * therefore comes from "a"; "b" stays in SOURCES because the pipeline still
 * probes and reports it.
 *
 * Why each window, with the two measurements used to decide (both taken on a
 * 440x440 crop around the mascot so the large white background does not dilute
 * them): `loop` = SSIM between the window's first and last frame, so higher
 * means a tighter loop seam; `travel` = max over the window of
 * 1 - SSIM(first frame, frame at t), so higher means the pose departs further
 * from the opening pose, i.e. the motion reads more strongly at a glance.
 *
 *   idle-blink        loop 0.950, travel 0.351 — the best loop seam measured and
 *                     the lowest travel, which is exactly the pairing an
 *                     always-on navbar loop needs. A still stand, one slow blink
 *                     around 0.55-0.75 s, then back to the opening pose: the
 *                     first and last frames are both neutral, eyes open,
 *                     flippers down, at the same body height. Extending the end
 *                     to 1.20 s drops the seam to 0.873 because the wave's
 *                     flipper has already started to rise, so 1.10 s is the edge.
 *   hover-wave        loop 0.906, travel 0.357 — a two-beat flipper wave: raise
 *                     above the head, down, up again, back to rest. Chosen for
 *                     hover because a wave reads as the mascot acknowledging
 *                     you, and the raised flipper breaks the silhouette above
 *                     the head so it is legible in a 48 px slot. It also loops
 *                     cleanly, which matters since hover holds this clip for as
 *                     long as the pointer stays. The 4.15-5.00 s turn-around
 *                     scored higher travel (0.500) but was rejected on two
 *                     counts: it rotates the mascot to show its *back*, which
 *                     reads as turning away from attention, and its seam is only
 *                     0.475, so it would visibly pop on every repeat.
 *   activate-hop      travel 0.539, the highest measured — crouch, launch,
 *                     airborne apex with both flippers spread and the ground
 *                     shadow detaching from the feet, land, settle. A whole-body
 *                     vertical gesture is the most unmistakable motion at 48 px,
 *                     and it stays well inside the source frame at the apex.
 *                     Seam quality is irrelevant here because activate plays
 *                     once, so the window is cut for gesture completeness
 *                     instead. It ends at 3.58 s, clear of the startle that
 *                     begins around 3.7 s.
 *
 * Every length sits inside DURATION_RANGE_S and inside source "a"'s probed
 * 20.010 s (Requirements 3.3, 3.4). Labels name the observed motion
 * (Requirement 3.5). Three segments, one per Clip_Role (Requirement 3.1).
 */
export const SEGMENTS = [
  // 1.10 s — subtle and seamlessly loopable; the navbar resting state.
  {
    id: "idle-blink",
    source: "a",
    start: 0.00,
    end: 1.10,
    label: "Idle stand with a slow blink",
  },
  // 1.20 s — the reaction-to-attention clip, held for as long as the pointer stays.
  {
    id: "hover-wave",
    source: "a",
    start: 1.25,
    end: 2.45,
    label: "Two-beat flipper wave",
  },
  // 1.08 s — the one-shot gesture played on click.
  {
    id: "activate-hop",
    source: "a",
    start: 2.50,
    end: 3.58,
    label: "Crouch and hop with flippers spread",
  },
];
