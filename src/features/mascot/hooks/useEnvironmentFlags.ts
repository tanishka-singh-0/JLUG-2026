/**
 * The two environment signals the navbar mascot reacts to, each exposed as a
 * boolean hook:
 *
 * - `usePrefersReducedMotion()` — does the user ask for reduced motion
 *   (Requirement 9.1)?
 * - `useDocumentHidden()` — is the document in a background tab
 *   (Requirements 11.4, 11.5)?
 *
 * Both are `useSyncExternalStore` subscriptions rather than the more familiar
 * `useState` + `useEffect` pairing, for two reasons. First, the store form has a
 * *server* snapshot, so the value React renders on the server is declared rather
 * than accidental (Requirement 10.1). Second, React re-renders only when the
 * snapshot actually changes by `Object.is`; both snapshots here are booleans, so
 * an event that reports the value already held costs nothing (Requirement 11.3).
 * The `useState` version would need an extra effect and an extra render just to
 * reach the state this one starts in.
 *
 * No `"use client"` directive. The directive marks a *boundary* — the file whose
 * exports a Server Component may render — and `components/NavbarMascot.tsx` is
 * that boundary for this feature. This module is only ever reached through it,
 * and Next's own guidance is that the directive does not belong on every file
 * that happens to contain client code. Putting it here would falsely advertise
 * this module as an entry point.
 *
 * Nothing at module scope touches a browser global. `matchMedia` and `document`
 * are read only inside `subscribe`/`getSnapshot`, which React calls after mount,
 * which is what satisfies "after mount" in Requirement 9.1 and keeps the module
 * importable during a server render.
 *
 * Every function backing a store is declared at module level, not inside a hook.
 * `useSyncExternalStore` resubscribes whenever its `subscribe` identity changes,
 * so a per-render closure would tear down and re-add the listener on every
 * render (Requirement 11.6 in spirit, plus needless churn).
 */

import { useSyncExternalStore } from "react";

import { NAVBAR_MASCOT_CONFIG as NAV_CFG } from "../data/navbarMascotConfig";

/**
 * A `MediaQueryList` listener in the pre-2020 Safari shape, which takes the
 * event positionally rather than through `addEventListener`.
 */
type MediaQueryListListener = (event: MediaQueryListEvent) => void;

/**
 * Returned by `subscribe` when there is nothing to listen to — no `matchMedia`,
 * or no `document`. React always calls the returned function on cleanup, so the
 * no-listener case still has to hand back something callable.
 */
function unsubscribeNothing(): void {
  // Nothing was registered, so nothing is removed.
}

/**
 * The server snapshot for both stores: `false`.
 *
 * Neither signal is knowable on the server, and guessing would risk a hydration
 * mismatch. `false` — "no reduced-motion preference", "document visible" — is
 * safe because the view renders the fallback still until a clip source is ready
 * (Requirement 10.1): the server paint and the first client paint are the same
 * still image whatever the real media-query value turns out to be, and the
 * client's first genuine read arrives as an ordinary post-mount update.
 *
 * Shared by both hooks rather than duplicated, since the constant and the reason
 * for it are identical.
 */
function getFalseServerSnapshot(): boolean {
  return false;
}

// ── Reduced motion (Requirement 9.1) ──

/**
 * The `MediaQueryList` for the configured reduced-motion query, or `null` where
 * `matchMedia` does not exist.
 *
 * The query string comes from `NAV_CFG.reducedMotionQuery` and appears nowhere
 * else in this file, so the `subscribe` and `getSnapshot` halves of the store
 * cannot drift onto two different queries.
 *
 * A missing `matchMedia` means reduced motion is treated as off: the API is
 * present in every browser that can run this app, so its absence means a
 * stripped-down environment (a server render, a bare jsdom instance), not a user
 * who asked for stillness. Defaulting to `true` there would silently disable the
 * animation for everyone in such an environment.
 *
 * Deliberately *not* memoised in a module-level variable. A cached list would be
 * captured on first call and then outlive any later replacement of
 * `window.matchMedia` — exactly what test stubs do between cases — and caching
 * at module scope would also mean touching the global before mount. Calling
 * `matchMedia` per read is cheap, and since every read returns a boolean it does
 * not matter that `subscribe` and `getSnapshot` hold different list objects for
 * the same query.
 */
function getReducedMotionQueryList(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia(NAV_CFG.reducedMotionQuery);
}

/**
 * Listen for reduced-motion changes and return the exact removal for whichever
 * registration succeeded (Requirement 11.6).
 *
 * Both listener shapes are supported. Safari before 14 — which includes iOS 13,
 * still a non-trivial slice of older iPhones — exposes only
 * `addListener`/`removeListener` on a `MediaQueryList`; `addEventListener`
 * arrived later. The fallback costs three lines and no runtime overhead on
 * modern browsers, and the alternative is that those users' reduced-motion
 * preference is read once at mount and then never updates, which is a silent
 * accessibility regression. Each branch returns the cleanup that matches the
 * registration it made, so a listener is never added through one API and left
 * behind by the other.
 */
function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const queryList = getReducedMotionQueryList();
  if (queryList === null) {
    return unsubscribeNothing;
  }

  // The store's value is read back through `getSnapshot`, so the event payload
  // is ignored; this only needs to tell React that something moved.
  const listener: MediaQueryListListener = () => onStoreChange();

  if (typeof queryList.addEventListener === "function") {
    queryList.addEventListener("change", listener);
    return () => queryList.removeEventListener("change", listener);
  }

  queryList.addListener(listener);
  return () => queryList.removeListener(listener);
}

/**
 * Whether reduced motion is currently preferred. `false` where `matchMedia` is
 * unavailable, per `getReducedMotionQueryList`.
 */
function getReducedMotionSnapshot(): boolean {
  return getReducedMotionQueryList()?.matches ?? false;
}

/**
 * `true` while the user prefers reduced motion, kept live for the life of the
 * session.
 *
 * `useNavbarMascot` turns a change here into a `REDUCED_MOTION_CHANGED` event,
 * so the engine swaps to the fallback still when the preference switches on
 * (Requirement 9.3) and back to the idle clip when it switches off
 * (Requirement 9.4) without the page being reloaded.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getFalseServerSnapshot,
  );
}

// ── Document visibility (Requirements 11.4, 11.5) ──

/**
 * Listen for `visibilitychange` on the document and return the matching
 * `removeEventListener` (Requirement 11.6).
 *
 * `document` is captured in a local before the closure is built so the cleanup
 * detaches from the same object it attached to, rather than re-reading a global
 * that may have been replaced by then. A missing `document` — a server render,
 * or the node Vitest project — registers nothing and reports "visible".
 *
 * `visibilitychange` is the only event needed: it fires for tab switches, window
 * minimisation and mobile app backgrounding alike. There is no legacy-listener
 * branch here because `document.addEventListener` is universal, unlike
 * `MediaQueryList.addEventListener`.
 */
function subscribeDocumentHidden(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") {
    return unsubscribeNothing;
  }

  const doc = document;
  const listener = () => onStoreChange();

  doc.addEventListener("visibilitychange", listener);
  return () => doc.removeEventListener("visibilitychange", listener);
}

/**
 * Whether the document is currently hidden.
 *
 * Compares `visibilityState` to `"hidden"` rather than reading `document.hidden`
 * so the tri-state API is read as the tri-state it is, and so a test stub only
 * has to define the one property both halves of this store agree on.
 */
function getDocumentHiddenSnapshot(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

/**
 * `true` while the document is in the background.
 *
 * `useNavbarMascot` passes this into `useClipSource` as part of `enabled`, which
 * is how clip playback is actually stopped: a GIF cannot be paused through the
 * DOM, so the source is swapped to the still and the live object URL revoked
 * (Requirement 11.4), then re-minted from the cached blob on return
 * (Requirement 11.5).
 */
export function useDocumentHidden(): boolean {
  return useSyncExternalStore(
    subscribeDocumentHidden,
    getDocumentHiddenSnapshot,
    getFalseServerSnapshot,
  );
}
