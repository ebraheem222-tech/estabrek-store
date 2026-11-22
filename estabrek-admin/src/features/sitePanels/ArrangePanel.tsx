// A whole site's panel page as its owner arranges it (sites wave 1.4; backend lib/sitePanel.ts saveLayout): its parts
// moved up or down, hidden or shown again, and parts of their own (a number, a table, a chart over the site's
// tables). The site's file is never changed: an upgrade keeps this arrangement, and its new parts show after it.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import * as Panels from "../../api/sitePanels.api";
import type { OwnPart, PanelArrange, PanelAsk, PanelPageView } from "../../api/sitePanels.api";
import { KIND_NAME, inLang } from "./panelText";

const box = "rounded-2xl border border-accent-400/30 bg-accent-500/[0.06] p-5";
const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const btn = "grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-sm hover:bg-white/[0.12] disabled:opacity-30";
type Item = PanelArrange["parts"][number];
type Kind = "numbers" | "view" | "chart";
type Lang = "ar" | "en" | "he";
/** Words the owner wrote, the same in the three languages (they write in theirs). */
const all3 = (text: string) => ({ ar: text, en: text, he: text });
/** A new part's key: "my" and a few small letters or digits, as the server asks. */
const newKey = () => `my${Math.random().toString(36).slice(2, 9).replace(/[^a-z0-9]/g, "") || "x1"}`;

export function ArrangePanel({ view, ask, onSaved, onError }: { view: PanelPageView; ask: PanelAsk; onSaved: (v: PanelPageView) => void; onError: (e: unknown) => void }) {
  const lang = adminLang();
  const arrange = view.arrange!;
  const [items, setItems] = useState<Item[]>(arrange.parts);
  const [adding, setAdding] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: () => Panels.saveLayout(view.featureId, view.page.key, { order: items.map((x) => x.key), hidden: items.filter((x) => x.hidden).map((x) => x.key), own: items.filter((x) => x.own && x.part).map((x) => x.part!) }, lang, ask),
    onSuccess: onSaved,
    onError: (e) => {
      const list = (e as { response?: { data?: { details?: { problems?: Array<{ message: string }> } } } })?.response?.data?.details?.problems ?? [];
      setProblems(list.map((p) => p.message));
      onError(e);
    },
  });
  const move = (k: number, by: -1 | 1) => setItems((list) => {
    const next = [...list];
    const [one] = next.splice(k, 1);
    next.splice(k + by, 0, one);
    return next;
  });
  const set = (key: string, change: Partial<Item>) => setItems((list) => list.map((x) => (x.key === key ? { ...x, ...change } : x)));
  const nameOf = (x: Item) => inLang(x.label, lang) || say(KIND_NAME[x.kind] ?? x.kind);

  return (
    <section className={box} data-testid="site-arrange">
      <h2 className="font-medium">{say("رتّب الصفحة|Arrange the page|לסדר את העמוד")}</h2>
      <p className="mt-1 text-sm text-white/65">{say("رتّب القطع، خبّي اللي ما بدّك ياه، وزيد قطعة من عندك. الترتيب بيضل لما يتحدّث الموقع، والقطع الجديدة بتطلع بالآخر.|Order the parts, hide what you don't want, and add a part of your own. The order stays when the site is upgraded; new parts show at the end.|סדרו את החלקים, הסתירו את מה שלא צריך, והוסיפו חלק משלכם. הסדר נשמר כשהאתר מתעדכן; חלקים חדשים מופיעים בסוף.")}</p>
      <ul className="mt-3 space-y-2">
        {items.map((x, k) => (
          <li key={x.key} className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 ${x.hidden ? "border-white/5 opacity-60" : "border-white/10 bg-white/[0.03]"}`} data-testid={`site-arrange-${x.key}`} data-hidden={x.hidden}>
            <div className="flex gap-1">
              <button type="button" className={btn} disabled={k === 0} onClick={() => move(k, -1)} aria-label={say("لفوق|Up|למעלה")} data-testid={`site-arrange-${x.key}-up`}>↑</button>
              <button type="button" className={btn} disabled={k === items.length - 1} onClick={() => move(k, 1)} aria-label={say("لتحت|Down|למטה")} data-testid={`site-arrange-${x.key}-down`}>↓</button>
            </div>
            <span className="min-w-0 flex-1 text-sm">
              {nameOf(x)} <span className="text-xs text-white/45">· {say(KIND_NAME[x.kind] ?? x.kind)}</span>
              {x.own ? <span className="ms-2 rounded bg-sky-400/10 px-1.5 py-0.5 text-[11px] text-sky-200">{say("من عندك|Your own|שלכם")}</span> : null}
            </span>
            <button type="button" className="h-8 rounded-lg bg-white/[0.06] px-2 text-xs hover:bg-white/[0.12]" onClick={() => set(x.key, { hidden: !x.hidden })} data-testid={`site-arrange-${x.key}-toggle`}>
              {x.hidden ? say("رجّعها|Show it|להציג") : say("خبّيها|Hide it|להסתיר")}
            </button>
            {x.own ? (
              <button type="button" className="h-8 rounded-lg px-2 text-xs text-red-200 underline" onClick={() => setItems((list) => list.filter((y) => y.key !== x.key))} data-testid={`site-arrange-${x.key}-remove`}>
                {say("احذفها|Delete it|למחוק")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {adding ? (
        <OwnPartForm tables={arrange.tables} lang={lang} onAdd={(part, label) => { setItems((list) => [...list, { key: part.key, kind: part.kind, label: all3(label), hidden: false, own: true, part }]); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : arrange.tables.length ? (
        <button type="button" className="mt-3 text-sm text-accent-200 underline" onClick={() => setAdding(true)} data-testid="site-arrange-add">{say("+ زيد قطعة من عندك|+ Add a part of your own|+ להוסיף חלק משלכם")}</button>
      ) : null}
      {problems.length ? <ul className="mt-3 list-disc ps-5 text-xs text-red-300" data-testid="site-arrange-problems">{problems.map((p, k) => <li key={k}>{p}</li>)}</ul> : null}
      <div className="mt-4 flex gap-2">
        <Button size="sm" isLoading={save.isPending} onClick={() => { setProblems([]); save.mutate(); }} data-testid="site-arrange-save">{say("احفظ الترتيب|Save the arrangement|לשמור את הסידור")}</Button>
      </div>
    </section>
  );
}

/** A part of the owner's own: a number (how many rows, maybe of one choice, maybe lately), a table of some columns, or a chart a day. */
function OwnPartForm({ tables, lang, onAdd, onCancel }: { tables: PanelArrange["tables"]; lang: Lang; onAdd: (part: OwnPart, label: string) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<Kind>("numbers");
  const [tableKey, setTableKey] = useState(tables[0]?.key ?? "");
  const [label, setLabel] = useState("");
  const [choice, setChoice] = useState("");
  const [option, setOption] = useState("");
  const [span, setSpan] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [days, setDays] = useState(30);
  const table = tables.find((t) => t.key === tableKey);
  const choices = (table?.fields ?? []).filter((f) => f.type === "select");
  const shown = (table?.fields ?? []).filter((f) => !["json", "location", "model3d", "video", "file", "richText"].includes(f.type));
  const picked = choices.find((f) => f.id === choice);
  const ok = !!table && label.trim().length > 0 && (kind !== "view" || columns.length > 0) && (!choice || kind === "chart" || !!option);

  const add = () => {
    if (!table) return;
    const key = newKey();
    const title = all3(label.trim());
    const where = choice && option ? [{ field: choice, op: "is", value: option }] : undefined;
    if (kind === "numbers") onAdd({ kind, key, items: [{ key: `${key}n`, label: title, table: table.ref, ...(where ? { where } : {}), ...(span ? { window: span, compare: true } : {}) }] }, label.trim());
    else if (kind === "view") onAdd({ kind, key, title, table: table.ref, ...(where ? { where } : {}), columns: columns.slice(0, 8), sort: { field: "$createdAt", dir: "desc" }, limit: 20 }, label.trim());
    else onAdd({ kind, key, title, table: table.ref, days, ...(choice ? { split: choice } : {}) }, label.trim());
  };
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-surface-925/60 p-3" data-testid="site-own">
      <div className="flex flex-wrap gap-2">
        {(["numbers", "view", "chart"] as Kind[]).map((k) => (
          <button key={k} type="button" className={`rounded-lg px-3 py-1.5 text-sm ${kind === k ? "bg-accent-500/25 text-white" : "bg-white/[0.06] text-white/70"}`} onClick={() => setKind(k)} data-testid={`site-own-kind-${k}`}>{say(KIND_NAME[k])}</button>
        ))}
      </div>
      <label className="block text-xs text-white/60">
        {say("من أي جدول|From which table|מאיזו טבלה")}
        <select className={`${field} mt-1 w-full`} value={tableKey} onChange={(e) => { setTableKey(e.target.value); setChoice(""); setOption(""); setColumns([]); }} data-testid="site-own-table">
          {tables.map((t) => <option key={t.key} value={t.key}>{inLang(t.name, lang) || t.slug}</option>)}
        </select>
      </label>
      <label className="block text-xs text-white/60">
        {say("اسمها|Its name|השם שלו")}
        <input className={`${field} mt-1 w-full`} value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} data-testid="site-own-label" />
      </label>
      {choices.length ? (
        <div className="flex flex-wrap gap-2">
          <label className="text-xs text-white/60">
            {kind === "chart" ? say("قسّم الأعمدة حسب|Split the bars by|לחלק את העמודות לפי") : say("بس السطور اللي فيها|Only the rows where|רק השורות שבהן")}
            <select className={`${field} mt-1 block`} value={choice} onChange={(e) => { setChoice(e.target.value); setOption(""); }} data-testid="site-own-choice">
              <option value="">{say("كلها|All of them|כולן")}</option>
              {choices.map((f) => <option key={f.id} value={f.id}>{inLang(f.name, lang) || f.id}</option>)}
            </select>
          </label>
          {picked && kind !== "chart" ? (
            <label className="text-xs text-white/60">
              {say("هي|is|הוא")}
              <select className={`${field} mt-1 block`} value={option} onChange={(e) => setOption(e.target.value)} data-testid="site-own-option">
                <option value="" />
                {(picked.options ?? []).map((o) => <option key={o.id} value={o.id}>{inLang(o.name, lang) || o.id}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      {kind === "numbers" ? (
        <label className="block text-xs text-white/60">
          {say("بأي فترة|Over which time|באיזו תקופה")}
          <select className={`${field} mt-1 block`} value={span} onChange={(e) => setSpan(e.target.value)} data-testid="site-own-window">
            <option value="">{say("كل الوقت|All the time|כל הזמן")}</option>
            <option value="today">{say("اليوم|Today|היום")}</option>
            <option value="week">{say("هالأسبوع (مع اللي قبل)|This week (with the one before)|השבוע (עם הקודם)")}</option>
            <option value="month">{say("هالشهر (مع اللي قبل)|This month (with the one before)|החודש (עם הקודם)")}</option>
          </select>
        </label>
      ) : null}
      {kind === "view" ? (
        <fieldset className="text-xs text-white/60">
          <legend>{say("الأعمدة (لحد 8)|The columns (up to 8)|העמודות (עד 8)")}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {[...shown.map((f) => ({ id: f.id, name: inLang(f.name, lang) || f.id })), { id: "$createdAt", name: say("وصل|Came in|התקבל") }].map((c) => (
              <label key={c.id} className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1 text-sm text-white/80">
                <input type="checkbox" checked={columns.includes(c.id)} disabled={!columns.includes(c.id) && columns.length >= 8} onChange={(e) => setColumns((list) => (e.target.checked ? [...list, c.id] : list.filter((x) => x !== c.id)))} data-testid={`site-own-column-${c.id}`} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {kind === "chart" ? (
        <label className="block text-xs text-white/60">
          {say("كم يوم|How many days|כמה ימים")}
          <select className={`${field} mt-1 block`} value={days} onChange={(e) => setDays(Number(e.target.value))} data-testid="site-own-days">
            {[7, 30, 90].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={!ok} onClick={add} data-testid="site-own-add">{say("زيدها|Add it|להוסיף")}</Button>
        <button type="button" className="text-xs text-white/60 underline" onClick={onCancel}>{say("بلاها|Never mind|לא משנה")}</button>
      </div>
    </div>
  );
}
