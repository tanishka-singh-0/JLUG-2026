# Implementation Plan: navbar-mascot-animations

## Overview

Implementation follows the four layers in the design, bottom-up, with test tooling installed first so the pure layers can be property-tested as they land.

Order and the reasons it is forced:

1. **Test tooling** (Vitest with the node `engine` project and the jsdom `ui` project, plus `fast-check`) comes first because every pure-layer task below ships with property tests.
2. **Media pipeline** runs before the registry is finalized, because the registry consumes a generated manifest of *measured* facts. Within the pipeline: provision the encoder → probe the sources → run the advisory scene-change probe and commit the hand-authored segment table → encode with the two-pass palettegen/paletteuse ladder → copy the fallback still → emit the generated manifest.
3. **Playback engine** depends only on registry *types* (the resolver takes the registry as a parameter), so it proceeds in parallel with the pipeline test tasks once `navbarMascotClips.ts` exists.
4. **Hooks** depend on the engine and the registry; the presentational view and the thin container depend on the hooks; the `SiteNav.tsx` mount is last.

Language: TypeScript for all `src/` modules and tests, plain `.mjs` for the pipeline (no loader or build step). Pipeline scripts are Node ESM; `engine/` must stay DOM-free and Node-importable.

## Tasks

- [x] 1. Test tooling and package scripts
  - [x] 1.1 Install the test runner and wire every npm script
    - Add devDependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `vite-tsconfig-paths`, `fast-check` (pinned versions)
    - Create `vitest.config.mts` with two projects: `engine` (`environment: "node"`, matching `src/features/mascot/{engine,data}/**/*.test.ts` and `scripts/mascot-clips/**/*.test.ts`) and `ui` (`environment: "jsdom"`, matching `src/features/mascot/{hooks,components}/**/*.test.tsx` and `src/components/**/*.test.tsx`); resolve `@/*` via `vite-tsconfig-paths`
    - Add scripts in one edit: `"test": "vitest --run"`, `"test:watch": "vitest"`, `"mascot:clips"`, `"mascot:clips:probe"` (`--probe-segments`), `"mascot:clips:verify"` (`--verify-only`)
    - The node `engine` project running without jsdom is itself the guard for the DOM-free requirement
    - _Requirements: 12.1, 12.2_

- [x] 2. Media pipeline
  - [x] 2.1 Create `scripts/mascot-clips/clipPipelineConfig.mjs`
    - Export every tunable: `SOURCE_DIR`, `STILL_SOURCE`, `STILL_OUTPUT`, `CLIP_OUTPUT_DIR`, `MANIFEST_OUTPUT`, `SOURCES`, `OUTPUT_HEIGHT_PX = 96`, `FPS_RANGE`, `QUALITY_LADDER` (5 rungs, 20→12 fps, 128→64 colours), `MAX_CLIP_BYTES = 307200`, `MAX_TOTAL_BYTES = 1228800`, `DURATION_RANGE_S`, `SCENE_CHANGE_THRESHOLD`, and the starting `SEGMENTS` table
    - No other pipeline module may declare a tunable
    - _Requirements: 12.3, 4.2, 4.4, 4.5, 3.6_

  - [x] 2.2 Create `scripts/mascot-clips/ensureEncoder.mjs` and confirm the toolchain on this machine
    - `ensureEncoder()`: verify `ffmpeg -version` / `ffprobe -version` via `execFile`, honouring `MASCOT_FFMPEG_BIN` / `MASCOT_FFPROBE_BIN` overrides so the failure branch is injectable
    - On failure attempt `winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements`, then `choco install ffmpeg -y`, re-verifying after each and retrying the well-known install locations (`%LOCALAPPDATA%\Microsoft\WinGet\Links`, `C:\ProgramData\chocolatey\bin`) because installers only extend `PATH` for new shells
    - If still not invocable, print the failing command plus the manual command and `process.exit(1)`
    - Run `npm run mascot:clips:verify` once to confirm both binaries are invocable here
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.3 Create `scripts/mascot-clips/probeSources.mjs`
    - `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -show_entries format=duration -of json`
    - Return `{ width, height, fps, nbFrames, durationS }` per source and print all four facts
    - Export a validator that fails with the offending segment id when a declared range falls outside the probed duration, and expose the source aspect ratio for the encode step
    - _Requirements: 2.4, 3.3, 4.1_

  - [x] 2.4 Create `scripts/mascot-clips/detectSegments.mjs` and commit the final segment table
    - Under `--probe-segments` only: `ffmpeg -hide_banner -i <source> -an -vf "select='gt(scene,<threshold>)',metadata=print:file=-" -f null -`, parse `pts_time`, clamp to two decimals, print a paste-ready `SEGMENTS` block, write nothing
    - Run the probe against both sources, pick boundaries by review, and replace `SEGMENTS` in `clipPipelineConfig.mjs` with at least three single-motion entries (one per role) carrying human-readable labels and 0.60–4.00 s lengths
    - Boundary selection stays a human decision so encoding reads boundaries only from the committed table and reruns reproduce identical cuts
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.5 Create `scripts/mascot-clips/encodeClips.mjs`
    - Pass 1 palette: `-ss`/`-t` before `-i`, `fps=<fps>,scale=-2:96:flags=lanczos,palettegen=max_colors=<n>:stats_mode=diff`, single frame to a `node:os.tmpdir()` PNG
    - Pass 2 encode: same `-ss`/`-t` ordering, `-lavfi "fps=<fps>,scale=-2:96:flags=lanczos[v];[v][1:v]paletteuse=dither=<dither>:diff_mode=rectangle" -loop 0`
    - Export the pure `selectLadderRung(rungs, encodeFn)`: walk `QUALITY_LADDER` strictly in order, stop at the first rung at or under `MAX_CLIP_BYTES`, fail with clip id and measured bytes when the ladder is exhausted
    - Delete temp palette PNGs; nothing extra gets committed
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7_

  - [x] 2.6 Create `scripts/mascot-clips/writeManifest.mjs`
    - Copy the Source_Still to `public/assets/mascot/pingu-tiwari-still.png` with `fs.copyFile` (sources are read-only)
    - `existsSync` before every write and log `overwrite: <path>`
    - Re-probe each produced GIF (width, height, nb_frames, duration) and `fs.stat` its bytes; check the summed size against `MAX_TOTAL_BYTES` and exit non-zero with the total when exceeded
    - Emit `src/features/mascot/data/navbarMascotClipManifest.generated.ts` with a do-not-edit header, entries sorted by clip id, plus `NAVBAR_MASCOT_STILL_MANIFEST`
    - Print name, duration, dimensions and bytes for every clip
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.5, 4.8_

  - [x] 2.7 Create `scripts/mascot-clips/generate-mascot-clips.mjs`
    - Orchestrate: `ensureEncoder` → `probeSources` → validate segments → `encodeClips` → `writeManifest`
    - Support `--verify-only` (toolchain check then exit 0) and `--probe-segments` (advisory probe then exit 0, no writes)
    - Propagate non-zero exit codes from every failure branch
    - _Requirements: 12.2, 2.1_

  - [x] 2.8 Run the pipeline and commit the generated media
    - `npm run mascot:clips` end to end, producing `public/assets/mascot/pingu-tiwari-still.png`, the clip GIFs under `public/assets/mascot/clips/`, and the generated manifest
    - Confirm the printed report: three or more clips, each ≤ 300 KB, total ≤ 1200 KB, every duration in 0.60–4.00 s, every fps in 12–20
    - _Requirements: 1.1, 1.2, 3.1, 4.4, 4.5, 4.8_

  - [ ]* 2.9 Write property test for the segment table
    - **Property 12: Every declared motion segment is a single valid in-range cut**
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - `scripts/mascot-clips/encodeClips.test.ts`, node project, `fc.assert(..., { numRuns: 100 })`, probed durations stubbed

  - [ ]* 2.10 Write property test for the size ladder selector
    - **Property 14: The size ladder descends in order and stops at the first rung within budget**
    - **Validates: Requirements 4.6, 4.2, 4.7**
    - Inject an arbitrary rung→bytes function as `encodeFn`; assert attempt order, first-in-budget selection, rung membership, and failure on exhaustion

  - [ ]* 2.11 Write pipeline failure-branch tests with injected fakes (optional quality hardening — not required for the feature to work)
    - Encoder-missing path via `MASCOT_FFMPEG_BIN` pointing at a non-existent binary: non-zero exit, failing command and manual command printed
    - Out-of-range segment rejected before any encode, naming the segment id
    - Oversized clip at the last rung and over-budget total both exit non-zero with the measured numbers
    - _Requirements: 2.3, 3.3, 4.5, 4.7_

  - [ ]* 2.12 Add a rerun-determinism check (optional quality hardening — not required for the feature to work)
    - Record clip file names and durations, rerun `npm run mascot:clips` with an unchanged config, assert the same name set and the same durations
    - _Requirements: 12.4_

- [x] 3. Checkpoint - pipeline and generated assets
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Clip registry data layer
  - [x] 4.1 Create `src/features/mascot/data/navbarMascotConfig.ts`
    - `NAVBAR_MASCOT_CONFIG as const`: `slotSizePx: 48`, `activationTailMs`, `hoverReleaseDelayMs`, `reducedMotionQuery`, `clipFetchTimeoutMs`, `accessibleName`
    - _Requirements: 5.4, 7.3_

  - [x] 4.2 Create `src/features/mascot/data/navbarMascotClips.ts`
    - Declare `ClipRole`, `MascotClip`, `MascotStill`, `MascotClipRegistry`
    - Author `ROLE_BY_CLIP_ID` and `LABEL_BY_CLIP_ID`; build `NAVBAR_MASCOT_CLIPS` by mapping the generated manifest through the role map, dropping role-less entries and throwing at module load on a missing or duplicated role so exactly-one-per-role is a load-time invariant
    - Export `NAVBAR_MASCOT_STILL`, the total `getClipByRole(registry, role)`, and `ACTIVATION_DURATION_MS = activate.durationMs + activationTailMs`
    - This module is the only place the UI reads paths, dimensions and timings from
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 4.3 Write property test for registry completeness
    - **Property 11: Every registry entry is complete and roles are uniquely assigned**
    - **Validates: Requirements 5.1, 5.2, 1.2**
    - `src/features/mascot/data/navbarMascotClips.test.ts`, node project; assert kebab-case `.gif` paths under the served clips directory and positive width/height/duration

  - [ ]* 4.4 Write property test for the generated manifest
    - **Property 13: Every encoded clip meets the geometry, frame-rate and size budget**
    - **Validates: Requirements 4.1, 4.2, 4.4, 3.4**
    - Assert 96 px height, source aspect ratio within one pixel of rounding tolerance, fps in 12–20, duration in 0.60–4.00 s, bytes ≤ 307200

- [x] 5. Playback engine
  - [x] 5.1 Create `src/features/mascot/engine/navbarMascotPlaybackTypes.ts`
    - `PlaybackPhase`, `PlaybackState` (`phase`, `pointerInside`, `reducedMotion`, `restartKey`), the `PlaybackEvent` union, the `ResolvedFrame` union, `PlaybackResolver`
    - Type-only imports from `data/navbarMascotClips`; no React, no `next/*`, no browser globals
    - _Requirements: 6.1, 6.2, 6.11, 12.1_

  - [x] 5.2 Create `src/features/mascot/engine/navbarMascotPlayback.ts`
    - `INITIAL_PLAYBACK_STATE`; `reducePlayback` as an exhaustive switch implementing the design's transition table, including activation retaining its clip across pointer events, `restartKey + 1` on every `ACTIVATE`, completion branching on `pointerInside`, and `REDUCED_MOTION_CHANGED(true)` resetting to resting
    - `resolveFrame` checking reduced motion first and returning the still before any registry lookup, then mapping resting/hovering/activating to the `idle`/`hover`/`activate` clips with `loop` true exactly for the non-`activate` roles and `restartKey` surfaced
    - `isSameFrame` comparing clip id, loop and `restartKey`
    - _Requirements: 6.1–6.11, 12.1_

  - [ ]* 5.3 Write unit tests for the engine
    - `src/features/mascot/engine/navbarMascotPlayback.test.ts`: initial state, every cell of the transition table, `isSameFrame` equality and inequality
    - _Requirements: 6.1, 6.7, 6.8, 11.3_

  - [ ]* 5.4 Write property test for transition totality
    - **Property 1: Transitions are total over the event union**
    - **Validates: Requirements 6.1, 6.11, 12.1**
    - `src/features/mascot/engine/navbarMascotPlayback.property.test.ts` with `arbPlaybackState` / `arbPlaybackEvent`, 100 runs, node project

  - [ ]* 5.5 Write property test for resolution totality
    - **Property 2: Resolution is total, single-valued and registry-closed**
    - **Validates: Requirements 6.2, 6.3, 5.1, 5.2**
    - Uses `arbRoleCompleteRegistry` so the engine is exercised against arbitrary registries

  - [ ]* 5.6 Write property test for reduced-motion dominance
    - **Property 3: Reduced motion dominates every event sequence**
    - **Validates: Requirements 6.10, 9.2, 9.3**
    - Uses `arbEventSequence`; assert the frame is the still and no clip is referenced

  - [ ]* 5.7 Write property test for the quiescent resolution
    - **Property 4: The quiescent resolution is the looping idle clip**
    - **Validates: Requirements 6.3, 6.5, 6.7**

  - [ ]* 5.8 Write property test for hover resolution
    - **Property 5: Pointer-enter with no activation in flight resolves to the looping hover clip**
    - **Validates: Requirements 6.4**

  - [ ]* 5.9 Write property test for activation retention
    - **Property 6: Activation retains the non-looping activate clip across pointer events**
    - **Validates: Requirements 6.6, 6.8**

  - [ ]* 5.10 Write property test for activation restart counting
    - **Property 7: Each activation restarts the clip exactly once**
    - **Validates: Requirements 6.9**

  - [ ]* 5.11 Write property test for activation completion
    - **Property 8: Activation completion follows the last recorded pointer event**
    - **Validates: Requirements 6.7, 6.8**

  - [ ]* 5.12 Write property test for pointer idempotence
    - **Property 9: Repeated identical pointer events are idempotent**
    - **Validates: Requirements 6.4, 6.5, 11.3**

  - [ ]* 5.13 Write property test for leaving reduced motion
    - **Property 10: Leaving reduced motion returns to the idle clip**
    - **Validates: Requirements 9.4**

- [x] 6. Checkpoint - registry and engine
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. React hooks
  - [x] 7.1 Create `src/features/mascot/hooks/useEnvironmentFlags.ts`
    - `usePrefersReducedMotion` and `useDocumentHidden` as `useSyncExternalStore` subscriptions over `matchMedia(reducedMotionQuery)` `change` and `document` `visibilitychange`
    - `subscribe` returns the matching `removeEventListener`; `getServerSnapshot` returns `false` for both; `matchMedia` is touched only inside `subscribe`/`getSnapshot`, i.e. after mount
    - Treat a missing `matchMedia` as reduced motion off
    - _Requirements: 9.1, 11.3, 11.4, 11.5, 11.6, 10.1_

  - [-] 7.2 Create `src/features/mascot/hooks/useClipSource.ts`
    - Accept `{ clipId, path, restartKey, enabled }`; return `{ src, status }` over `"still" | "clip" | "error"`
    - Session `blobsRef: Map<clipId, Blob>`; a clip is fetched the first time its id appears, so hover and activate stay unrequested until their event fires and nothing is fetched while reduced motion holds
    - Mint one `URL.createObjectURL(blob)` per restart and revoke the previous URL first, so at most one clip resource is live; a fresh `blob:` URL is the only reliable way to start a GIF at frame 0
    - `AbortController` plus `clipFetchTimeoutMs`; reject/timeout/abort sets `error`, which renders the still while leaving the button operable
    - `enabled: false` (hidden document or reduced motion) swaps to the still and revokes the live URL; re-enabling mints a new URL from the cached blob with no network cost
    - Degrade to the cache-busting query form when `fetch` or `createObjectURL` is unavailable
    - Return the still until the idle blob is ready
    - _Requirements: 9.2, 10.2, 10.3, 11.2, 11.4, 11.5, 11.6, 11.7_

  - [~] 7.3 Create `src/features/mascot/hooks/useNavbarMascot.ts`
    - `useReducer(reducePlayback, INITIAL_PLAYBACK_STATE)`; dispatch `REDUCED_MOTION_CHANGED` whenever `usePrefersReducedMotion()` differs from `state.reducedMotion`
    - `useMemo` the frame from `resolveFrame(state, NAVBAR_MASCOT_CLIPS, NAVBAR_MASCOT_STILL)`
    - Activation timer keyed on `restartKey` while activating, `ACTIVATION_DURATION_MS`, cleanup clearing the previous timer so a repeat activation restarts the countdown; skipped entirely under reduced motion
    - Hover-release debounce of `hoverReleaseDelayMs`, cancelled by an earlier pointer-enter, so the engine keeps immediate pointer-leave semantics
    - Delegate to `useClipSource`, passing `enabled: !reducedMotion && !documentHidden`
    - Return the `NavbarMascotViewModel` with `useCallback`-stable handlers, `imageKey = ${clipId}:${restartKey}`, `imageSrc` nulled when the still itself errors, and `onFocus`/`onBlur` mapped to pointer-enter/leave
    - _Requirements: 6.9, 8.3, 8.4, 8.5, 9.3, 9.4, 10.2, 10.3, 10.4, 11.3, 11.6_

  - [ ]* 7.4 Write unit tests for the hooks
    - `src/features/mascot/hooks/useNavbarMascot.test.tsx`, jsdom project, fake timers, stubbed `matchMedia` and `fetch`
    - Cover activation timer restart on repeat activate, visibility pause and resume, reduced-motion switch in both directions, lazy fetch (hover/activate not requested until their event), no fetch under reduced motion, and listener/timer cleanup on unmount
    - _Requirements: 6.9, 9.2, 9.3, 9.4, 11.4, 11.5, 11.6, 11.7_

- [ ] 8. Presentation components
  - [~] 8.1 Create `src/features/mascot/components/NavbarMascotView.tsx`
    - Hook-free, prop-driven `<button type="button">` with `aria-label`, `onClick`, pointer and focus handlers, inline `width`/`height` from `sizePx`, and the `focus-visible:outline-2 outline-offset-2 outline-jlug-accent` ring
    - Single `<img>` keyed by `imageKey` with `alt=""`, `aria-hidden="true"`, explicit `width`/`height`, `draggable={false}`, `decoding="async"`, `onError`; render nothing inside the reserved box when `imageSrc` is `null`
    - Plain `<img>` with a targeted eslint-disable, since `next/image` needs `unoptimized` for GIFs and cannot take `blob:` sources
    - _Requirements: 8.1, 8.2, 8.6, 8.7, 10.4, 10.5, 11.1, 11.2_

  - [~] 8.2 Create `src/features/mascot/components/NavbarMascot.tsx`
    - `"use client"` seam: call `useNavbarMascot()` and spread the view model into `NavbarMascotView`; no markup decisions
    - _Requirements: 5.5, 8.1_

  - [ ]* 8.3 Write unit tests for the view
    - `src/features/mascot/components/NavbarMascotView.test.tsx`: still / clip / null source states, accessible name, `type="button"`, decorative image attributes, explicit dimensions, single-`<img>` invariant, handler wiring, and an SSR string render check
    - _Requirements: 8.1, 8.2, 8.6, 10.1, 10.4, 10.5, 11.2_

- [ ] 9. Navigation bar integration
  - [x] 9.1 Record the baseline navigation row height
    - Before touching `SiteNav.tsx`, capture `document.querySelector("header").offsetHeight` at 375 px, 768 px and 1440 px widths and note the three values
    - _Requirements: 7.5_

  - [~] 9.2 Mount the Nav_Slot in `src/components/SiteNav.tsx`
    - Import `NavbarMascot`; insert a single `<div className="flex shrink-0 items-center px-4 md:border-l md:border-jlug-line md:px-5">` between the desktop `</ul>` and the MENU `<button>`, so the slot is the last row element at `md`+ and sits immediately before the visible toggle below `md`
    - No `flex-1`, no vertical padding, no responsive size variants; the slot lives in the `<nav>` row, not in `#site-nav-mobile`, so it stays visible while the panel is open
    - Make no other edit to the file
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [~] 9.3 Confirm the row height is unchanged
    - Re-measure `header.offsetHeight` at 375 px, 768 px and 1440 px and assert the values match the 9.1 baseline exactly; adjust the slot's padding or alignment if any width differs
    - _Requirements: 7.3, 7.5_

  - [ ]* 9.4 Write placement tests for `SiteNav`
    - `src/components/SiteNav.test.tsx`: slot DOM position after the `EXEC /JOIN` list and before the MENU button, slot outside the mobile panel subtree, existing wordmark / link list / CTA order untouched
    - _Requirements: 7.1, 7.2, 7.4, 7.6_

  - [~] 9.5 Document the pipeline in `README.md`
    - `npm run mascot:clips` as the single command, the `--probe-segments` → edit `SEGMENTS` → rerun workflow, and the ffmpeg prerequisite
    - _Requirements: 12.2, 12.3_

- [ ] 10. Final verification
  - [~] 10.1 Run the full gate and fix every failure
    - `npm run lint`, `npx tsc --noEmit`, `npm run test -- --run`, `npm run build`
    - _Requirements: 12.1_

  - [ ]* 10.2 Measure Cumulative Layout Shift (optional quality hardening — not required for the feature to work)
    - Observe `layout-shift` entries across the still→clip swap and confirm the mascot contributes 0
    - _Requirements: 11.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP. The optional set here is either test coverage or quality hardening: pipeline failure-branch tests (2.11), rerun determinism (2.12), all property and unit tests, the `SiteNav` placement test (9.4), and the CLS measurement (10.2). None of them are needed for the feature to function.
- Task 2.4 edits the segment table created in 2.1; that is deliberate, since the table's final values come from the advisory probe and human review.
- Every property sub-task names the Property number from design.md and the requirement clauses it checks; property suites run at 100 runs via `fc.assert(..., { numRuns: 100 })`.
- Engine tests run under the node project with no jsdom, which is how the DOM-free requirement (6.11, 12.1) is enforced rather than merely documented.
- Checkpoints 3 and 6 mark the two natural halves: generated media and pure logic, before any React code depends on them.

### Baseline nav row height

Recorded for task 9.1, to be compared against by task 9.3. `src/components/SiteNav.tsx` was **not** modified.

| Viewport width | `document.querySelector("header").offsetHeight` | Kind |
| --- | --- | --- |
| 375 px | 57 px | **derived** (not measured) |
| 768 px | 57 px | **derived** (not measured) |
| 1440 px | 57 px | **derived** (not measured) |

**Method.** Analytic derivation from the Tailwind classes on `SiteNav.tsx` plus the resolved theme values in `node_modules/tailwindcss/theme.css` and `preflight.css` (Tailwind 4.3.3), with `src/app/globals.css` checked for overrides. No browser was involved.

Chain of reasoning:

- `header` box = nav row height + `border-b` (1 px) + mobile panel height.
- The mobile panel (`#site-nav-mobile`) carries the `hidden` attribute when closed, and preflight applies `[hidden]:where(:not([hidden='until-found'])) { display: none }`, so it contributes 0 px. The intermediate `max-w-[1440px]` wrapper only has `md:border-l` / `md:border-r`, so it adds no vertical space.
- The `<nav>` is `flex items-stretch`, so the row height is its tallest item. Only the wordmark link and the mobile toggle have vertical padding (`py-4` → `--spacing: 0.25rem` × 4 = 16 px per side).
  - Wordmark: tallest child is the `text-base` "JLUG" span → `--text-base: 1rem` with `--text-base--line-height: calc(1.5 / 1)` = 24 px. 24 + 32 = **56 px**.
  - Mobile toggle: children are a `text-[0.7rem]` span (11.2 px font-size; `text-[…]` sets font-size only, so line-height inherits preflight's `html { line-height: 1.5 }` → 16.8 px) and the 3-bar hamburger (`h-px` × 3 + `gap-1` × 2 = 11 px). 16.8 + 32 = 48.8 px.
  - Desktop link list, `EXEC /JOIN` CTA: no vertical padding, 16.8 px content — they stretch rather than set the height.
- Row = 56 px at every width; 56 + 1 = **57 px**.
- Width-independence: nothing in the row has a responsive size or padding variant that changes vertical metrics (`md:border-r`, `md:px-8`, `lg:px-7` are all horizontal). Below `md` the desktop `<ul>` is `display: none` and the toggle appears, but the wordmark's 56 px still dominates. At `lg`+ the `/ROOT` span becomes `inline` at 16.8 px, still under 24 px. Intrinsic row content is ≈ 204 px at 375 px, so nothing wraps.

**Limitations.**

- These are derived, not measured. Task 9.3 must compare like with like: either re-derive the same way after the 9.2 edit (the honest apples-to-apples comparison, and sufficient to show the slot adds no vertical space), or measure both states in a real browser. Do not compare a derived 57 px against a browser-measured number.
- Two heavyweight-free options were unavailable: no headless browser (`puppeteer` / `playwright`) is installed, and jsdom performs no layout, so `offsetHeight` there is always 0 — a jsdom render could not have produced a real number either. Vitest itself is not installed yet (task 1.1).
- Sub-pixel risk is low but real: 56 px comes from integer-valued `rem` math, not font metrics, since every contributing line-height is an explicit multiple. `offsetHeight` rounds to an integer regardless.
- Browser default root font-size of 16 px is assumed. A user-zoomed or non-default root size scales all three numbers together.
- If a real-browser check is ever wanted, the one-liner is `document.querySelector("header").offsetHeight` in the console at each width with the DevTools device-toolbar set to that exact viewport, panel closed.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "9.1"] },
    { "id": 1, "tasks": ["2.2", "2.3"] },
    { "id": 2, "tasks": ["2.4"] },
    { "id": 3, "tasks": ["2.5", "2.6"] },
    { "id": 4, "tasks": ["2.7", "2.9"] },
    { "id": 5, "tasks": ["2.8", "2.10"] },
    { "id": 6, "tasks": ["4.1", "2.11", "2.12"] },
    { "id": 7, "tasks": ["4.2"] },
    { "id": 8, "tasks": ["5.1", "4.3"] },
    { "id": 9, "tasks": ["5.2", "4.4"] },
    { "id": 10, "tasks": ["5.3", "5.4", "7.1"] },
    { "id": 11, "tasks": ["5.5", "7.2"] },
    { "id": 12, "tasks": ["5.6", "7.3"] },
    { "id": 13, "tasks": ["5.7", "8.1"] },
    { "id": 14, "tasks": ["5.8", "8.2"] },
    { "id": 15, "tasks": ["5.9", "7.4", "8.3"] },
    { "id": 16, "tasks": ["5.10", "9.2"] },
    { "id": 17, "tasks": ["5.11", "9.3"] },
    { "id": 18, "tasks": ["5.12", "9.5"] },
    { "id": 19, "tasks": ["5.13", "9.4"] },
    { "id": 20, "tasks": ["10.1"] },
    { "id": 21, "tasks": ["10.2"] }
  ]
}
```
