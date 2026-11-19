/**
 * Formatted words drawn (richText.ts reads them): bold, italic, lists, headings, quotes, links. Real elements,
 * never HTML from the words themselves.
 */
import { Fragment, type ReactNode } from "react";
import { parseRich, type RichInline } from "./richText";

function inline(xs: RichInline[]): ReactNode {
  return xs.map((x, k) => {
    if (x.t === "text") return <Fragment key={k}>{x.v}</Fragment>;
    if (x.t === "a") return <a key={k} href={x.href} {...(/^https?:/i.test(x.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inline(x.kids)}</a>;
    if (x.t === "b") return <strong key={k}>{inline(x.kids)}</strong>;
    if (x.t === "i") return <em key={k}>{inline(x.kids)}</em>;
    if (x.t === "s") return <s key={k}>{inline(x.kids)}</s>;
    return <code key={k}>{inline(x.kids)}</code>;
  });
}
const lines = (ls: RichInline[][]) => ls.map((l, k) => <Fragment key={k}>{k ? <br /> : null}{inline(l)}</Fragment>);

export function RichWords({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((b, k) => {
        if (b.t === "hr") return <hr key={k} />;
        if (b.t === "h") return b.level === 3 ? <h3 key={k}>{inline(b.kids)}</h3> : <h4 key={k}>{inline(b.kids)}</h4>;
        if (b.t === "ul") return <ul key={k}>{b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ul>;
        if (b.t === "ol") return <ol key={k}>{b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ol>;
        if (b.t === "quote") return <blockquote key={k}>{lines(b.lines)}</blockquote>;
        return <p key={k}>{lines(b.lines)}</p>;
      })}
    </>
  );
}
