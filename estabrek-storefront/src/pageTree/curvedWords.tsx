/**
 * A heading's or text's words along a curve (props `curve`, focus mode: shared/textCurve.ts), drawn on the server
 * as SVG `textPath` inside the element, so its colour, font and weight stay its own; screen readers read the words.
 */
import { curvePath, plainWords, type Curve } from "../../../shared/textCurve";

export function CurvedWords({ id, text, curve }: { id: string; text: string; curve: Curve }) {
  const words = plainWords(text);
  const { viewBox, d } = curvePath(curve.kind, curve.bend ?? 50);
  const pathId = `${id}-curve`;
  return (
    <svg className="pt-curve" viewBox={viewBox} role="img" aria-label={words} data-curve={curve.kind}>
      <defs>
        <path id={pathId} d={d} fill="none" />
      </defs>
      <text fill="currentColor" textAnchor="middle" fontSize={curve.size ?? 80} letterSpacing={curve.space ?? 0}>
        <textPath href={`#${pathId}`} startOffset="50%">{words}</textPath>
      </text>
    </svg>
  );
}
