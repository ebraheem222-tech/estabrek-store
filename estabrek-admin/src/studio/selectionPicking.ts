import { shapeContains, type Pt, type Shape } from "./geometry";
import { pathTo, type TreeIndex } from "./treeIndex";
export function candidateStack(shapes: Shape[], point: Pt, painted: string[], index: TreeIndex, up: ReadonlyMap<string, string | null>, locked: ReadonlySet<string>, deep: boolean): string[] {
  const allowed = new Map(shapes.filter(s => s.id !== index.root && (deep || !s.id.startsWith("detail:")) && !pathTo(index, s.id, up).some(id => locked.has(id))).map(s => [s.id, s]));
  const geometry = [...allowed.values()].filter(s => shapeContains(s, point)).sort((a, b) => b.depth - a.depth || a.box.w * a.box.h - b.box.w * b.box.h);
  const resolve = (id: string) => id.startsWith("owner:s:") ? index.bySection.get(id.slice(8)) : id.startsWith("block:") && index.nodes.has(`rb-${id.slice(6)}`) ? `rb-${id.slice(6)}` : id;
  return [...new Set([...painted.map(resolve).filter((id): id is string => !!id && allowed.has(id)), ...geometry.map(s => s.id)])].slice(0, 100);
}
export const cycleCandidate = (ids: string[], selected: string | null) => ids.length ? ids[(Math.max(-1, selected ? ids.indexOf(selected) : -1) + 1) % ids.length] : null;
/** One pending pick; new gestures/panel selections invalidate old iframe replies. */
export class PointSelection {
  private serial = 0;
  private pending?: { id: string; timer: ReturnType<typeof setTimeout>; done: (ids: string[]) => void };
  request(fallback: string[], done: (ids: string[]) => void): string {
    this.cancel(); const id = `pick-${++this.serial}`;
    this.pending = { id, done, timer: setTimeout(() => this.resolve(id, fallback), 250) }; return id;
  }
  resolve(id: string, ids: string[]): boolean {
    if (this.pending?.id !== id) return false;
    const value = this.pending; this.pending = undefined; clearTimeout(value.timer); value.done(ids); return true;
  }
  cancel() { if (this.pending) clearTimeout(this.pending.timer); this.pending = undefined; }
}
