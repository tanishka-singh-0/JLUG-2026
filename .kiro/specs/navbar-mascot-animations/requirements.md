# Requirements Document

## Introduction

This feature turns the two source mascot videos in `assets/mascot/` into a set of short, labelled animated GIF clips and plays those clips in the top-right corner of the site navigation bar. An idle clip loops continuously, a second clip plays while the pointer hovers the mascot, and a third clip plays once on activation. The newly supplied mascot still image is used only as a first-paint and reduced-motion fallback.

The work covers a one-time media pipeline (run locally, with the generated files committed into `public/`), a typed clip registry, a DOM-independent playback state machine, and a thin navbar-mounted presentation component. Structure follows the existing `src/features/mascot/` convention (`data/`, `engine/`, `components/`) and the modularity rules in `AGENTS.md`.

## Glossary

- **Source_Video**: One of the two files `assets/mascot/gemini_generated_video_284857f9.mp4` and `assets/mascot/gemini_generated_video_3c0a4e76.mp4`.
- **Source_Still**: The file `assets/mascot/ChatGPT Image Sep 26, 2026, 03_48_55 PM.png`.
- **Fallback_Still**: The kebab-case-named copy of the Source_Still served from `public/assets/mascot/`.
- **Motion_Segment**: A contiguous time range of a Source_Video that contains exactly one recognisable mascot motion (for example a wave, a turn, a nod).
- **Clip**: One animated GIF file generated from a single Motion_Segment and served from `public/assets/mascot/clips/`.
- **Clip_Role**: The playback purpose assigned to a Clip. Allowed values: `idle`, `hover`, `activate`.
- **Crop_Region**: The single configured square rectangle, expressed in source pixel coordinates, that every Motion_Segment is cropped to before scaling, chosen to contain the mascot across every frame of every Motion_Segment.
- **Media_Pipeline**: The committed, re-runnable script plus its configuration that provisions the encoder, probes the Source_Videos, cuts Motion_Segments, and encodes Clips.
- **Clip_Registry**: The typed data module under `src/features/mascot/data/` that is the single source of truth for Clip metadata (id, label, role, file path, pixel dimensions, duration, frame count).
- **Playback_Engine**: The pure, DOM-independent state machine module under `src/features/mascot/engine/` that maps playback events to the Clip that must be displayed.
- **Navbar_Mascot**: The React component under `src/features/mascot/components/` that renders the currently selected Clip and forwards user interaction events to the Playback_Engine.
- **Nav_Slot**: The fixed-size container inside `src/components/SiteNav.tsx` that hosts the Navbar_Mascot in the top-right corner of the navigation row.
- **Reduced_Motion**: The state in which the browser reports `prefers-reduced-motion: reduce`.

## Requirements

### Requirement 1: Asset Ingestion

**User Story:** As a maintainer, I want the mascot source media ingested into the served asset tree under predictable names, so that the website can reference the files without spaces or upload-tool artefacts in the paths.

#### Acceptance Criteria

1. THE Media_Pipeline SHALL copy the Source_Still into `public/assets/mascot/` under a kebab-case file name consisting of lowercase letters, digits and hyphens only.
2. THE Media_Pipeline SHALL write every generated Clip into `public/assets/mascot/clips/` under a kebab-case file name consisting of lowercase letters, digits and hyphens only, with the `.gif` extension.
3. THE Media_Pipeline SHALL leave the Source_Videos and the Source_Still in `assets/mascot/` unmodified.
4. IF a target file name in `public/assets/mascot/` or `public/assets/mascot/clips/` already exists, THEN THE Media_Pipeline SHALL overwrite that file and report the overwritten path in its console output.

### Requirement 2: Toolchain Provisioning

**User Story:** As a maintainer, I want the encoding toolchain provisioned and verified as part of this task, so that the clip generation runs end to end on this machine.

#### Acceptance Criteria

1. THE Media_Pipeline SHALL verify that `ffmpeg` and `ffprobe` are invocable before any probing or encoding step runs.
2. WHEN `ffmpeg` or `ffprobe` is not invocable, THE Media_Pipeline SHALL install the encoder toolchain through a Windows package manager and re-verify invocability.
3. IF `ffmpeg` or `ffprobe` remains non-invocable after the installation attempt, THEN THE Media_Pipeline SHALL exit with a non-zero status code and print the failing command together with the manual installation command.
4. THE Media_Pipeline SHALL record the probed duration, pixel dimensions and frame rate of each Source_Video in its console output.

### Requirement 3: Motion Segmentation

**User Story:** As a maintainer, I want each source video split into separate single-motion clips with descriptive labels, so that distinct mascot behaviours can be addressed individually by the website.

#### Acceptance Criteria

1. THE Media_Pipeline SHALL produce at least three Clips in total from the two Source_Videos.
2. THE Media_Pipeline SHALL derive each Clip from exactly one Motion_Segment of one Source_Video.
3. THE Media_Pipeline SHALL assign each Motion_Segment a start time and an end time, expressed in seconds with at least two decimal places, that lie within the probed duration of the Source_Video the Motion_Segment belongs to.
4. THE Media_Pipeline SHALL produce Clips whose playback duration is between 0.60 seconds and 4.00 seconds inclusive.
5. THE Media_Pipeline SHALL assign each Clip a human-readable label that names the observed motion.
6. THE Media_Pipeline SHALL store the Motion_Segment boundaries and labels in a committed configuration file so that a later run reproduces byte-identical segment boundaries.

### Requirement 4: Clip Encoding and Size Budgets

**User Story:** As a visitor on a metered connection, I want the navbar mascot clips to stay small, so that the header does not dominate page weight.

#### Acceptance Criteria

1. THE Media_Pipeline SHALL crop every Clip to the Crop_Region before scaling.
2. THE Media_Pipeline SHALL encode every Clip at a frame rate between 12 and 20 frames per second inclusive.
3. THE Media_Pipeline SHALL encode every Clip with infinite loop metadata.
4. THE Media_Pipeline SHALL produce Clip files of at most 300 KB each.
5. THE Media_Pipeline SHALL produce a combined size of all Clip files of at most 1200 KB.
6. IF an encoded Clip exceeds 300 KB, THEN THE Media_Pipeline SHALL re-encode that Clip with a reduced palette size or frame rate until the file is at most 300 KB or the frame rate reaches 12 frames per second.
7. IF a Clip still exceeds 300 KB at 12 frames per second with a 64-colour palette, THEN THE Media_Pipeline SHALL exit with a non-zero status code and print the Clip id and its measured size.
8. THE Media_Pipeline SHALL print the file name, duration, pixel dimensions and byte size of every generated Clip.
9. THE Media_Pipeline SHALL encode every Clip as an animated GIF of 96 by 96 pixels.
10. THE Media_Pipeline SHALL scale the Crop_Region uniformly so that no anamorphic distortion is introduced.
11. THE Media_Pipeline SHALL apply the same Crop_Region to every Clip so that the mascot keeps the same rendered size and position when the Navbar_Mascot swaps Clips.

### Requirement 5: Clip Registry Data Layer

**User Story:** As a developer, I want clip metadata expressed as data rather than embedded in components, so that adding or retuning a clip happens in one place.

#### Acceptance Criteria

1. THE Clip_Registry SHALL expose every Clip with an id, a label, a Clip_Role, a served file path, pixel width, pixel height and duration in milliseconds.
2. THE Clip_Registry SHALL expose exactly one Clip with the Clip_Role `idle`, exactly one Clip with the Clip_Role `hover` and exactly one Clip with the Clip_Role `activate`.
3. THE Clip_Registry SHALL expose the served path and pixel dimensions of the Fallback_Still.
4. THE Clip_Registry SHALL expose the Nav_Slot display size, the activation-clip playback duration and the hover-release delay as named configuration values.
5. THE Navbar_Mascot SHALL read every clip path, pixel dimension and timing value from the Clip_Registry.
6. THE Clip_Registry SHALL declare TypeScript types for Clip entries and Clip_Role values.

### Requirement 6: Playback State Machine

**User Story:** As a developer, I want the playback decisions in a pure state machine, so that the behaviour can be unit-tested without a DOM.

#### Acceptance Criteria

1. THE Playback_Engine SHALL expose an initial state and a transition function that accepts the current state and one playback event and returns the next state.
2. THE Playback_Engine SHALL resolve every state to exactly one Clip id to display and a boolean indicating whether that Clip loops.
3. WHILE the state is the resting state, THE Playback_Engine SHALL resolve to the Clip with the Clip_Role `idle` with looping enabled.
4. WHEN a pointer-enter event is received, THE Playback_Engine SHALL resolve to the Clip with the Clip_Role `hover` with looping enabled.
5. WHEN a pointer-leave event is received, THE Playback_Engine SHALL resolve to the Clip with the Clip_Role `idle` with looping enabled.
6. WHEN an activation event is received, THE Playback_Engine SHALL resolve to the Clip with the Clip_Role `activate` with looping disabled.
7. WHEN an activation-complete event is received, THE Playback_Engine SHALL resolve to the Clip determined by the last pointer state, using the `hover` Clip while the pointer is inside the Navbar_Mascot and the `idle` Clip otherwise.
8. WHILE the state is the activation state, THE Playback_Engine SHALL retain the activation Clip for pointer-enter and pointer-leave events and record the resulting pointer state.
9. WHEN an activation event is received while the state is already the activation state, THE Playback_Engine SHALL restart the activation Clip from its first frame.
10. WHILE Reduced_Motion is reported, THE Playback_Engine SHALL resolve to the Fallback_Still for every playback event.
11. THE Playback_Engine SHALL depend on no browser, DOM or React API.

### Requirement 7: Navigation Bar Placement

**User Story:** As a visitor, I want the animated mascot in the top-right corner of the navigation bar on both desktop and mobile, so that it is visible without disturbing the existing navigation.

#### Acceptance Criteria

1. THE Nav_Slot SHALL render as the last element of the navigation row in `src/components/SiteNav.tsx` on viewports at or above the `md` breakpoint.
2. WHILE the viewport is below the `md` breakpoint, THE Nav_Slot SHALL render immediately before the mobile menu toggle button within the navigation row.
3. THE Nav_Slot SHALL reserve a fixed box of 48 by 48 CSS pixels for the Navbar_Mascot at every viewport width.
4. THE Nav_Slot SHALL preserve the existing `justify-between` flex structure, the wordmark position, the section-link list and the `EXEC /JOIN` call to action at their current positions.
5. THE Nav_Slot SHALL keep the rendered height of the navigation row unchanged from the height measured before this feature is added.
6. WHILE the mobile navigation panel is open, THE Nav_Slot SHALL remain visible in the navigation row.

### Requirement 8: Accessibility

**User Story:** As a keyboard or screen-reader user, I want the mascot to be reachable and non-disruptive, so that the decoration does not obstruct navigation.

#### Acceptance Criteria

1. THE Navbar_Mascot SHALL render its interactive element as a `button` element with an explicit `type` attribute.
2. THE Navbar_Mascot SHALL expose an accessible name that describes the mascot interaction.
3. WHEN the interactive element receives an `Enter` or `Space` key activation, THE Navbar_Mascot SHALL send an activation event to the Playback_Engine.
4. WHEN the interactive element receives keyboard focus, THE Navbar_Mascot SHALL send a pointer-enter event to the Playback_Engine and render a focus indicator with a minimum contrast ratio of 3:1 against the header background.
5. WHEN the interactive element loses keyboard focus, THE Navbar_Mascot SHALL send a pointer-leave event to the Playback_Engine.
6. THE Navbar_Mascot SHALL mark the rendered clip image as decorative so that assistive technology announces only the accessible name of the interactive element.
7. THE Navbar_Mascot SHALL keep the interactive element within the natural tab order of the navigation row.

### Requirement 9: Reduced Motion

**User Story:** As a visitor who prefers reduced motion, I want a still mascot, so that the header does not animate against my system setting.

#### Acceptance Criteria

1. THE Navbar_Mascot SHALL read the `prefers-reduced-motion` media query through `window.matchMedia` after mount.
2. WHILE Reduced_Motion is reported, THE Navbar_Mascot SHALL render the Fallback_Still and SHALL request no Clip file over the network.
3. WHEN the `prefers-reduced-motion` media query changes to `reduce` during a session, THE Navbar_Mascot SHALL replace the displayed Clip with the Fallback_Still.
4. WHEN the `prefers-reduced-motion` media query changes away from `reduce` during a session, THE Navbar_Mascot SHALL render the Clip with the Clip_Role `idle`.
5. WHILE Reduced_Motion is reported, THE Navbar_Mascot SHALL keep the interactive element focusable and keep the accessible name unchanged.

### Requirement 10: Fallback and Load Behavior

**User Story:** As a visitor, I want the navbar to look correct before and during clip loading and when a clip cannot be fetched, so that the corner never shows a blank or broken area.

#### Acceptance Criteria

1. THE Navbar_Mascot SHALL render the Fallback_Still during server-side rendering and on first client paint.
2. WHEN the Clip with the Clip_Role `idle` finishes loading, THE Navbar_Mascot SHALL replace the Fallback_Still with that Clip.
3. IF a Clip file fails to load, THEN THE Navbar_Mascot SHALL render the Fallback_Still and SHALL keep the interactive element operable.
4. IF the Fallback_Still fails to load, THEN THE Navbar_Mascot SHALL render the reserved 48 by 48 pixel box with the header background colour.
5. THE Navbar_Mascot SHALL declare explicit width and height on every rendered image so that the reserved box size is applied before the image data arrives.

### Requirement 11: Runtime Performance

**User Story:** As a visitor browsing multiple pages, I want the always-mounted looping clip to stay cheap, so that scrolling and background tabs stay responsive.

#### Acceptance Criteria

1. THE Navbar_Mascot SHALL contribute 0 to the Cumulative Layout Shift metric of the page.
2. THE Navbar_Mascot SHALL hold at most one Clip image element in the document at any time.
3. THE Navbar_Mascot SHALL re-render only when the Playback_Engine state, the Reduced_Motion state or the load state changes.
4. WHEN the `document.visibilityState` becomes `hidden`, THE Navbar_Mascot SHALL stop clip playback.
5. WHEN the `document.visibilityState` becomes `visible`, THE Navbar_Mascot SHALL resume playback of the Clip resolved by the current Playback_Engine state.
6. THE Navbar_Mascot SHALL remove every registered event listener and timer when the component unmounts.
7. WHERE a Clip other than the Clip with the Clip_Role `idle` has not yet been requested, THE Navbar_Mascot SHALL defer that request until the corresponding playback event occurs.

### Requirement 12: Verifiability and Reproducibility

**User Story:** As a maintainer, I want the engine logic verifiable and the pipeline re-runnable, so that later tuning does not depend on manual inspection.

#### Acceptance Criteria

1. THE Playback_Engine SHALL be importable and executable in a Node environment with no browser globals present.
2. THE Media_Pipeline SHALL be re-runnable through a single documented command from the repository root.
3. THE Media_Pipeline SHALL expose its segment boundaries, output dimensions, frame rate, palette size and size budgets as values in one configuration module.
4. WHEN the Media_Pipeline runs a second time with an unchanged configuration module, THE Media_Pipeline SHALL produce the same set of Clip file names and the same Clip durations as the first run.
