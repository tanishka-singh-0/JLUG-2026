/**
 * The browser-side lifecycle of the navbar mascot's GIF source.
 *
 * This is where the awkward part of the feature lives: **a GIF cannot be
 * seeked, paused or rewound through the DOM.** There is no `currentTime` for an
 * animated image, and remounting an `<img>` with the same `src` does not
 * restart it — browsers share decoded animation state per URL, so the remounted
 * element usually joins the loop mid-way.
 *
 * The one reliable lever is *which resource the element points at*, because
 * animation position belongs to the resource, not the element. So each restart
 * mints a fresh `blob:` URL from bytes fetched once and cached for the session:
 * a new URL is always a new resource, so playback starts at frame 0
 * (Requirement 6.9), and the cache means a restart costs no network. Where
 * `fetch` or `createObjectURL` is missing, the hook degrades to a
 * cache-busting query string — same behaviour, more bandwidth.
 *
 * "Pausing" is the same trick in reverse. With no pause API, `enabled: false`
 * swaps the source back to the static still and revokes the live object URL,
 * which genuinely stops playback and releases the decoded frames instead of
 * trusting background-tab throttling (Requirement 11.4). Re-enabling mints a
 * new URL from the cached blob, so playback resumes — from frame 0, the only
 * resumption point a GIF offers (Requirement 11.5).
 *
 * Every timeout and no literal path lives here: `clipFetchTimeoutMs` comes from
 * the central config, and the clip path arrives as a parameter from the
 * registry by way of the engine.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { NAVBAR_MASCOT_CONFIG as NAV_CFG } from "../data/navbarMascotConfig";

/** What the hook is currently handing back. */
export type ClipSourceStatus = "still" | "clip" | "error";

export interface ClipSourceRequest {
  /** Clip to display, or `null` to show the still. Also the blob cache key. */
  readonly clipId: string | null;
  /** Served path of that clip, or `null` alongside a `null` clipId. */
  readonly path: string | null;
  /** Bumped by the engine on every activation; forces a fresh resource. */
  readonly restartKey: number;
  /** False while reduced motion holds or the document is hidden. */
  readonly enabled: boolean;
  /** Served path of the fallback still. */
  readonly stillPath: string;
}

export interface ClipSource {
  /** What to put in `<img src>`. */
  readonly src: string;
  readonly status: ClipSourceStatus;
}

/** Blob URLs need both halves; either one missing sends us down the query path. */
function supportsBlobUrls(): boolean {
  return (
    typeof fetch === "function" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function"
  );
}

/**
 * Resolve the source for one clip, fetching its bytes at most once per session.
 *
 * Requirement 11.7 falls out of the cache key: a clip is fetched the first time
 * its id is *requested*, so the hover and activate clips stay unrequested until
 * their playback event fires. Requirement 9.2 falls out of the `enabled` guard
 * running before any fetch is scheduled, so reduced motion requests nothing at
 * all — not even the idle clip.
 */
export function useClipSource(request: ClipSourceRequest): ClipSource {
  const { clipId, path, restartKey, enabled, stillPath } = request;

  /** Fetched bytes, keyed by clip id, kept for the life of the component. */
  const blobsRef = useRef<Map<string, Blob>>(new Map());
  /** The one live object URL, or null. Revoked before another is minted. */
  const objectUrlRef = useRef<string | null>(null);
  /**
   * Increments per effect run. An async fetch that resolves after the request
   * moved on compares against this and drops its result, so a late response can
   * neither set state nor leak a URL.
   */
  const generationRef = useRef(0);

  const [source, setSource] = useState<{ src: string | null; status: ClipSourceStatus }>({
    src: null,
    status: "still",
  });

  /** Requirement 11.2: at most one clip resource is ever live. */
  const revokeLiveUrl = useCallback(() => {
    if (objectUrlRef.current !== null) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;

    // Disabled, or nothing to play: drop back to the still and release the
    // decoded frames. This branch precedes every fetch, which is what makes
    // "no clip file is requested under reduced motion" structural.
    if (!enabled || clipId === null || path === null) {
      revokeLiveUrl();
      setSource({ src: null, status: "still" });
      return;
    }

    if (!supportsBlobUrls()) {
      // A distinct URL is a distinct resource, so this restarts correctly too;
      // it just re-downloads, because it is also a distinct HTTP cache key.
      setSource({ src: `${path}?r=${restartKey}`, status: "clip" });
      return;
    }

    let cancelled = false;

    const present = (blob: Blob) => {
      if (cancelled || generation !== generationRef.current) return;
      revokeLiveUrl();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setSource({ src: url, status: "clip" });
    };

    const cached = blobsRef.current.get(clipId);
    if (cached !== undefined) {
      // Requirement 11.5: resuming and restarting both cost zero network.
      present(cached);
      return () => {
        cancelled = true;
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NAV_CFG.clipFetchTimeoutMs);

    void (async () => {
      try {
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`clip fetch failed with status ${response.status}`);
        }
        const blob = await response.blob();
        blobsRef.current.set(clipId, blob);
        present(blob);
      } catch {
        // Requirement 10.3: the still renders and the button stays operable.
        if (!cancelled && generation === generationRef.current) {
          setSource({ src: null, status: "error" });
        }
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [clipId, path, restartKey, enabled, revokeLiveUrl]);

  // Requirement 11.6: nothing outlives the component.
  useEffect(() => revokeLiveUrl, [revokeLiveUrl]);

  // Requirements 10.1, 10.2: the still is what shows until a clip is ready.
  return {
    src: source.status === "clip" && source.src !== null ? source.src : stillPath,
    status: source.status,
  };
}
