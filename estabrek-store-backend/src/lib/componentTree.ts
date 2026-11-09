/**
 * Main components (W2), as pure tree work (no imports, so the editor's test page uses it too):
 * a component is a page of kind "component" whose first section holds its variants (each element
 * there is a variant, its name the variant's name). A page uses one with a `component` node
 * { componentId, variant?, overrides? }: the shop gets the chosen variant in its place, each inner
 * element's props changed by the instance's overrides (keyed by the inner element's id in the
 * main component), its ids renamed after the instance so they stay unique on the page (the root
 * takes the instance's own id, so the editor selects it as one), and the instance's own style
 * (its place and size on this page) over the variant's. Components may use other components,
 * three deep at most, never themselves.
 */

type Node = { id: string; type: string; name?: string; props: Record<string, unknown>; style?: Record<string, Record<string, unknown> | undefined>; motion?: unknown; children?: Node[] };
type Tree = { version: number; root: Node };

export const COMPONENT_DEPTH = 3;
/** Inner props an instance can change, and how many inner elements at most. */
export const OVERRIDE_LIMIT = 60;

/** A component's variants: what its first section holds. */
export function variantsOf(tree: Tree | null | undefined): Node[] {
  const section = tree?.root.children?.find((n) => n.type === "section");
  return section?.children ?? [];
}

/** Every component a tree uses, at any depth. */
export function componentIdsOf(tree: Tree | null | undefined): string[] {
  const out = new Set<string>();
  const walk = (n: Node) => {
    if (n.type === "component" && typeof n.props?.componentId === "string") out.add(n.props.componentId);
    n.children?.forEach(walk);
  };
  if (tree) walk(tree.root);
  return [...out];
}

const mergeStyle = (under: Node["style"], over: Node["style"]): Node["style"] => {
  if (!under && !over) return undefined;
  const out: NonNullable<Node["style"]> = {};
  for (const screen of new Set([...Object.keys(under ?? {}), ...Object.keys(over ?? {})])) {
    const merged = { ...(under?.[screen] ?? {}), ...(over?.[screen] ?? {}) };
    if (Object.keys(merged).length) out[screen] = merged;
  }
  return Object.keys(out).length ? out : undefined;
};

/** The instance drawn: its variant with overrides, renamed after it; null when its component is gone. */
export function expandInstance(node: Node, comps: ReadonlyMap<string, Node[]>, accept: (type: string, props: Record<string, unknown>) => boolean = () => true, seen: ReadonlySet<string> = new Set(), depth = 0): Node | null {
  const id = typeof node.props?.componentId === "string" ? node.props.componentId : "";
  if (!id || seen.has(id) || depth >= COMPONENT_DEPTH) return null;
  const variants = comps.get(id);
  if (!variants?.length) return null;
  const variant = variants.find((v) => v.id === node.props.variant) ?? variants[0];
  const overrides = (node.props.overrides && typeof node.props.overrides === "object" ? node.props.overrides : {}) as Record<string, Record<string, unknown>>;
  const stem = node.id.slice(0, 40);
  let n = 0;
  const next = () => `${stem}_${(n++).toString(36)}`;
  const inner = new Set([...seen, id]);
  const walk = (v: Node, newId: string): Node | null => {
    const { children, ...rest } = v;
    const own = structuredClone(rest) as Node;
    const over = overrides[v.id];
    if (over && typeof over === "object") {
      const merged = { ...own.props, ...over };
      if (accept(v.type, merged)) own.props = merged;
    }
    own.id = newId;
    if (v.type === "component") return expandInstance(own, comps, accept, inner, depth + 1);
    if (children) own.children = children.map((c) => walk(c, next())).filter((c): c is Node => c !== null);
    return own;
  };
  const root = walk(variant, node.id);
  if (!root) return null;
  root.style = mergeStyle(variant.style, node.style);
  if (!root.style) delete root.style;
  if (node.motion !== undefined) root.motion = node.motion;
  if (node.name) root.name = node.name;
  return root;
}

/** The tree with every instance drawn as its component (an instance of a component that's gone draws nothing). */
export function expandComponents<T extends Tree>(tree: T, comps: ReadonlyMap<string, Node[]>, accept?: (type: string, props: Record<string, unknown>) => boolean): T {
  let changed = false;
  const walk = (n: Node): Node | null => {
    if (n.type === "component") { changed = true; return expandInstance(n, comps, accept); }
    if (!n.children?.length) return n;
    const kids = n.children.map(walk).filter((c): c is Node => c !== null);
    return kids.length === n.children.length && kids.every((k, i) => k === n.children![i]) ? n : { ...n, children: kids };
  };
  const root = walk(tree.root)!;
  return changed ? ({ ...tree, root } as T) : tree;
}
