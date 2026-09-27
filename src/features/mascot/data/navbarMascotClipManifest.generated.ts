// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Written by `npm run mascot:clips` (scripts/mascot-clips/writeManifest.mjs).
// Every value below is measured from the produced file with ffprobe and fs.stat,
// never copied from the encoder's request, so dimensions and timings cannot drift
// away from the bytes actually served.
//
// To change a clip: edit SEGMENTS in scripts/mascot-clips/clipPipelineConfig.mjs
// and re-run the command. Entries are sorted by clip id, so an unchanged config
// rewrites this file byte-for-byte identically.
//
// Clip roles and human labels are NOT here: they are authored in
// ./navbarMascotClips.ts, which maps these measurements through a role table.

export const NAVBAR_MASCOT_CLIP_MANIFEST = [
  {
    id: "activate-hop",
    path: "/assets/mascot/clips/mascot-activate-hop.gif",
    width: 96,
    height: 96,
    durationMs: 1100,
    fps: 20,
    bytes: 84005,
  },
  {
    id: "hover-wave",
    path: "/assets/mascot/clips/mascot-hover-wave.gif",
    width: 96,
    height: 96,
    durationMs: 1200,
    fps: 20,
    bytes: 74564,
  },
  {
    id: "idle-blink",
    path: "/assets/mascot/clips/mascot-idle-blink.gif",
    width: 96,
    height: 96,
    durationMs: 1150,
    fps: 20,
    bytes: 49031,
  },
] as const;

export const NAVBAR_MASCOT_STILL_MANIFEST = {
  path: "/assets/mascot/pingu-tiwari-still.png",
  width: 96,
  height: 96,
} as const;
