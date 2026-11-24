/**
 * The owner's theme library in the editor (docs/themes-library-plan.ar.md): its pieces in the Add panel ("من
 * المكتبة"), and a piece's panel — the store's name for the piece's made-up one, the piece's words in the owner's
 * (each text as the library wrote it, in the language being edited), and its colours (a whole colour family from one
 * colour, or the store theme's accent; or one colour as the library wrote it). The shop draws it (LibBlock.tsx).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { LIB_KIND_NAME, libDetails, libItemOf, libName, type LibDetails } from "./library";
import { Field } from "./StudioPanels";
import { say } from "./say";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Local = Partial<Record<Lang, string>>;

const FAMILY_NAME: Record<string, string> = {
  slate: "رمادي مزرق|Slate|אפור כחלחל", gray: "رمادي|Gray|אפור", zinc: "رمادي معدني|Zinc|אבץ", neutral: "محايد|Neutral|ניטרלי",
  stone: "حجري|Stone|אבן", red: "أحمر|Red|אדום", orange: "برتقالي|Orange|כתום", amber: "كهرماني|Amber|ענבר", yellow: "أصفر|Yellow|צהוב",
  lime: "ليموني|Lime|ליים", green: "أخضر|Green|ירוק", emerald: "زمردي|Emerald|ברקת", teal: "تركوازي غامق|Teal|כחול-ירקרק",
  cyan: "سماوي|Cyan|טורקיז", sky: "أزرق سماوي|Sky|תכלת", blue: "أزرق|Blue|כחול", indigo: "نيلي|Indigo|אינדיגו",
  violet: "بنفسجي|Violet|סגול", purple: "أرجواني|Purple|ארגמן", fuchsia: "فوشيا|Fuchsia|פוקסיה", pink: "زهري|Pink|ורוד", rose: "وردي|Rose|ורד",
};
/** Tailwind's own 500 of each family: what a family looks like before the owner changes it. */
const FAMILY_500: Record<string, string> = {
  slate: "#64748b", gray: "#6b7280", zinc: "#71717a", neutral: "#737373", stone: "#78716c", red: "#ef4444", orange: "#f97316", amber: "#f59e0b",
  yellow: "#eab308", lime: "#84cc16", green: "#22c55e", emerald: "#10b981", teal: "#14b8a6", cyan: "#06b6d4", sky: "#0ea5e9", blue: "#3b82f6",
  indigo: "#6366f1", violet: "#8b5cf6", purple: "#a855f7", fuchsia: "#d946ef", pink: "#ec4899", rose: "#f43f5e",
};

const HEX6 = /^#[0-9a-f]{6}$/i;
const box = "space-y-3 rounded-xl border border-white/[0.08] p-3";
const small = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] text-white/75 hover:bg-white/[0.1] disabled:opacity-40";
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const inLang = (v: unknown, lang: Lang) => (typeof v === "string" ? v : typeof rec(v)[lang] === "string" ? String(rec(v)[lang]) : "");
const withLang = (v: unknown, lang: Lang, text: string): Local | undefined => {
  const out = { ...(rec(v) as Local) };
  if (text.trim()) out[lang] = text;
  else delete out[lang];
  return Object.keys(out).length ? out : undefined;
};

/** A colour that is kept when its picker closes (not on every move inside it). */
function Swatch({ value, was, busy, label, onPick, testId, data }: { value: string; was: string; busy: boolean; label: string; onPick: (v: string) => void; testId: string; data: Record<string, string> }) {
  const input = useRef<HTMLInputElement>(null);
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const latest = useRef({ value, onPick });
  latest.current = { value, onPick };
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const done = () => { if (el.value.toLowerCase() !== latest.current.value.toLowerCase()) latest.current.onPick(el.value.toLowerCase()); };
    el.addEventListener("change", done);
    return () => el.removeEventListener("change", done);
  }, []);
  const changed = value.toLowerCase() !== was.toLowerCase();
  return (
    <label className={`relative block h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border ${changed ? "border-accent-400" : "border-white/[0.12]"}`} title={label} style={{ background: hex }}>
      <input ref={input} type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={label} disabled={busy} value={hex} onChange={(e) => setHex(e.target.value)} data-testid={testId} {...Object.fromEntries(Object.entries(data).map(([k, v]) => [`data-${k}`, v]))} />
      {changed ? <span className="pointer-events-none absolute bottom-0 end-0 h-2.5 w-2.5 rounded-tl" style={{ background: was }} aria-hidden="true" /> : null}
    </label>
  );
}

const SHOWN = 40;

export function LibraryPanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const p = rec(node.props);
  const item = libItemOf(p.item);
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const own = rec(p.words);
  // Its words and colours: a small file of its own, fetched when its panel opens.
  const [details, setDetails] = useState<LibDetails | null>(null);
  useEffect(() => {
    let live = true;
    setDetails(null);
    if (item) void libDetails(item.id).then((d) => live && setDetails(d ?? { words: [], families: [], hexes: [] }));
    return () => { live = false; };
  }, [item?.id]);
  const words = useMemo(() => (details?.words ?? []).filter((w) => w.length <= 400), [details]);
  if (!item) return <p className="text-[11px] text-amber-200/80">{say("هالقطعة مش موجودة بالمكتبة.|This piece isn't in the library.|הפריט הזה לא נמצא בספרייה.")}</p>;

  const setProps = (patch: Record<string, unknown>, label = say("تعديل قطعة المكتبة|Edit the library piece|עריכת פריט הספרייה")) =>
    onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const setWord = (from: string, text: string) => {
    const next = { ...own };
    const v = withLang(own[from], lang, text === from ? "" : text);
    if (v) next[from] = v;
    else delete next[from];
    setProps({ words: Object.keys(next).length ? next : undefined }, say("كلام قطعة المكتبة|The library piece's words|המילים של פריט הספרייה"));
  };
  const find = q.trim().toLowerCase();
  const found = find ? words.filter((w) => w.toLowerCase().includes(find) || inLang(own[w], lang).toLowerCase().includes(find)) : words;
  // What the owner already changed comes first.
  const ordered = [...found.filter((w) => inLang(own[w], lang)), ...found.filter((w) => !inLang(own[w], lang))];
  const shown = all || find ? ordered : ordered.slice(0, SHOWN);

  const families = rec(p.families);
  const colours = rec(p.colours);
  const setFamily = (family: string, to: string | null) => {
    const next = { ...families };
    if (to) next[family] = to;
    else delete next[family];
    setProps({ families: Object.keys(next).length ? next : undefined }, say("ألوان قطعة المكتبة|The library piece's colours|הצבעים של פריט הספרייה"));
  };
  const setColour = (hex: string, to: string | null) => {
    const next = { ...colours };
    if (to && to.toLowerCase() !== `#${hex}`) next[hex] = to.toLowerCase();
    else delete next[hex];
    setProps({ colours: Object.keys(next).length ? next : undefined }, say("ألوان قطعة المكتبة|The library piece's colours|הצבעים של פריט הספרייה"));
  };
  const changed = Object.keys(own).length + Object.keys(families).length + Object.keys(colours).length + (p.brand ? 1 : 0);

  return (
    <div className="space-y-3" data-testid="studio-lib-panel" data-item={item.id}>
      <div className={box}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-white/85">{libName(item)}</div>
            <div className="text-[10px] text-white/45">{say(LIB_KIND_NAME[item.kind] ?? item.kind)}</div>
            <div className="text-[10px] text-white/40">{say("من المكتبة: كل كلمة ولون فيها إلك تغيّرها|From the library: every word and colour in it is yours to change|מהספרייה: כל מילה וצבע בה שלך לשנות")}</div>
          </div>
          {changed ? (
            <button type="button" className={small} disabled={busy} onClick={() => setProps({ words: undefined, colours: undefined, families: undefined, brand: undefined }, say("رجّع القطعة متل ما كانت|Put the piece back as it was|החזרת הפריט כפי שהיה"))} data-testid="studio-lib-reset">
              {say("رجّعها متل ما كانت|As it was|כפי שהיה")}
            </button>
          ) : null}
        </div>
        {item.brand ? (
          <Field
            label={say(`اسم متجرك مكان «${item.brand}»|Your store's name in place of “${item.brand}”|שם החנות שלך במקום “${item.brand}”`)}
            value={inLang(p.brand, lang)}
            maxLength={80}
            onSave={(v) => setProps({ brand: withLang(p.brand, lang, v.trim()) })}
            testId="studio-lib-brand"
          />
        ) : null}
      </div>

      <section className={box} aria-label={say("الكلام|The words|המילים")} data-testid="studio-lib-words">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[11px] font-medium text-white/70">{say("الكلام|The words|המילים")} <span className="text-white/35">({words.length})</span></h4>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={say("دوّر على كلمة…|Find a word…|חיפוש מילה…")}
          aria-label={say("دوّر على كلمة|Find a word|חיפוש מילה")}
          className="w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white"
          data-testid="studio-lib-search"
        />
        <p className="text-[10px] leading-4 text-white/35">{say("فوق كل خانة الكلام الأصلي؛ اكتب مكانه كلامك باللغة اللي عم تعدّلها. فاضية = بيضل الأصلي.|Above each box is the original; write yours in the language you're editing. Empty keeps the original.|מעל כל תיבה המקור; כתבו את שלכם בשפה שאתם עורכים. ריק = נשאר המקור.")}</p>
        <div className="space-y-2">
          {shown.map((w) => (
            <div key={w} data-testid="studio-lib-word" data-word={w}>
              <Field label={w.length > 90 ? `${w.slice(0, 90)}…` : w} value={inLang(own[w], lang)} multiline={w.length > 60} maxLength={600} onSave={(v) => setWord(w, v)} />
            </div>
          ))}
          {!shown.length ? <p className="text-[11px] text-white/45">{say("ما في كلمة هيك.|No such word.|אין מילה כזו.")}</p> : null}
        </div>
        {!all && !find && ordered.length > SHOWN ? (
          <button type="button" className={small} onClick={() => setAll(true)} data-testid="studio-lib-more">
            {say(`ورجيني الكل (${ordered.length})|Show all (${ordered.length})|הצג הכול (${ordered.length})`)}
          </button>
        ) : null}
      </section>

      {!details ? <p className="text-[11px] text-white/45" data-testid="studio-lib-loading">{say("عم تتحمّل كلماتها وألوانها…|Loading its words and colours…|טוען מילים וצבעים…")}</p> : null}

      {details?.families.length ? (
        <section className={box} aria-label={say("عائلات الألوان|Colour families|משפחות צבעים")} data-testid="studio-lib-families">
          <h4 className="text-[11px] font-medium text-white/70">{say("عائلات الألوان|Colour families|משפחות צבעים")}</h4>
          <p className="text-[10px] leading-4 text-white/35">{say("كل عائلة بتتلوّن كلها (فاتحها وغامقها) من لون واحد، أو من لون ثيم متجرك.|Each family takes all its shades, light to dark, from one colour, or from your store theme's colour.|כל משפחה מקבלת את כל גווניה מצבע אחד, או מצבע ערכת החנות.")}</p>
          {details.families.map((f) => {
            const to = families[f];
            const theme = to === "theme";
            return (
              <div key={f} className="flex items-center gap-2" data-testid="studio-lib-family" data-family={f}>
                <Swatch value={typeof to === "string" && HEX6.test(to) ? to : FAMILY_500[f] ?? "#888888"} was={FAMILY_500[f] ?? "#888888"} busy={busy} label={say(FAMILY_NAME[f] ?? f)} onPick={(v) => setFamily(f, v)} testId="studio-lib-family-colour" data={{ family: f }} />
                <span className="min-w-0 flex-1 truncate text-[11px] text-white/70">{say(FAMILY_NAME[f] ?? f)}</span>
                <button type="button" className={`${small} ${theme ? "bg-accent-500/30 text-white" : ""}`} aria-pressed={theme} disabled={busy} onClick={() => setFamily(f, theme ? null : "theme")} data-testid="studio-lib-family-theme">
                  {say("من الثيم|From the theme|מהערכה")}
                </button>
                {to ? (
                  <button type="button" className={small} disabled={busy} onClick={() => setFamily(f, null)} aria-label={say("رجّع اللون|Put the colour back|החזרת הצבע")}>↺</button>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {details?.hexes.length ? (
        <section className={box} aria-label={say("ألوانها|Its colours|הצבעים שלה")} data-testid="studio-lib-colours">
          <h4 className="text-[11px] font-medium text-white/70">{say("ألوانها|Its colours|הצבעים שלה")} <span className="text-white/35">({details.hexes.length})</span></h4>
          <p className="text-[10px] leading-4 text-white/35">{say("كبسة على لون بتغيّره وين ما إجا بالقطعة.|Click a colour to change it wherever the piece uses it.|לחיצה על צבע משנה אותו בכל מקום בפריט.")}</p>
          <div className="flex flex-wrap gap-1.5">
            {details.hexes.map((h) => {
              const to = colours[h];
              return (
                <Swatch key={h} value={typeof to === "string" && HEX6.test(to) ? to : `#${h}`} was={`#${h}`} busy={busy} label={`#${h}`} onPick={(v) => setColour(h, v)} testId="studio-lib-colour" data={{ hex: h }} />
              );
            })}
          </div>
          {Object.keys(colours).length ? (
            <button type="button" className={small} disabled={busy} onClick={() => setProps({ colours: undefined })} data-testid="studio-lib-colours-reset">
              {say("رجّع ألوانها|Put its colours back|החזרת הצבעים")}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
