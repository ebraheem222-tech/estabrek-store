/**
 * A picture's sparkling stars (image props `sparkle`, made in the editor's focus mode: shared/sparkle.ts), drawn on
 * the server as small SVG stars over the picture. They twinkle in CSS alone (pageTree/css.ts `pt-twinkle`: size,
 * turn and see-through only, so the graphics card does it), each at its own moment; the page's rest pauses them.
 * Always, while the pointer is on the picture, or a few times. Nothing moves for whoever asked for less motion.
 */
import type { CSSProperties } from "react";
import { SPARKLE_PATHS, sparkleColour, type Sparkle } from "../../../shared/sparkle";

export function SparkleLayer({ sparkle }: { sparkle: Sparkle }) {
  const path = SPARKLE_PATHS[sparkle.shape ?? "glint"];
  const speed = sparkle.speed ?? 1.8;
  return (
    <span
      className="pt-sparkles" aria-hidden="true" data-when={sparkle.when ?? "always"} data-glow={sparkle.glow ? "" : undefined}
      style={{ "--sp-size": `${sparkle.size ?? 16}px`, "--sp-color": sparkleColour(sparkle.color), "--sp-speed": `${speed}s` } as CSSProperties}
    >
      {sparkle.points.map((p, i) => (
        <svg
          key={i} className="pt-spark" viewBox="0 0 24 24" focusable="false"
          // Each star at its own moment of the twinkle (spread by the golden ratio, so no two line up).
          style={{ left: `${Math.round(p.x * 1000) / 10}%`, top: `${Math.round(p.y * 1000) / 10}%`, "--s": p.s ?? 1, "--d": `${-Math.round(((i * 0.618) % 1) * speed * 100) / 100}s` } as CSSProperties}
        >
          <path d={path} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}
