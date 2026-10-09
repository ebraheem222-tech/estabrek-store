/**
 * Smooth time in seconds.
 *
 * Smaller = more responsive.
 * Larger  = more cinematic / softer.
 *
 * Good values:
 * 0.065 = fast
 * 0.090 = balanced
 * 0.110 = very smooth
 * 0.140 = cinematic
 */
const SMOOTH_TIME = 0.11;

/**
 * Never allow one bad/slow frame to create a huge simulation step.
 */
const MAX_DELTA_TIME = 1 / 30;

/**
 * Stop animating when we're extremely close to the target.
 */
const POSITION_EPSILON = 0.00001;
const VELOCITY_EPSILON = 0.00001;

type SmoothResult = {
  value: number;
  velocity: number;
};

/**
 * Critically-damped SmoothDamp.
 *
 * Similar to the type of smoothing commonly used for game cameras.
 *
 * Advantages over simple lerp:
 * - velocity is preserved between frames
 * - natural acceleration/deceleration
 * - frame-rate independent
 * - reverses smoothly
 * - does not overshoot the target
 */
function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  deltaTime: number,
): SmoothResult {
  smoothTime = Math.max(0.0001, smoothTime);
  deltaTime = Math.max(0, Math.min(deltaTime, MAX_DELTA_TIME));

  const omega = 2 / smoothTime;
  const x = omega * deltaTime;

  /**
   * Stable approximation of e^-x.
   * Works well even when a frame takes longer than expected.
   */
  const exp =
    1 /
    (1 +
      x +
      0.48 * x * x +
      0.235 * x * x * x);

  let change = current - target;

  const originalTarget = target;

  const temp =
    (velocity + omega * change) *
    deltaTime;

  velocity =
    (velocity - omega * temp) *
    exp;

  let value =
    target +
    (change + temp) * exp;

  /**
   * Prevent overshoot.
   */
  if (
    (originalTarget - current > 0) ===
    (value > originalTarget)
  ) {
    value = originalTarget;
    velocity = 0;
  }

  return {
    value,
    velocity,
  };
}

/**
 * Kept exported in case anything else in your project imports it.
 *
 * This remains a stateless helper.
 */
export function advanceScrollMotion(
  current: number,
  target: number,
  seconds: number,
) {
  const dt = Math.max(
    0,
    Math.min(seconds, MAX_DELTA_TIME),
  );

  return (
    current +
    (target - current) *
      -Math.expm1(-dt / SMOOTH_TIME)
  );
}

/**
 * Smooth hero scroll controller.
 *
 * Pipeline:
 *
 * raw scroll
 *    ↓
 * target progress
 *    ↓
 * requestAnimationFrame
 *    ↓
 * SmoothDamp physics
 *    ↓
 * current progress
 *    ↓
 * hero/video render
 */
export function createHeroScrollMotion(
  present: (progress: number) => void,
) {
  let current = 0;
  let target = 0;

  /**
   * Motion velocity is what makes this feel smoother
   * than a normal lerp.
   */
  let velocity = 0;

  let frame = 0;
  let last: number | null = null;

  let alive = true;
  let enabled = true;

  const active = () =>
    alive &&
    enabled &&
    !document.hidden;

  const moving = () =>
    Math.abs(target - current) >
      POSITION_EPSILON ||
    Math.abs(velocity) >
      VELOCITY_EPSILON;

  const schedule = () => {
    if (
      !active() ||
      frame !== 0 ||
      !moving()
    ) {
      return;
    }

    /**
     * Don't invent a fixed 60 FPS clock.
     *
     * requestAnimationFrame will naturally run with:
     *
     * 60 Hz
     * 90 Hz
     * 120 Hz
     * 144 Hz
     * etc.
     */
    frame = requestAnimationFrame(tick);
  };

  function tick(now: number) {
    frame = 0;

    if (!active()) {
      return;
    }

    /**
     * First frame has no elapsed simulation time.
     */
    if (last === null) {
      last = now;
      schedule();
      return;
    }

    let dt =
      (now - last) / 1000;

    last = now;

    /**
     * Protect against:
     * - browser hitch
     * - devtools pause
     * - background/foreground transition
     */
    dt = Math.max(
      0,
      Math.min(dt, MAX_DELTA_TIME),
    );

    const result = smoothDamp(
      current,
      target,
      velocity,
      SMOOTH_TIME,
      dt,
    );

    current = result.value;
    velocity = result.velocity;

    /**
     * Clamp because this value ultimately represents
     * normalized scroll progress.
     */
    current = Math.max(
      0,
      Math.min(1, current),
    );

    /**
     * Snap when extremely close.
     *
     * Otherwise tiny floating-point differences could
     * keep requestAnimationFrame alive unnecessarily.
     */
    if (
      Math.abs(target - current) <
        POSITION_EPSILON &&
      Math.abs(velocity) <
        VELOCITY_EPSILON
    ) {
      current = target;
      velocity = 0;
    }

    present(current);

    if (moving()) {
      schedule();
    } else {
      last = null;
    }
  }

  const visibility = () => {
    if (frame !== 0) {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    /**
     * Reset elapsed time after returning from another tab.
     * Otherwise we'd get one giant dt.
     */
    last = null;

    if (active()) {
      schedule();
    }
  };

  document.addEventListener(
    "visibilitychange",
    visibility,
  );

  return {
    /**
     * ScrollTrigger sends us the raw desired position.
     *
     * Don't move immediately.
     * Just change the destination.
     */
    target(progress: number) {
      target = Math.max(
        0,
        Math.min(1, progress),
      );

      schedule();
    },

    enable(value: boolean) {
      enabled = value;

      if (!value) {
        if (frame !== 0) {
          cancelAnimationFrame(frame);
          frame = 0;
        }

        last = null;
        velocity = 0;

        return;
      }

      schedule();
    },

    stop() {
      alive = false;

      if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }

      velocity = 0;
      last = null;

      document.removeEventListener(
        "visibilitychange",
        visibility,
      );
    },
  };
}
