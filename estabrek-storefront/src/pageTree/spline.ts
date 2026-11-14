/**
 * A smooth way through values given at their times (smooth keyframes glide the element through its moments'
 * places with it, instead of going straight from one to the next and turning sharply at each).
 *
 * It is a cubic Hermite spline: between two moments the value follows a cubic that leaves the first and reaches
 * the second at the speeds set there, so the speed never jumps at a moment. A moment's speed is the slope
 * between its two neighbours (Catmull–Rom, over uneven times); the first and the last are at rest, so the whole
 * way starts and ends gently. It passes through every value at its own time.
 *
 * Plain TypeScript: no DOM, no React and no "@/" imports.
 */
export function glideTrack(times: number[], values: number[]): (t: number) => number {
  const n = Math.min(times.length, values.length);
  if (n === 0) return () => 0;
  if (n === 1) return () => values[0];
  const gap = (a: number, b: number) => Math.max(1e-6, times[b] - times[a]);
  // The speed at each moment: between its neighbours, and none at the two ends.
  const speed = values.slice(0, n).map((_, i) => (i === 0 || i === n - 1 ? 0 : (values[i + 1] - values[i - 1]) / gap(i - 1, i + 1)));
  return (t: number) => {
    if (!(t > times[0])) return values[0];
    if (t >= times[n - 1]) return values[n - 1];
    let i = 0;
    while (i < n - 2 && t > times[i + 1]) i++;
    const dt = gap(i, i + 1);
    const u = Math.min(1, Math.max(0, (t - times[i]) / dt));
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * values[i] + (u3 - 2 * u2 + u) * dt * speed[i] + (3 * u2 - 2 * u3) * values[i + 1] + (u3 - u2) * dt * speed[i + 1];
  };
}
