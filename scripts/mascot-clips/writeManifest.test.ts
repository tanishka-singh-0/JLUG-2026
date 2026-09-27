import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertKebabCaseFileName,
  formatClipReport,
  formatManifestModule,
  measuredDurationMs,
  measuredFps,
  parseMediaProbe,
  repoRelative,
  servedPathFor,
  sortByClipId,
} from "./writeManifest.mjs";

/**
 * Unit coverage for the pure surface of `writeManifest.mjs`. ffprobe is never
 * spawned and nothing is written: the process-touching functions (`copyStill`,
 * `measureClips`, `writeManifest`) are exercised by running the pipeline itself,
 * and the size-budget and determinism *properties* belong to tasks 2.10–2.12.
 */

type ClipEntry = {
  id: string;
  path: string;
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  bytes: number;
};

function clip(overrides: Partial<ClipEntry> = {}): ClipEntry {
  return {
    id: "idle-blink",
    path: "/assets/mascot/clips/mascot-idle-blink.gif",
    width: 96,
    height: 96,
    durationMs: 1150,
    fps: 20,
    bytes: 49031,
    ...overrides,
  };
}

const still = { path: "/assets/mascot/pingu-tiwari-still.png", width: 2172, height: 724 };

/** Shape of one ffprobe JSON payload for a produced GIF. */
function probeJson(
  stream: Record<string, unknown> = {},
  format: Record<string, unknown> = {},
) {
  return JSON.stringify({
    streams: [{ width: 96, height: 96, r_frame_rate: "20/1", nb_frames: "23", ...stream }],
    format: { duration: "1.150000", ...format },
  });
}

describe("parseMediaProbe", () => {
  it("normalises a GIF probe payload", () => {
    expect(parseMediaProbe(probeJson(), 'clip "idle-blink"')).toEqual({
      width: 96,
      height: 96,
      containerFps: 20,
      nbFrames: 23,
      durationS: 1.15,
    });
  });

  it("maps ffprobe's N/A fields to null rather than NaN", () => {
    const probe = parseMediaProbe(
      probeJson({ nb_frames: "N/A", r_frame_rate: "0/0" }, { duration: "N/A" }),
      "the fallback still",
    );
    expect(probe).toMatchObject({ containerFps: null, nbFrames: null, durationS: null });
    expect(probe.width).toBe(96);
  });

  it("fails loudly on unparseable JSON and on a payload with no video stream", () => {
    expect(() => parseMediaProbe("not json", 'clip "x"')).toThrow(/unparseable JSON/);
    expect(() => parseMediaProbe(JSON.stringify({ streams: [] }), 'clip "x"')).toThrow(
      /no video stream/,
    );
  });
});

describe("measuredFps", () => {
  it("prefers frames divided by duration over the container rate", () => {
    // r_frame_rate overstates a GIF whose delays vary; 23 frames over 1.15 s is
    // what actually plays.
    expect(measuredFps({ containerFps: 50, nbFrames: 23, durationS: 1.15 })).toBe(20);
  });

  it("rounds to two decimals so the emitted file is byte-stable", () => {
    expect(measuredFps({ containerFps: null, nbFrames: 18, durationS: 1.08 })).toBe(16.67);
  });

  it("falls back to the container rate when frames or duration are unknown", () => {
    expect(measuredFps({ containerFps: 16, nbFrames: null, durationS: 1.2 })).toBe(16);
    expect(measuredFps({ containerFps: 16, nbFrames: 18, durationS: null })).toBe(16);
  });

  it("returns null when nothing is measurable", () => {
    expect(measuredFps({ containerFps: null, nbFrames: null, durationS: null })).toBeNull();
  });
});

describe("measuredDurationMs", () => {
  it("records the measured duration as a whole number of milliseconds", () => {
    // 1.1 s requested, 1.1043 s measured: frame-delay rounding, and the measured
    // value is the one the activation timer must use.
    expect(
      measuredDurationMs({ durationS: 1.1043, nbFrames: 22, containerFps: 20 }),
    ).toBe(1104);
  });

  it("derives from frames and rate when format.duration is missing", () => {
    expect(measuredDurationMs({ durationS: null, nbFrames: 24, containerFps: 20 })).toBe(
      1200,
    );
  });

  it("returns null when neither measurement is available", () => {
    expect(
      measuredDurationMs({ durationS: null, nbFrames: null, containerFps: 20 }),
    ).toBeNull();
  });
});

describe("sortByClipId", () => {
  it("orders by codepoint and leaves the input untouched", () => {
    const input = [clip({ id: "idle-blink" }), clip({ id: "activate-hop" })];
    expect(sortByClipId(input).map((entry) => entry.id)).toEqual([
      "activate-hop",
      "idle-blink",
    ]);
    expect(input.map((entry) => entry.id)).toEqual(["idle-blink", "activate-hop"]);
  });
});

describe("servedPathFor", () => {
  const cwd = path.resolve("/repo");

  it("derives the URL path for a file under public/", () => {
    expect(
      servedPathFor(path.join(cwd, "public", "assets", "mascot", "clips", "a.gif"), cwd),
    ).toBe("/assets/mascot/clips/a.gif");
  });

  it("refuses a path outside public/", () => {
    expect(() => servedPathFor(path.join(cwd, "assets", "mascot", "a.gif"), cwd)).toThrow(
      /not inside/,
    );
  });
});

describe("repoRelative", () => {
  const cwd = path.resolve("/repo");

  it("reports an in-repo path with forward slashes", () => {
    expect(repoRelative(path.join(cwd, "public", "assets", "x.png"), cwd)).toBe(
      "public/assets/x.png",
    );
  });

  it("reports an out-of-repo path absolute rather than as ../ chains", () => {
    const outside = path.resolve("/tmp", "x.ts");
    expect(repoRelative(outside, cwd)).toBe(outside);
  });
});

describe("assertKebabCaseFileName", () => {
  it("accepts lowercase letters, digits and hyphens", () => {
    expect(() =>
      assertKebabCaseFileName("/out/mascot-idle-blink.gif", ".gif", "clip"),
    ).not.toThrow();
    expect(() =>
      assertKebabCaseFileName("/out/pingu-tiwari-still.png", ".png", "still"),
    ).not.toThrow();
  });

  it("rejects spaces, underscores and capitals (Requirements 1.1, 1.2)", () => {
    for (const name of ["Idle Blink.gif", "idle_blink.gif", "IdleBlink.gif"]) {
      expect(() => assertKebabCaseFileName(`/out/${name}`, ".gif", "clip")).toThrow(
        /kebab-case/,
      );
    }
  });

  it("rejects the wrong extension", () => {
    expect(() => assertKebabCaseFileName("/out/idle-blink.png", ".gif", "clip")).toThrow(
      /must end in "\.gif"/,
    );
  });
});

describe("formatClipReport", () => {
  it("carries file name, duration, dimensions and bytes (Requirement 4.8)", () => {
    const line = formatClipReport(clip());
    expect(line).toContain("mascot-idle-blink.gif");
    expect(line).toContain("96x96 px");
    expect(line).toContain("1.150 s (1150 ms)");
    expect(line).toContain("49031 bytes");
  });
});

describe("formatManifestModule", () => {
  const clips = [
    clip({ id: "idle-blink" }),
    clip({
      id: "activate-hop",
      path: "/assets/mascot/clips/mascot-activate-hop.gif",
      durationMs: 1100,
      fps: 16.67,
      bytes: 84005,
    }),
  ];

  it("emits a do-not-edit header", () => {
    expect(formatManifestModule({ clips, still })).toMatch(
      /^\/\/ GENERATED FILE — DO NOT EDIT BY HAND\./,
    );
  });

  it("emits both exports as const", () => {
    const source = formatManifestModule({ clips, still });
    expect(source).toContain("export const NAVBAR_MASCOT_CLIP_MANIFEST = [");
    expect(source).toContain("export const NAVBAR_MASCOT_STILL_MANIFEST = {");
    expect(source.match(/\] as const;/g)).toHaveLength(1);
    expect(source.match(/\} as const;/g)).toHaveLength(1);
  });

  it("sorts entries by clip id regardless of input order", () => {
    const source = formatManifestModule({ clips, still });
    expect(source.indexOf('id: "activate-hop"')).toBeLessThan(
      source.indexOf('id: "idle-blink"'),
    );
  });

  it("records the still's measured dimensions", () => {
    const source = formatManifestModule({ clips, still });
    expect(source).toContain('path: "/assets/mascot/pingu-tiwari-still.png"');
    expect(source).toContain("width: 2172,");
    expect(source).toContain("height: 724,");
  });

  it("emits integers plainly and fractional rates to two decimals", () => {
    const source = formatManifestModule({ clips, still });
    expect(source).toContain("fps: 20,");
    expect(source).toContain("fps: 16.67,");
    expect(source).toContain("durationMs: 1100,");
  });

  it("is byte-identical for the same input in a different order (Requirement 12.4)", () => {
    expect(formatManifestModule({ clips, still })).toBe(
      formatManifestModule({ clips: [...clips].reverse(), still }),
    );
  });

  it("ends with a trailing newline", () => {
    expect(formatManifestModule({ clips, still }).endsWith("\n")).toBe(true);
  });
});
