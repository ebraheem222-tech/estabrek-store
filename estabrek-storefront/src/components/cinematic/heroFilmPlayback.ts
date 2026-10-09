import { motionLevel, reportSeek } from "@/lib/motionBudget";

const MP4 = "/editorial/hero-film.mp4";
const WEBM = "/editorial/hero-film.webm";
const FILM_FPS = 24;

export function filmDataSaver() {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
}

/** Use the untouched original film, with its original WebM fallback. */
export async function heroFilmSources(video: HTMLVideoElement): Promise<string[]> {
  if (!video.canPlayType("video/mp4")) return [WEBM];
  // Media Capabilities reports continuous playback, not repeated random seeks.
  // Preserve the original resolution on phones and when pacing switches to lite.
  return [MP4, WEBM];
}

/** One outstanding seek, paced to at most 60/s (30 in lite mode) on display frames. */
export function createFilmScrubber(video: HTMLVideoElement, onFrame: (index: number) => void) {
  let progress = 0;
  let frame = 0;
  let last = 0;
  let asked: number | null = null;
  let enabled = true;
  let alive = true;
  const active = () => alive && enabled && !document.hidden;
  const present = () => {
    if (active() && video.readyState >= 2 && !video.seeking) onFrame(Math.round(video.currentTime * FILM_FPS));
  };
  const schedule = () => {
    if (active() && !frame) frame = requestAnimationFrame(seek);
  };
  const seek = (now: number) => {
    frame = 0;
    // A paused phone can preload metadata without decoding the first picture.
    // Seeking is allowed as soon as the timeline is known; painting still waits
    // for HAVE_CURRENT_DATA in present().
    if (!active() || video.readyState < 1 || !Number.isFinite(video.duration)) return;
    // `seeking` can turn false before its queued seeked event is dispatched.
    // Keep ownership until that event so a new request cannot replace the
    // completed picture before the canvas has had a chance to upload it.
    if (asked !== null || video.seeking) return;
    const interval = 1000 / (motionLevel() === "lite" ? 30 : 60);
    if (now - last < interval - .5) { schedule(); return; }
    const lastIndex = Math.max(0, Math.ceil(video.duration * FILM_FPS) - 1);
    const index = Math.min(lastIndex, Math.round(progress * lastIndex));
    // Seek inside the chosen frame, avoiding timestamp rounding into its neighbour.
    const target = index || video.readyState < 2 ? (index + .1) / FILM_FPS : 0;
    if (video.readyState >= 2 && Math.floor(video.currentTime * FILM_FPS + .001) === index) return;
    // Retain the partial interval on 90/120/144Hz displays. Resetting to now
    // throws it away and unnecessarily limits 90Hz screens to 45 updates/s.
    last = last ? last + Math.max(1, Math.floor((now - last + .5) / interval)) * interval : now;
    asked = performance.now();
    video.currentTime = target;
  };
  const seeked = () => {
    if (asked !== null) { reportSeek(performance.now() - asked); asked = null; }
    present();
    schedule();
  };
  const ready = () => { present(); schedule(); };
  video.addEventListener("seeked", seeked);
  video.addEventListener("loadeddata", ready);
  video.addEventListener("loadedmetadata", ready);
  document.addEventListener("visibilitychange", ready);
  return {
    update(p: number) { progress = Math.max(0, Math.min(1, p)); schedule(); },
    enable(value: boolean) {
      enabled = value;
      if (value) ready();
      else { cancelAnimationFrame(frame); frame = 0; }
    },
    stop() {
      alive = false;
      cancelAnimationFrame(frame);
      video.removeEventListener("seeked", seeked);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("loadedmetadata", ready);
      document.removeEventListener("visibilitychange", ready);
    },
  };
}
