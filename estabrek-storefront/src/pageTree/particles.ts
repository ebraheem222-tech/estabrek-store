/**
 * Particles behind a section (tsParticles, pageTree/TreeMedia.tsx): each kind as its options,
 * in the section's colour (or a few for confetti), `amount` = how many, `speed` = how fast.
 * They draw inside the section only, rest while it's out of sight, and never take the mouse.
 */
export const PARTICLE_KINDS = ["snow", "stars", "bubbles", "links", "fireflies", "confetti", "hearts", "sparkles"] as const;
export type ParticleSpec = { kind: (typeof PARTICLE_KINDS)[number]; amount?: number; speed?: number };

const within = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : def);

/** A section's particles as the shop keeps them, or null (unknown kinds and numbers out of range drop out). */
export function particlesOf(raw: unknown): (ParticleSpec & { color?: string }) | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const kind = r && (PARTICLE_KINDS as readonly string[]).includes(String(r.kind)) ? (r.kind as ParticleSpec["kind"]) : null;
  if (!r || !kind) return null;
  return { kind, amount: within(r.amount, 0.2, 3, 1), speed: within(r.speed, 0.2, 3, 1), ...(typeof r.color === "string" ? { color: r.color } : {}) };
}

export function particleOptions(s: ParticleSpec, color: string): Record<string, unknown> {
  const n = (v: number) => Math.round(v * (s.amount ?? 1));
  const v = (x: number) => +(x * (s.speed ?? 1)).toFixed(2);
  const base = { fullScreen: { enable: false }, fpsLimit: 60, detectRetina: true, pauseOnOutsideViewport: true, background: { color: "transparent" }, interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } } };
  const particles = (p: Record<string, unknown>) => ({ ...base, particles: { color: { value: color }, number: { value: 50 }, ...p } });
  switch (s.kind) {
    case "snow":
      return particles({ number: { value: n(80) }, shape: { type: "circle" }, opacity: { value: { min: 0.4, max: 0.9 } }, size: { value: { min: 1, max: 4 } }, move: { enable: true, direction: "bottom", speed: { min: v(0.4), max: v(1.4) }, straight: false, random: true, outModes: { default: "out" } } });
    case "stars":
      return particles({ number: { value: n(120) }, shape: { type: "circle" }, size: { value: { min: 0.5, max: 2 } }, opacity: { value: { min: 0.1, max: 1 }, animation: { enable: true, speed: v(0.8), sync: false } }, move: { enable: true, speed: v(0.15), random: true, outModes: { default: "out" } } });
    case "bubbles":
      return particles({ number: { value: n(30) }, shape: { type: "circle" }, opacity: { value: { min: 0.15, max: 0.4 } }, size: { value: { min: 4, max: 18 } }, move: { enable: true, direction: "top", speed: { min: v(0.4), max: v(1.2) }, random: true, outModes: { default: "out" } } });
    case "links":
      return particles({ number: { value: n(60) }, shape: { type: "circle" }, size: { value: 2 }, opacity: { value: 0.7 }, links: { enable: true, distance: 130, color: color, opacity: 0.35, width: 1 }, move: { enable: true, speed: v(1), random: true, outModes: { default: "bounce" } } });
    case "fireflies":
      return particles({ number: { value: n(40) }, shape: { type: "circle" }, size: { value: { min: 1, max: 3 } }, opacity: { value: { min: 0.1, max: 1 }, animation: { enable: true, speed: v(1.2), sync: false } }, shadow: { enable: true, blur: 8, color: { value: color } }, move: { enable: true, speed: v(0.6), random: true, outModes: { default: "out" } } });
    case "confetti":
      return particles({
        number: { value: n(60) }, color: { value: [color, "#f43f5e", "#f59e0b", "#10b981", "#3b82f6"] }, shape: { type: ["square", "circle"] },
        size: { value: { min: 3, max: 6 } }, opacity: { value: 0.9 }, rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: v(12) } },
        move: { enable: true, direction: "bottom", speed: { min: v(1), max: v(2.5) }, random: true, outModes: { default: "out" } },
      });
    case "hearts":
      return particles({ number: { value: n(24) }, shape: { type: "text", options: { text: { value: ["♥"], font: "Arial", weight: "400" } } }, size: { value: { min: 6, max: 14 } }, opacity: { value: { min: 0.3, max: 0.8 } }, move: { enable: true, direction: "top", speed: { min: v(0.4), max: v(1.1) }, random: true, outModes: { default: "out" } } });
    case "sparkles":
      return particles({ number: { value: n(50) }, shape: { type: "star", options: { star: { sides: 4, inset: 3 } } }, size: { value: { min: 1, max: 4 } }, opacity: { value: { min: 0, max: 1 }, animation: { enable: true, speed: v(1.5), sync: false } }, move: { enable: true, speed: v(0.3), random: true, outModes: { default: "out" } } });
  }
}
