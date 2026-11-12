/**
 * A motion curve's text, as the editor writes it and the shop plays it (shared/ease.ts in the shop and the admin
 * reads the same forms; the backend can't import outside src, so the check is repeated here):
 * a GSAP name ("power2.out"), "cubic-bezier(x1,y1,x2,y2)" with x in 0–1, or "spring(mass,stiffness,damping)".
 */
const FAMILIES = ["power1", "power2", "power3", "power4", "sine", "expo", "circ", "back", "elastic", "bounce"];
const WAYS = ["in", "out", "inOut"];
export const NAMED_EASES: ReadonlySet<string> = new Set(["none", ...FAMILIES.flatMap((f) => WAYS.map((w) => `${f}.${w}`))]);

const N = "(-?\\d+(?:\\.\\d+)?)";
const BEZIER = new RegExp(`^cubic-bezier\\(\\s*${N}\\s*,\\s*${N}\\s*,\\s*${N}\\s*,\\s*${N}\\s*\\)$`);
const SPRING = new RegExp(`^spring\\(\\s*${N}\\s*,\\s*${N}\\s*,\\s*${N}\\s*\\)$`);

export function isEase(text: unknown): boolean {
  if (typeof text !== "string" || text.length > 60) return false;
  const t = text.trim();
  if (NAMED_EASES.has(t)) return true;
  const b = BEZIER.exec(t);
  if (b) {
    const [x1, y1, x2, y2] = b.slice(1).map(Number);
    return x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1 && y1 >= -2 && y1 <= 3 && y2 >= -2 && y2 <= 3;
  }
  const s = SPRING.exec(t);
  if (s) {
    const [mass, stiffness, damping] = s.slice(1).map(Number);
    return mass >= 0.1 && mass <= 10 && stiffness >= 1 && stiffness <= 1000 && damping >= 0 && damping <= 100;
  }
  return false;
}
