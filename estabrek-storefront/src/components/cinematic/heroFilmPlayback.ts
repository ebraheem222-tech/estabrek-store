import { motionLevel, reportSeek } from "@/lib/motionBudget";

const MP4 = "/editorial/hero-film.mp4";
const WEBM = "/editorial/hero-film.webm";

/**
 * All hero videos are now encoded at 120 FPS.
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
export function createFilmScrubber(
  video: HTMLVideoElement,
  onFrame: (index: number) => void,
) {
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
      Math.ceil(video.duration * FILM_FPS) - 1,
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
          video.currentTime * FILM_FPS + 0.001,
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
    const index = Math.min(
      lastIndex,
      Math.max(
        0,
        Math.round(progress * lastIndex),
      ),
    );

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
        : (index + 0.1) / FILM_FPS;

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

      return;
    }

    ready();
  };

  video.addEventListener("seeked", seeked);
  video.addEventListener("loadeddata", ready);
  video.addEventListener("loadedmetadata", ready);

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

      document.removeEventListener(
        "visibilitychange",
        visibilityChanged,
      );
    },
  };
}
