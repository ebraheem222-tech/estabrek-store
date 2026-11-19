/**
 * Formatted words written (a rich text field): marks put on the selection from a small bar, the words as written
 * (Markdown), and how a page will draw them. The shop's own reader (estabrek-storefront pageTree/richText.ts) makes
 * the preview, so what is seen here is what the page shows.
 */
import { Fragment, useRef, useState, type ReactNode } from "react";
import { say } from "../../studio/say";
import { parseRich, type RichInline } from "../../../../estabrek-storefront/src/pageTree/richText";
import { RICH_MARKS, markWords } from "../collections/computedText";

const inline = (xs: RichInline[]): ReactNode =>
  xs.map((x, k) =>
    x.t === "text" ? <Fragment key={k}>{x.v}</Fragment> : x.t === "a" ? <a key={k} href={x.href} target="_blank" rel="noreferrer" className="underline">{inline(x.kids)}</a> : x.t === "b" ? <strong key={k}>{inline(x.kids)}</strong> : x.t === "i" ? <em key={k}>{inline(x.kids)}</em> : x.t === "s" ? <s key={k}>{inline(x.kids)}</s> : <code key={k} className="rounded bg-white/10 px-1">{inline(x.kids)}</code>,
  );
const lines = (ls: RichInline[][]) => ls.map((l, k) => <Fragment key={k}>{k ? <br /> : null}{inline(l)}</Fragment>);

/** How a page draws the words (the shop's reader). */
export function RichPreview({ words }: { words: string }) {
  const blocks = parseRich(words);
  if (!blocks.length) return <p className="text-white/35">{say("لسا ما في كلام|Nothing written yet|עדיין לא נכתב כלום")}</p>;
  return (
    <div className="space-y-2 text-sm leading-6 [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5">
      {blocks.map((b, k) =>
        b.t === "hr" ? <hr key={k} className="border-white/15" /> : b.t === "h" ? <div key={k} className={b.level === 3 ? "text-base font-semibold" : "font-semibold"}>{inline(b.kids)}</div> : b.t === "ul" ? <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul> : b.t === "ol" ? <ol key={k}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol> : b.t === "quote" ? <blockquote key={k} className="border-s-2 border-white/30 ps-3 text-white/75">{lines(b.lines)}</blockquote> : <p key={k}>{lines(b.lines)}</p>,
      )}
    </div>
  );
}

export function RichTextBox({ value, onChange, className, dir, testId, rows = 6 }: { value: string; onChange: (v: string) => void; className: string; dir?: "rtl" | "ltr"; testId?: string; rows?: number }) {
  const box = useRef<HTMLTextAreaElement>(null);
  const [look, setLook] = useState(false);
  const put = (mark: (typeof RICH_MARKS)[number]["mark"]) => {
    const el = box.current;
    const out = markWords(value, el?.selectionStart ?? value.length, el?.selectionEnd ?? value.length, mark);
    onChange(out.words);
    // The words just marked stay picked (a link: its address, to be written over).
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(out.from, out.to); });
  };
  const tool = "rounded-md px-2 py-0.5 text-xs text-white/75 hover:bg-white/10";
  return (
    <div className="space-y-1" data-testid={testId ? `${testId}-rich` : undefined}>
      <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5" role="toolbar" aria-label={say("تنسيق|Formatting|עיצוב")}>
        {RICH_MARKS.map((m) => (
          <button key={m.mark} type="button" className={`${tool} ${m.mark === "bold" ? "font-bold" : m.mark === "italic" ? "italic" : m.mark === "strike" ? "line-through" : ""}`} title={say(m.say)} aria-label={say(m.say)} onMouseDown={(e) => e.preventDefault()} onClick={() => put(m.mark)} data-testid={testId ? `${testId}-mark-${m.mark}` : undefined}>
            {m.label}
          </button>
        ))}
        <button type="button" className={`${tool} ms-auto ${look ? "bg-white/10" : ""}`} aria-pressed={look} onClick={() => setLook(!look)} data-testid={testId ? `${testId}-look` : undefined}>
          {say("معاينة|Preview|תצוגה מקדימה")}
        </button>
      </div>
      {look ? (
        <div className="min-h-[96px] rounded-lg border border-white/10 p-3" dir={dir} data-testid={testId ? `${testId}-preview` : undefined}>
          <RichPreview words={value} />
        </div>
      ) : (
        <textarea ref={box} className={className} rows={rows} dir={dir} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />
      )}
    </div>
  );
}
