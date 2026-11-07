import { cloneElement, createElement, Fragment, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { color } from "./css";
import { ArtView, safeArt } from "./svgArt";

/** Decorative bands share an object's existing host and never take layout space. */
export function nodeEdges(id: string, raw: unknown): ReactElement[] {
  const edges = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return (["top", "bottom"] as const).flatMap(where => {
    const value = edges[where];
    const edge = value && typeof value === "object" ? value as Record<string, unknown> : null;
    const art = edge ? safeArt(edge.art) : null;
    const height = Number(edge?.height), phone = Number(edge?.phone), tint = color(edge?.color);
    if (!edge || !art || !tint || !(height >= 4 && height <= 400)) return [];
    const style = { "--pt-eh": `${height}px`, ...(phone >= 4 && phone <= 400 ? { "--pt-ehp": `${phone}px` } : {}), color: tint } as CSSProperties;
    return [<span key={where} className={`pt-edge pt-edge-${where}${edge.flip === true ? " pt-edge-flip" : ""}${edge.front === true ? " pt-edge-front" : ""}`} style={style} aria-hidden="true" contentEditable={false}>
      <ArtView art={art} prefix={`${id}-${where}`} stretch />
    </span>];
  });
}

type HostProps = { children?: ReactNode; decoration?: ReactNode; className?: string; "data-tree-node"?: string };
/** Custom roots forward decoration to their DOM host; native roots keep their identity. */
export function withDecoration(view: ReactNode, decoration: ReactNode): ReactNode {
  if (!isValidElement(view)) return view;
  const element = view as ReactElement<HostProps>;
  if (element.type === "a" && !element.props["data-tree-node"] && element.props.className === "pt-image-link") {
    return cloneElement(element, { children: withDecoration(element.props.children, decoration) });
  }
  // Replaced media use their existing frame when decorated. A plain image cannot hold children.
  if (element.type === "img") return element;
  if (element.type === "hr") return !decoration || (Array.isArray(decoration) && !decoration.length) ? element : createElement("div", { ...element.props, key: element.key, role: "separator" }, decoration);
  // Keep this slot even when empty so a container's children never change Fragment depth.
  return cloneElement(element, typeof element.type === "string" ? { children: createElement(Fragment, null, element.props.children, decoration) } : { decoration });
}
