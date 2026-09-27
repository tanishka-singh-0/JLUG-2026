import { describe, expect, it } from "vitest";

import {
  buildProbeArgs,
  collectSegmentIssues,
  formatSourceFacts,
  outputWidthForHeight,
  parseFrameRate,
  parseNumericField,
  parseProbeOutput,
  sourceAspectRatio,
  validateSegments,
} from "./probeSources.mjs";

/** Minimal probed-facts stub; ffprobe is never spawned in this suite. */
function facts(overrides: Record<string, unknown> = {}) {
  return {
    key: "a",
    file: "source-a.mp4",
    filePath: "/abs/source-a.mp4",
    width: 1280,
    height: 720,
    fps: 30,
    nbFrames: 120,
    nbFramesDerived: false,
    durationS: 4,
    aspectRatio: 1280 / 720,
    ...overrides,
  };
}

describe("parseFrameRate", () => {
  it("parses a rational rate string", () => {
    expect(parseFrameRate("30/1")).toBe(30);
    expect(parseFrameRate("30000/1001")).toBeCloseTo(29.97, 2);
  });

  it("parses a plain numeric rate", () => {
    expect(parseFrameRate("25")).toBe(25);
    expect(parseFrameRate(24)).toBe(24);
  });

  it("returns null for unknown rates instead of NaN", () => {
    for (const raw of ["0/0", "30/0", "N/A", "", "  ", "abc", "1/2/3", undefined, null]) {
      expect(parseFrameRate(raw as never)).toBeNull();
    }
  });
});

describe("parseNumericField", () => {
  it("treats absent and N/A values as unknown", () => {
    expect(parseNumericField(undefined)).toBeNull();
    expect(parseNumericField("N/A")).toBeNull();
    expect(parseNumericField("")).toBeNull();
    expect(parseNumericField("nope")).toBeNull();
  });

  it("parses numeric strings", () => {
    expect(parseNumericField("4.083333")).toBeCloseTo(4.083333, 6);
    expect(parseNumericField(96)).toBe(96);
  });
});

describe("buildProbeArgs", () => {
  it("asks for exactly the four facts plus json output", () => {
    const args = buildProbeArgs("/abs/source-a.mp4");
    expect(args).toEqual([
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,nb_frames",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      "/abs/source-a.mp4",
    ]);
  });
});

describe("parseProbeOutput", () => {
  const source = { key: "a", file: "source-a.mp4", filePath: "/abs/source-a.mp4" };

  it("normalises a full payload", () => {
    const stdout = JSON.stringify({
      streams: [{ width: 1080, height: 1080, r_frame_rate: "30000/1001", nb_frames: "122" }],
      format: { duration: "4.070733" },
    });

    const parsed = parseProbeOutput(stdout, source);
    expect(parsed.width).toBe(1080);
    expect(parsed.height).toBe(1080);
    expect(parsed.fps).toBeCloseTo(29.97, 2);
    expect(parsed.nbFrames).toBe(122);
    expect(parsed.nbFramesDerived).toBe(false);
    expect(parsed.durationS).toBeCloseTo(4.070733, 6);
    expect(parsed.aspectRatio).toBe(1);
  });

  it("derives nb_frames when the container omits it", () => {
    const stdout = JSON.stringify({
      streams: [{ width: 640, height: 480, r_frame_rate: "30/1", nb_frames: "N/A" }],
      format: { duration: "2.00" },
    });

    const parsed = parseProbeOutput(stdout, source);
    expect(parsed.nbFrames).toBe(60);
    expect(parsed.nbFramesDerived).toBe(true);
    expect(Number.isNaN(parsed.nbFrames)).toBe(false);
  });

  it("yields null rather than NaN when nothing can be derived", () => {
    const stdout = JSON.stringify({
      streams: [{ width: "N/A", height: "N/A", r_frame_rate: "0/0" }],
      format: {},
    });

    const parsed = parseProbeOutput(stdout, source);
    expect(parsed.fps).toBeNull();
    expect(parsed.nbFrames).toBeNull();
    expect(parsed.durationS).toBeNull();
    expect(parsed.aspectRatio).toBeNull();
  });

  it("throws on a payload with no video stream or bad json", () => {
    expect(() => parseProbeOutput('{"streams":[]}', source)).toThrow(/no video stream/);
    expect(() => parseProbeOutput("not json", source)).toThrow(/unparseable JSON/);
  });
});

describe("aspect ratio exposure for the encode step", () => {
  it("reports the source aspect ratio", () => {
    expect(sourceAspectRatio(facts())).toBeCloseTo(16 / 9, 10);
    expect(sourceAspectRatio(facts({ aspectRatio: null, width: 1000, height: 500 }))).toBe(2);
    expect(sourceAspectRatio(facts({ aspectRatio: null, width: null, height: null }))).toBeNull();
  });

  it("rounds the scale=-2 width to an even number", () => {
    expect(outputWidthForHeight(facts({ aspectRatio: 1 }), 96)).toBe(96);
    expect(outputWidthForHeight(facts({ aspectRatio: 16 / 9 }), 96)).toBe(170);
    expect(outputWidthForHeight(facts({ aspectRatio: null, width: null, height: null }), 96)).toBeNull();
  });
});

describe("formatSourceFacts", () => {
  it("prints dimensions, frame rate, frame count and duration", () => {
    const line = formatSourceFacts(facts());
    expect(line).toContain("1280x720 px");
    expect(line).toContain("30.000 fps");
    expect(line).toContain("120 frames");
    expect(line).toContain("4.000 s");
  });

  it("marks unknown and derived values plainly", () => {
    const line = formatSourceFacts(
      facts({ fps: null, durationS: null, nbFrames: 60, nbFramesDerived: true }),
    );
    expect(line).toContain("unknown fps");
    expect(line).toContain("60 (derived) frames");
    expect(line).toContain("unknown s");
  });
});

describe("collectSegmentIssues", () => {
  const probed = { a: facts({ durationS: 4 }), b: facts({ key: "b", file: "source-b.mp4", durationS: 3 }) };

  it("accepts a table fully inside the probed durations", () => {
    const segments = [
      { id: "idle-bob", source: "a", start: 0, end: 2.4 },
      { id: "hover-turn", source: "b", start: 0, end: 2 },
      { id: "activate-wave", source: "a", start: 2.4, end: 4 },
    ];
    expect(collectSegmentIssues(segments, probed)).toEqual([]);
    expect(validateSegments(segments, probed)).toBe(segments);
  });

  it("names the segment whose range leaves its own source duration", () => {
    const issues = collectSegmentIssues(
      [{ id: "activate-wave", source: "b", start: 1.5, end: 3.5 }],
      probed,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('segment "activate-wave"');
    expect(issues[0]).toMatch(/outside the probed duration/);
    expect(() =>
      validateSegments([{ id: "activate-wave", source: "b", start: 1.5, end: 3.5 }], probed),
    ).toThrow(/activate-wave/);
  });

  it("reports an unknown source key", () => {
    const issues = collectSegmentIssues([{ id: "ghost", source: "z", start: 0, end: 1 }], probed);
    expect(issues[0]).toContain('unknown source key "z"');
    expect(issues[0]).toContain('segment "ghost"');
  });

  it("rejects inverted, negative and non-finite boundaries", () => {
    expect(collectSegmentIssues([{ id: "inverted", source: "a", start: 2, end: 1 }], probed)[0]).toMatch(
      /must be greater than start/,
    );
    expect(
      collectSegmentIssues([{ id: "nan", source: "a", start: Number.NaN, end: 1 }], probed)[0],
    ).toMatch(/finite numbers/);
    expect(
      collectSegmentIssues([{ id: "negative", source: "a", start: -0.5, end: 1 }], probed).join(),
    ).toMatch(/is negative/);
  });

  it("rejects clip lengths outside the permitted window", () => {
    const tooShort = collectSegmentIssues([{ id: "blink", source: "a", start: 1, end: 1.2 }], probed);
    expect(tooShort[0]).toMatch(/outside the permitted/);

    const withinCustomWindow = collectSegmentIssues(
      [{ id: "blink", source: "a", start: 1, end: 1.2 }],
      probed,
      { durationRangeS: { min: 0.1, max: 4 } },
    );
    expect(withinCustomWindow).toEqual([]);
  });

  it("reports a duplicate segment id", () => {
    const issues = collectSegmentIssues(
      [
        { id: "idle-bob", source: "a", start: 0, end: 2 },
        { id: "idle-bob", source: "a", start: 2, end: 4 },
      ],
      probed,
    );
    expect(issues.join()).toMatch(/duplicate segment id/);
  });

  it("refuses to validate against a source with no probed duration", () => {
    const issues = collectSegmentIssues(
      [{ id: "idle-bob", source: "a", start: 0, end: 2 }],
      { a: facts({ durationS: null }) },
    );
    expect(issues[0]).toMatch(/no probed duration/);
  });
});
