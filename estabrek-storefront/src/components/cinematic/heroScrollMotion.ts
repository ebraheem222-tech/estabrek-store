export function advanceScrollMotion(current: number, target: number, seconds: number) {
  // A 65ms response time, expressed in seconds rather than steps per frame.
  // Exponential damping stays stable on slow frames and reverses without overshoot.
  return current + (target - current) * -Math.expm1(-Math.max(0, seconds) / .065);
}

export function createHeroScrollMotion(present: (progress: number) => void) {
  let current = 0, target = 0, frame = 0;
  let last: number | null = null;
  let alive = true, enabled = true;
  const active = () => alive && enabled && !document.hidden;
  const schedule = () => {
    if (!active() || frame || current === target) return;
    last ??= performance.now();
    frame = requestAnimationFrame(tick);
  };
  function tick(now: number) {
    frame = 0;
    if (!active()) return;
    current = advanceScrollMotion(current, target, (now - (last ?? now)) / 1000);
    last = now;
    if (Math.abs(current - target) < 1e-5) current = target;
    present(current);
    if (current === target) last = null;
    else schedule();
  }
  const visibility = () => {
    cancelAnimationFrame(frame); frame = 0; last = null;
    if (active()) schedule();
  };
  document.addEventListener("visibilitychange", visibility);
  return {
    target(progress: number) { target = Math.max(0, Math.min(1, progress)); schedule(); },
    enable(value: boolean) { enabled = value; visibility(); },
    stop() {
      alive = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
