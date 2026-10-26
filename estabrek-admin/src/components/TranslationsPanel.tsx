// «الترجمة»: the same texts in the shop's other languages, next to the original. A box
// left empty shows the original in the shop. With «ترجمة المتجر» on (الذكاء الاصطناعي),
// a button drafts the empty boxes; drafts are marked until the owner checks or edits them,
// and nothing is saved until the page's own save.
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogAiStatus, translateTexts } from "../api/ai.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import { cn } from "./ui/cn";
import { Button } from "./ui/Button";
import { LANG_LABEL, type Lang } from "../lib/storeIdentity";
import { countDone, readPath, rowId, writePath, type TranslationRow, type Translations } from "../lib/translations";
import { tr } from "@/lib/words";

const field = "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

export function TranslationsPanel({
  langs,
  main,
  rows,
  value,
  onChange,
  context,
  disabled,
}: {
  /** The languages to translate into (the shop's others). */
  langs: Lang[];
  main: Lang;
  rows: TranslationRow[];
  value: Translations;
  onChange: (next: Translations) => void;
  /** What these texts are, for the AI («منتج: فستان الورد»). */
  context: string;
  disabled?: boolean;
}) {
  const [lang, setLang] = useState<Lang>(langs[0]);
  const current = langs.includes(lang) ? lang : langs[0];
  const [drafted, setDrafted] = useState<Record<string, Set<string>>>({});
  const ai = useQuery({ queryKey: ["ai-catalog-status"], queryFn: catalogAiStatus, staleTime: 60_000, retry: false });
  const [busy, setBusy] = useState(false);
  const shown = useMemo(() => rows.filter((r) => r.base.trim()), [rows]);
  if (!langs.length || !shown.length) return null;

  const marks = drafted[current] ?? new Set<string>();
  const set = (r: TranslationRow, v: string) => {
    onChange(writePath(value, current, r.path, v));
    if (marks.has(rowId(r))) setDrafted((d) => ({ ...d, [current]: new Set([...marks].filter((x) => x !== rowId(r))) }));
  };
  const empty = shown.filter((r) => !readPath(value, current, r.path).trim());

  const draft = async () => {
    if (!empty.length) return;
    setBusy(true);
    try {
      // Short keys for the AI, mapped back to the boxes.
      const texts = Object.fromEntries(empty.map((r, i) => [`t${i}`, r.base]));
      const out = await translateTexts({ to: current, from: main, context, texts });
      let next = value;
      const filled = new Set(marks);
      empty.forEach((r, i) => {
        const t = out.texts[`t${i}`];
        if (t) {
          next = writePath(next, current, r.path, t);
          filled.add(rowId(r));
        }
      });
      onChange(next);
      setDrafted((d) => ({ ...d, [current]: filled }));
      const n = filled.size - marks.size;
      if (n < empty.length) toast.info(tr(`انكتبت ${n} من ${empty.length}`, "{0} of {1} written", [n, empty.length]), { description: tr("الباقي ضل فاضي (فيه كلمة متل {store} لازم تضل متل ما هي) — ممكن كتابته باليد.", "The rest stayed empty (a word like {store} has to stay as it is) — you can write those by hand.") });
    } catch (e) {
      toast.error(tr("ما زبطت المسودة", "The draft didn't work"), { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  let lastGroup: string | undefined;
  return (
    <div data-testid="translations-panel" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{tr("الترجمة", "Translation")}</div>
          <div className="mt-0.5 text-xs text-white/50">{tr("الخانة الفاضية بتبين بالمتجر بالنص الأصلي (", "An empty box shows the original text in the shop (")}{LANG_LABEL[main]}).</div>
        </div>
        {langs.length > 1 ? (
          <div className="flex gap-1" role="tablist" aria-label={tr("لغة الترجمة", "Translation language")}>
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={l === current}
                onClick={() => setLang(l)}
                className={cn("min-h-10 rounded-xl px-3 text-xs", l === current ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/5")}
              >
                {LANG_LABEL[l]} <span className="text-white/40">{countDone(value, l, shown)}/{shown.length}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-white/60">
            {LANG_LABEL[current]} · {countDone(value, current, shown)}/{shown.length}
          </span>
        )}
      </div>

      {ai.data?.translate && !disabled ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" isLoading={busy} disabled={!empty.length} onClick={() => void draft()}>
            {tr("✨ مسودة", "✨ Draft")} {LANG_LABEL[current]} {tr("للخانات الفاضية", "for the empty boxes")}
          </Button>
          {!empty.length ? <span className="text-xs text-white/45">{tr("كل الخانات معبّاة.", "Every box is filled.")}</span> : null}
        </div>
      ) : null}

      <div className="mt-3 space-y-3" dir={current === "en" ? "ltr" : "rtl"} lang={current}>
        {shown.map((r) => {
          const id = rowId(r);
          const v = readPath(value, current, r.path);
          const header = r.group && r.group !== lastGroup ? r.group : null;
          lastGroup = r.group;
          const isDraft = marks.has(id);
          return (
            <React.Fragment key={id}>
              {header ? <div className="pt-1 text-xs font-medium text-white/70">{header}</div> : null}
              <label className="block">
                <span className="mb-1 flex flex-wrap items-baseline gap-2 text-xs text-white/55">
                  {r.label}
                  {isDraft ? <span className="rounded-md bg-amber-300/15 px-1.5 text-[11px] text-amber-200">{tr("مسودة — بدها مراجعة", "Draft — needs a check")}</span> : null}
                </span>
                {r.multiline ? (
                  <textarea
                    className={cn(field, "h-28 resize-y py-2.5 leading-6", isDraft && "border-amber-300/40")}
                    maxLength={r.max}
                    value={v}
                    placeholder={r.base}
                    disabled={disabled}
                    aria-label={`${r.label} — ${LANG_LABEL[current]}`}
                    onChange={(e) => set(r, e.target.value)}
                  />
                ) : (
                  <input
                    className={cn(field, "h-10", isDraft && "border-amber-300/40")}
                    maxLength={r.max}
                    value={v}
                    placeholder={r.base}
                    disabled={disabled}
                    aria-label={`${r.label} — ${LANG_LABEL[current]}`}
                    onChange={(e) => set(r, e.target.value)}
                  />
                )}
              </label>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
