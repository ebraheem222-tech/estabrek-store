import type { KitNode } from "../src/storeThemes/kits";

/** Only visible composition: IDs, names, copy, colour, assets, fonts and motion are excluded. */
export function structuralShape(n: KitNode, coarse = false): string {
  const b = n.style?.base ?? {};
  const layout = coarse ? {} : {
    ...(b.direction ? { direction: b.direction } : {}),
    ...(b.columns ? { columns: b.columns } : {}),
    ...(b.widths ? { widths: b.widths } : {}),
    ...(b.col ? { span: b.col } : {}),
    ...(b.row ? { rows: b.row } : {}),
    ...(b.layer ? { overlay: true } : {}),
    ...(n.type === "image" ? { aspect: b.aspect ?? b.height, circle: b.radius === 999 } : {}),
    ...(["products", "categories", "tabs", "accordion"].includes(n.type) ? { layout: n.props.look ?? n.props.layout, columns: n.props.columns, count: n.props.limit, card: n.props.card } : {}),
  };
  return `${n.type}${JSON.stringify(layout)}(${(n.children ?? []).map((x) => structuralShape(x, coarse)).join(",")})`;
}

/** Sorting the sections explicitly rejects designs distinguished only by section ordering. */
export const pageStructure = (nodes: KitNode[], coarse = false) => nodes.map((n) => structuralShape(n, coarse)).sort().join("\n");

/** Multiset overlap (repeated blocks count); the shared header/footer are deliberately omitted. */
export function sharedStructure(a: string[], b: string[]): number {
  const remaining = [...b];
  let shared = 0;
  for (const x of a) {
    const i = remaining.indexOf(x);
    if (i >= 0) { shared++; remaining.splice(i, 1); }
  }
  return 2 * shared / (a.length + b.length);
}

export const flattenCatalog = (nodes: KitNode[]): KitNode[] => nodes.flatMap((n) => [n, ...flattenCatalog(n.children ?? [])]);
