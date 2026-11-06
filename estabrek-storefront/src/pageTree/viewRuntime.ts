export type ViewTarget = { node: Element; config: string };

/** A runtime owns these DOM targets/configs, rather than the whole document. */
export function viewTargets(root: ParentNode, selector: string, attributes: readonly string[]): ViewTarget[] {
  return Array.from(root.querySelectorAll(selector), node => ({ node, config: JSON.stringify([...attributes.map(name => name === "$color" ? node.ownerDocument.defaultView?.getComputedStyle(node).color : node.getAttribute(name)), node.tagName === "SCRIPT" ? node.textContent : null]) }));
}

/** Each DOM player keeps its lifecycle until its own config or target changes. */
export class ViewRuntimeRegistry {
  private readonly start: (target: ViewTarget) => () => void;
  private readonly players = new Map<Element, { config: string; stop: () => void }>();

  constructor(start: (target: ViewTarget) => () => void) { this.start = start; }

  reconcile(targets: ViewTarget[]) {
    const next = new Map(targets.map(target => [target.node, target.config]));
    for (const [node, player] of this.players) {
      if (!next.has(node) || next.get(node) !== player.config) {
        player.stop(); this.players.delete(node);
      }
    }
    for (const target of targets) {
      if (!this.players.has(target.node)) this.players.set(target.node, { config: target.config, stop: this.start(target) });
    }
  }

  clear() { for (const player of this.players.values()) player.stop(); this.players.clear(); }
}

export function sameViewTargets(before: ViewTarget[], after: ViewTarget[]): boolean {
  return before.length === after.length && before.every((target,index) => target.node === after[index].node && target.config === after[index].config);
}
