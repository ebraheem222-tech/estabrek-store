type Options = {
  smoothTime?: number;
  maxDeltaTime?: number;
  epsilon?: number;
};

type SmoothResult = {
  value: number;
  velocity: number;
};

const clamp01 = (value: number) =>
  Math.max(0, Math.min(1, value));

function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  deltaTime: number,
): SmoothResult {
  smoothTime = Math.max(0.0001, smoothTime);

  const omega = 2 / smoothTime;
  const x = omega * deltaTime;

  // Stable e^-x approximation used by game-style SmoothDamp.
  const exp =
    1 /
    (
      1 +
      x +
      0.48 * x * x +
      0.235 * x * x * x
    );

  const change = current - target;
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

  // Prevent overshoot.
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
 * Generic scroll motion controller.
 *
 * Scroll does NOT render.
 * Scroll only changes the destination.
 *
 * Browser display refresh controls rendering through rAF.
 */
export function createScrollProgressMotion(
  present: (progress: number) => void,
  options: Options = {},
) {
  const smoothTime =
    options.smoothTime ?? 0.09;

  const maxDeltaTime =
    options.maxDeltaTime ?? 1 / 30;

  const epsilon =
    options.epsilon ?? 0.00001;

  let current = 0;
  let target = 0;
  let velocity = 0;

  let frame = 0;
  let last: number | null = null;

  let alive = true;

  const active = () =>
    alive && !document.hidden;

  const moving = () =>
    Math.abs(target - current) > epsilon ||
    Math.abs(velocity) > epsilon;

  const schedule = () => {
    if (
      !active() ||
      frame !== 0 ||
      !moving()
    ) {
      return;
    }

    frame =
      requestAnimationFrame(tick);
  };

  function tick(now: number) {
    frame = 0;

    if (!active()) {
      return;
    }

    if (last === null) {
      last = now;
      schedule();
      return;
    }

    const dt = Math.max(
      0,
      Math.min(
        (now - last) / 1000,
        maxDeltaTime,
      ),
    );

    last = now;

    const result = smoothDamp(
      current,
      target,
      velocity,
      smoothTime,
      dt,
    );

    current =
      clamp01(result.value);

    velocity =
      result.velocity;

    if (
      Math.abs(target - current) <
        epsilon &&
      Math.abs(velocity) <
        epsilon
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
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }

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
     * ScrollTrigger calls this.
     * It does NOT render immediately.
     */
    target(value: number) {
      target = clamp01(value);
      schedule();
    },

    /**
     * Used for:
     * - initial page position
     * - ScrollTrigger refresh
     * - resize/re-layout
     *
     * We don't want animation from 0 when the user
     * refreshes halfway down the page.
     */
    snap(value: number) {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }

      current = clamp01(value);
      target = current;

      velocity = 0;
      last = null;

      present(current);
    },

    stop() {
      alive = false;

      if (frame) {
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
