/**
 * How a clip element plays, from its settings (the editor's "Playing" card; the backend's video props), checked
 * again here: it starts at once (`autoplay`), once it's seen or under the pointer (`playOn`), or when it's pressed.
 * A clip that plays by itself has no sound (a browser's rule) and no player buttons; a light element (the
 * editor's speed settings) never plays by itself, so it gets its buttons back. Its speed and what loads before
 * it's played. Pure (tested); no React, so the editor can read it too.
 */
export type VideoLive = { on?: "view" | "hover"; speed?: number };
export type VideoPlay = {
  autoPlay: boolean;
  muted: boolean;
  controls: boolean;
  preload: "none" | "metadata" | "auto";
  noDownload: boolean;
  /** What the page's runtime does to it once it's drawn (TreeMedia), if anything. */
  live: VideoLive | null;
};

const PRELOADS = ["none", "metadata", "auto"] as const;

export function videoPlay(props: Record<string, unknown> | undefined, light = false): VideoPlay {
  const p = props ?? {};
  const auto = p.autoplay === true;
  const on = !auto && (p.playOn === "view" || p.playOn === "hover") ? p.playOn : undefined;
  // Plays without being pressed (never a light element's).
  const self = (auto || Boolean(on)) && !light;
  const speed = typeof p.speed === "number" && Number.isFinite(p.speed) && p.speed >= 0.25 && p.speed <= 3 && p.speed !== 1 ? p.speed : undefined;
  const live: VideoLive = { ...(on && self ? { on } : {}), ...(speed ? { speed } : {}) };
  return {
    autoPlay: auto && !light,
    muted: p.muted === true || auto || Boolean(on),
    controls: p.controls !== false && !self,
    preload: (PRELOADS as readonly unknown[]).includes(p.preload) ? (p.preload as VideoPlay["preload"]) : "metadata",
    noDownload: p.noDownload === true,
    live: live.on || live.speed ? live : null,
  };
}
