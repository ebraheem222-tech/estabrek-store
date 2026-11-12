import { Fragment, Suspense, createElement, lazy, type ComponentType } from "react";
import * as ReactDOM from "react-dom";
import { getExpectedRequestStore } from "next/dist/client/components/request-async-storage.external";

/*
 * A part of a page in a script of its own, drawn on the server, that wakes up without leaving the page
 * (2026-11-12; in place of next/dynamic in the shop's split files: components/cinematic/homeScenes.tsx…).
 *
 * next/dynamic (Next 14) starts a part's script only when the page wakes up (hydration), and React.lazy waits once
 * even for a script that is already there. Meanwhile React keeps the server's drawing in a waiting box, and the
 * shop's providers (cart, wishlist, theme, toasts…) update right after the page wakes: an update that reaches a
 * box still waiting makes React swap it for its empty fallback, so the home's scenes left the page for half a
 * second and came back. Here:
 *  - the server writes the part's script into the page's head (ReactDOM.preinit, from the same chunk map Next's
 *    own CSS preloader reads), so it downloads beside the page's own scripts, and its CSS beside it as Next does;
 *  - the part starts loading as soon as its parent wakes (before React gets to the part's own box), and once its
 *    script is in, it draws straight away without waiting (a lazy part whose loader answers at once).
 *
 *   const early = earlyFrom("components/cinematic/homeScenes.tsx");   // the file the import() calls are in
 *   export const RoseRooms = early("./RoseRooms", () => import("./RoseRooms").then((m) => m.RoseRooms));
 *
 * The first argument is the very text inside import(): the chunk map names each split part "<file> -> <text>".
 */
type Preinit = (href: string, options: { as: "script" }) => void;
const preinit = (ReactDOM as unknown as { preinit?: Preinit }).preinit;

const found = new WeakMap<object, Map<string, string[]>>();

/** The part's files (its scripts and CSS), from the chunk map of the page being drawn on the server. */
function filesOf(name: string): string[] {
  let store: ReturnType<typeof getExpectedRequestStore>;
  try { store = getExpectedRequestStore("early part"); } catch { return []; }
  const manifest = store.reactLoadableManifest as Record<string, { files: readonly string[] }> | undefined;
  if (!manifest) return [];
  let byName = found.get(manifest);
  if (!byName) { byName = new Map(); found.set(manifest, byName); }
  let files = byName.get(name);
  if (!files) {
    // Windows builds name it with backslashes: match on forward ones, and on the end.
    const key = Object.keys(manifest).find((k) => k.replace(/\\/g, "/").endsWith(name));
    files = key ? manifest[key].files.map((f) => `${store.assetPrefix || ""}/_next/${encodeURI(f)}`) : [];
    byName.set(name, files);
    if (!key && process.env.NODE_ENV !== "production") console.warn(`[earlyPart] no split part named "${name}" (is the import text the same?)`);
  }
  return files;
}

/** A thenable that answers at once: React.lazy then draws the part in the same pass, without waiting. */
const ready = <T>(value: T) => ({ then: (ok: (v: T) => void) => { ok(value); } });

export function earlyFrom(file: string) {
  return function early<P extends object>(importText: string, load: () => Promise<ComponentType<P>>): ComponentType<P> {
    const name = `${file} -> ${importText}`;
    let Loaded: ComponentType<P> | null = null;
    let loading: Promise<ComponentType<P>> | null = null;
    const start = () => (loading ??= load().then((C) => (Loaded = C), (error) => { loading = null; throw error; }));
    const Part = lazy(() => (Loaded ? ready({ default: Loaded }) : start().then((C) => ({ default: C }))) as Promise<{ default: ComponentType<P> }>);
    function EarlyPart(props: P) {
      let css: string[] = [];
      if (typeof window === "undefined") {
        const files = filesOf(name);
        if (preinit) for (const src of files) if (src.endsWith(".js")) preinit(src, { as: "script" });
        css = files.filter((f) => f.endsWith(".css"));
      } else {
        start();
      }
      return createElement(Suspense, { fallback: null },
        // Its CSS, as next/dynamic's own preloader writes it (the box waits for it); React lifts it into the head.
        css.length ? createElement(Fragment, null, ...css.map((href) => createElement("link", { key: href, rel: "stylesheet", href, precedence: "dynamic" }))) : null,
        createElement(Part as unknown as ComponentType<object>, props));
    }
    EarlyPart.displayName = `Early(${importText.split("/").pop()})`;
    return EarlyPart;
  };
}
