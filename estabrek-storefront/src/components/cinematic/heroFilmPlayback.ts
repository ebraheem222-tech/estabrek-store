import { motionLevel, reportSeek } from "@/lib/motionBudget";

const MP4 = "/editorial/hero-film-120.mp4";
const WEBM = "/editorial/hero-film-120.webm";

/**
 * The hero films are encoded at 120 FPS (phone and computer, MP4 and WebM;
 * see SOURCES in RoseHeroFilm).
 *
 * This is the source timeline FPS, NOT a forced rendering rate.
 * Rendering is paced by requestAnimationFrame(), so:
 *
 * 60 Hz display  -> up to ~60 updates/sec
 * 90 Hz display  -> up to ~90 updates/sec
 * 120 Hz display -> up to ~120 updates/sec
 *
 * The decoder itself may run slower; we intentionally allow only
 * one outstanding seek at a time.
 *
 * The grid must match the file: a finer grid sends seeks that land inside
 * the frame already shown, and each of those still keeps a phone's decoder
 * busy (30–140 ms) while showing nothing new.
 */
const FILM_FPS = 120;

/**
 * Lite mode remains intentionally capped to 30 updates/sec
 * for weak devices / battery saving.
 */
const LITE_FPS = 30;

export function filmDataSaver() {
  return (
    navigator as Navigator & {
      connection?: {
        saveData?: boolean;
      };
    }
  ).connection?.saveData === true;
}

/**
 * Prefer MP4/H.264.
 *
 * For scroll scrubbing this is useful because some Android devices
 * can report VP9/WebM support while still being slower at repeated
 * random seeks.
 */
export async function heroFilmSources(
  video: HTMLVideoElement,
): Promise<string[]> {
  if (!video.canPlayType("video/mp4")) {
    return [WEBM];
  }

  return [MP4, WEBM];
}

/**
 * Scroll-driven video scrubber.
 *
 * Architecture:
 *
 * scroll
 *   ↓
 * progress target
 *   ↓
 * requestAnimationFrame (display refresh)
 *   ↓
 * 120 FPS video frame lookup
 *   ↓
 * one decoder seek at a time
 *   ↓
 * seeked
 *   ↓
 * present frame
 *
 * There is NO fixed 60 FPS cap in normal mode.
 *
 * requestAnimationFrame automatically follows the browser/display:
 * 60 / 90 / 120 / 144 Hz etc.
 *
 * Since the source video contains 120 FPS, frame selection is capped
 * naturally by FILM_FPS, while display refresh controls how frequently
 * we attempt to update it.
 */
/**
 * Played, not sought, going forward (`play`): the film runs to where the scroll is, as fast as it needs to (0.25×
 * to 4×), and stops there. Playing decodes each frame once, in order, on the fast path; every seek had the decoder
 * rebuild its frame from the last key frame, and a phone scrolling the opening spent most of its time on that
 * (measured 2026-11-12: 18 → 53 frames a second without the seeks). Going back, or a jump of more than
 * PLAY_REACH, still seeks. A browser that won't play it (no autoplay) seeks as before.
 */
const PLAY_REACH = 2;
/** How far ahead the film aims to catch up in (s): the further behind, the faster it plays. */
const PLAY_LEAD = 0.2;
const MIN_RATE = 0.25;
const MAX_RATE = 4;
/** A little past the scroll (from playing on a frame) is left alone, not sought back (s). */
const PLAY_SLACK = 0.12;

export function createFilmScrubber(
  video: HTMLVideoElement,
  onFrame: (index: number) => void,
  /** Frames per second of the clip. */
  fps = FILM_FPS,
  /** A key frame every this many frames (6 in the shop's own 120 fps films; 1 = unknown). */
  keyEvery = 1,
  { play = false }: { play?: boolean } = {},
) {

  /** Playing forward to the scroll now (see PLAY_REACH). */
  let playing = false;
  /** The browser refused to play it: seek only. */
  let noPlay = false;
  /** The scroll value it stopped at after playing (a frame or two past it is left alone). */
  let settled: number | null = null;

  let progress = 0;

  let rafId = 0;

  /**
   * Time of the last lite-mode update.
   *
   * Normal mode does NOT use this because rAF itself is our clock.
   */
  let lastLiteFrame = 0;

  /**
   * Timestamp at which the current seek was requested.
   *
   * null = decoder is free.
   */
  let asked: number | null = null;

  let enabled = true;
  let alive = true;

  /**
   * Prevent work when:
   * - component was destroyed
   * - animation was disabled
   * - browser tab is hidden
   */
  const active = () => {
    return alive && enabled && !document.hidden;
  };

  /**
   * Number of addressable frames in the video.
   */
  const getLastIndex = () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.ceil(video.duration * fps) - 1,
    );
  };

  /**
   * Current decoded video frame.
   */
  const getCurrentIndex = () => {
    const lastIndex = getLastIndex();

    return Math.min(
      lastIndex,
      Math.max(
        0,
        Math.floor(
          video.currentTime * fps + 0.001,
        ),
      ),
    );
  };

  /**
   * Tell the canvas/rendering layer which frame has actually
   * finished decoding.
   */
  const present = () => {
    if (
      !active() ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.seeking
    ) {
      return;
    }

    onFrame(getCurrentIndex());
  };

  /**
   * Request one render-cycle update.
   *
   * The browser chooses when this occurs based on the display's
   * refresh cycle.
   */
  const schedule = () => {
    if (!active() || rafId !== 0) {
      return;
    }

    rafId = requestAnimationFrame(seek);
  };

  /**
   * Main display-refresh loop.
   */
  const seek = (now: number) => {
    rafId = 0;

    if (!active()) {
      return;
    }

    /**
     * Metadata is enough to know the timeline duration.
     *
     * The actual image presentation waits for HAVE_CURRENT_DATA.
     */
    if (
      video.readyState < HTMLMediaElement.HAVE_METADATA ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return;
    }

    /**
     * Lite mode:
     *
     * Keep the old low-power behavior and limit update attempts
     * to ~30 FPS.
     *
     * Normal mode intentionally has NO fixed frame interval.
     * rAF controls it.
     */
    if (motionLevel() === "lite") {
      const interval = 1000 / LITE_FPS;

      if (now - lastLiteFrame < interval - 0.5) {
        schedule();
        return;
      }

      lastLiteFrame = now;
    } else {
      /**
       * Reset this so switching back to lite mode doesn't inherit
       * an old timestamp.
       */
      lastLiteFrame = 0;
    }

    /**
     * Critical decoder back-pressure.
     *
     * Do NOT start another seek while the previous seek is still
     * outstanding.
     *
     * This prevents:
     *
     * scroll
     * seek
     * seek
     * seek
     * seek
     *
     * from flooding the phone's video decoder.
     */
    if (asked !== null || video.seeking) {
      return;
    }

    /**
     * Forward and near: play there (see PLAY_REACH). Arrived (or a frame past it): stop.
     */
    if (play && !noPlay) {
      // Stopped a touch past the scroll after playing there: left as it is until the scroll moves.
      if (settled !== null && settled === progress) return;
      settled = null;
      const frame = 1 / fps;
      const target = Math.min(video.duration - 0.0001, progress * video.duration);
      const ahead = target - video.currentTime;
      if (ahead > frame * 1.5 && ahead < PLAY_REACH && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, ahead / PLAY_LEAD));
        if (Math.abs(video.playbackRate - rate) > rate * 0.1) video.playbackRate = rate;
        if (!playing) {
          playing = true;
          const started = video.play();
          if (started && typeof started.catch === "function") {
            started.catch(() => {
              playing = false;
              noPlay = true;
              schedule();
            });
          }
        }
        onFrame(getCurrentIndex());
        schedule();
        return;
      }
      if (playing) {
        playing = false;
        video.pause();
        if (ahead > -PLAY_SLACK) {
          settled = progress;
          present();
          return;
        }
      }
    }

    const lastIndex = getLastIndex();

    /**
     * Map smooth scroll progress directly onto the 120 FPS source
     * timeline.
     *
     * 10 second film:
     *
     * old 24 FPS:
     * 240 possible positions
     *
     * new 120 FPS:
     * 1200 possible positions
     */
    let index = Math.min(
      lastIndex,
      Math.max(
        0,
        Math.round(progress * lastIndex),
      ),
    );

    /**
     * Far behind the scroll (a fast scroll, either way): go to the
     * nearest key frame, which decodes on its own (about half the
     * time of a frame between key frames here, more on phones), so
     * the picture keeps up more often. Close to the scroll again,
     * every frame is exact.
     */
    if (
      keyEvery > 1 &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      Math.abs(index - getCurrentIndex()) > keyEvery * 3
    ) {
      index = Math.min(
        lastIndex,
        Math.round(index / keyEvery) * keyEvery,
      );
    }

    /**
     * Don't seek if the decoder is already displaying the desired
     * video frame.
     */
    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      getCurrentIndex() === index
    ) {
      return;
    }

    /**
     * Seek slightly inside the selected frame.
     *
     * This avoids floating-point / timestamp rounding putting us
     * accidentally into the previous frame.
     *
     * Frame duration at 120 FPS:
     *
     * 1 / 120 = 8.333 ms
     *
     * +0.1 means we seek ~0.833 ms inside the selected frame.
     */
    const targetTime =
      index === 0 &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ? 0
        : (index + 0.1) / fps;

    /**
     * Never seek beyond the actual media duration.
     */
    const safeTarget = Math.min(
      Math.max(0, video.duration - 0.0001),
      targetTime,
    );

    asked = performance.now();

    video.currentTime = safeTarget;
  };

  /**
   * Browser fires this after the requested frame has been decoded
   * and the seek operation has completed.
   */
  const seeked = () => {
    if (asked !== null) {
      reportSeek(
        performance.now() - asked,
      );

      asked = null;
    }

    /**
     * Present the frame that ACTUALLY completed decoding.
     */
    present();

    /**
     * Progress may have changed while the decoder was busy.
     *
     * Immediately ask for another display-refresh cycle so we
     * catch up to the newest scroll target instead of processing
     * old intermediate targets.
     */
    schedule();
  };

  /**
   * Media became usable.
   */
  const ready = () => {
    present();
    schedule();
  };

  /**
   * Visibility change:
   *
   * stop unnecessary work while hidden and resume cleanly when
   * returning to the page.
   */
  const visibilityChanged = () => {
    if (document.hidden) {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (playing) {
        playing = false;
        video.pause();
      }

      return;
    }

    ready();
  };

  /**
   * The media was reloaded (Retry, a new source): a seek still out
   * never reports back, and waiting for it would freeze the film.
   */
  const emptied = () => {
    asked = null;
  };

  video.addEventListener("seeked", seeked);
  video.addEventListener("loadeddata", ready);
  video.addEventListener("loadedmetadata", ready);
  video.addEventListener("emptied", emptied);

  document.addEventListener(
    "visibilitychange",
    visibilityChanged,
  );

  return {
    /**
     * Called by your smooth scroll/game-loop system.
     *
     * We only store the NEWEST target.
     *
     * Intermediate scroll positions don't create a seek queue.
     */
    update(p: number) {
      progress = Math.max(
        0,
        Math.min(1, p),
      );

      schedule();
    },

    /**
     * Temporarily enable / disable scrubbing.
     */
    enable(value: boolean) {
      enabled = value;

      if (value) {
        ready();
        return;
      }

      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },

    /**
     * Clean up everything when the hero unmounts.
     */
    stop() {
      alive = false;

      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }

      if (playing) {
        playing = false;
        video.pause();
      }

      video.removeEventListener(
        "seeked",
        seeked,
      );

      video.removeEventListener(
        "loadeddata",
        ready,
      );

      video.removeEventListener(
        "loadedmetadata",
        ready,
      );

      video.removeEventListener(
        "emptied",
        emptied,
      );

      document.removeEventListener(
        "visibilitychange",
        visibilityChanged,
      );
    },
  };
}
