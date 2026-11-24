// «طبيب جوجل»: every product's search-engine score (plain rules, free), its weak points, and better
// words drafted by the AI (title, description) plus the pictures' descriptions made from the facts.
// The owner checks each draft and saves it; a revision is kept, so it can go back.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import * as M from "../../api/aiMarketing.api";
import type { SeoDraft, SeoIssue, SeoReport } from "../../api/aiMarketing.api";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "w-full rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-sm";
const LIMITS = { title: [20, 60], desc: [70, 160] } as const;

export const issueName = (i: SeoIssue) =>
  ({
    noTitle: say("ما في عنوان لجوجل|No search title|אין כותרת לחיפוש"),
    titleLong: say("عنوان جوجل طويل|Search title too long|כותרת ארוכה מדי"),
    titleShort: say("عنوان جوجل قصير|Search title too short|כותרת קצרה מדי"),
    noDescription: say("ما في وصف لجوجل|No search description|אין תיאור לחיפוש"),
    descLong: say("وصف جوجل طويل|Search description too long|תיאור ארוך מדי"),
    descShort: say("وصف جوجل قصير|Search description too short|תיאור קצר מדי"),
    thinText: say("كلام القطعة قليل|Little text on the page|מעט טקסט בעמוד"),
    noAlt: say("صور بدون وصف|Pictures without a description|תמונות בלי תיאור"),
    sameTitle: say("نفس العنوان لأكثر من قطعة|Same title as another piece|אותה כותרת כמו פריט אחר"),
  })[i];

const tone = (score: number) => (score >= 85 ? "text-emerald-300" : score >= 60 ? "text-amber-300" : "text-red-300");

function Counter({ value, range }: { value: string; range: readonly [number, number] }) {
  const n = value.trim().length;
  const ok = n >= range[0] && n <= range[1];
  return <span className={`text-[11px] tabular-nums ${ok ? "text-emerald-300" : "text-amber-300"}`} dir="ltr">{n} / {range[0]}–{range[1]}</span>;
}

function Fixer({ report, ai, onDone }: { report: SeoReport; ai: boolean; onDone: () => void }) {
  const [draft, setDraft] = useState<SeoDraft | null>(null);
  const [title, setTitle] = useState(report.seoTitle ?? "");
  const [desc, setDesc] = useState(report.seoDescription ?? "");
  const [alts, setAlts] = useState<Array<{ id: string; alt: string; on: boolean }>>([]);
  const make = useMutation({
    mutationFn: () => M.seoDraft(report.id),
    onSuccess: (d) => {
      setDraft(d);
      if (d.seoTitle) setTitle(d.seoTitle);
      if (d.seoDescription) setDesc(d.seoDescription);
      setAlts(d.alts.map((a) => ({ ...a, on: true })));
    },
    onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  const save = useMutation({
    mutationFn: () =>
      M.seoApply(report.id, {
        seoTitle: title.trim() !== (report.seoTitle ?? "") ? title.trim() || null : undefined,
        seoDescription: desc.trim() !== (report.seoDescription ?? "") ? desc.trim() || null : undefined,
        alts: alts.filter((a) => a.on && a.alt.trim()).map(({ id, alt }) => ({ id, alt: alt.trim() })),
      }),
    onSuccess: () => {
      toast.success(say("انحفظ ✓ (وبتقدر ترجع من سجل القطعة)|Saved ✓ (you can go back from the piece's history)|נשמר ✓ (אפשר לחזור מההיסטוריה של הפריט)"));
      setDraft(null);
      onDone();
    },
    onError: (e) => toast.error(say("ما انحفظ|Not saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });

  if (!draft) {
    return (
      <div className="sm:ms-auto">
        <Button size="sm" variant="primary" isLoading={make.isPending} onClick={() => make.mutate()} data-testid="seo-draft">
          {ai ? say("صلّح بالذكاء ✨|Fix with AI ✨|לתקן עם AI ✨") : say("وصف الصور|Picture descriptions|תיאורי תמונות")}
        </Button>
      </div>
    );
  }
  return (
    <div className="basis-full space-y-3 rounded-xl border border-white/10 bg-black/20 p-3" data-testid="seo-fixer">
      {ai ? (
        <>
          <label className="block text-xs text-white/60">
            <span className="flex justify-between"><span>{say("عنوان جوجل|Search title|כותרת לחיפוש")}</span><Counter value={title} range={LIMITS.title} /></span>
            <input className={`${field} mt-1`} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} data-testid="seo-title" />
          </label>
          <label className="block text-xs text-white/60">
            <span className="flex justify-between"><span>{say("وصف جوجل|Search description|תיאור לחיפוש")}</span><Counter value={desc} range={LIMITS.desc} /></span>
            <textarea className={`${field} mt-1`} rows={3} value={desc} maxLength={320} onChange={(e) => setDesc(e.target.value)} data-testid="seo-desc" />
          </label>
          {/* How it shows on Google, roughly. */}
          {/* Google's own colours, whatever the admin's skin (the skins repaint bg-white). */}
          <div className="rounded-lg p-3 text-start" dir="auto" style={{ background: "#ffffff", border: "1px solid #dadce0" }} data-testid="seo-preview">
            <div className="truncate text-[15px]" style={{ color: "#1a0dab" }}>{title || report.title}</div>
            <div className="mt-0.5 line-clamp-2 text-xs" style={{ color: "#4d5156" }}>{desc}</div>
          </div>
        </>
      ) : null}
      {alts.length ? (
        <div className="space-y-1.5">
          <p className="text-xs text-white/60">{say("وصف الصور (من اسم القطعة ولونها وجهتها)|Picture descriptions (from the piece's name, colour and side)|תיאורי תמונות (משם הפריט, הצבע והצד)")}</p>
          {alts.map((a, i) => (
            <label key={a.id} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={a.on} onChange={(e) => setAlts((l) => l.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
              <input className={`${field} py-1`} value={a.alt} maxLength={200} onChange={(e) => setAlts((l) => l.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
            </label>
          ))}
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>{say("إلغاء|Cancel|ביטול")}</Button>
        <Button size="sm" variant="primary" isLoading={save.isPending} onClick={() => save.mutate()} data-testid="seo-save">{say("احفظ|Save|שמירה")}</Button>
      </div>
    </div>
  );
}

export default function SeoDoctorPage() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["ai-marketing-status"], queryFn: M.marketingStatus });
  const scan = useQuery({ queryKey: ["seo-scan"], queryFn: M.seoScan });
  const [only, setOnly] = useState<SeoIssue | null>(null);
  const ai = status.data?.seoDoctor === true;
  const list = (scan.data?.products ?? []).filter((p) => !only || p.issues.includes(only));
  return (
    <div className="space-y-4 pb-24" data-testid="seo-doctor-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("طبيب جوجل (SEO) 🩺|Search doctor (SEO) 🩺|רופא החיפוש (SEO) 🩺")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "بيفحص كل قطعة: عنوان ووصف جوجل، كلام الصفحة، وصف الصور، والعناوين المكرّرة. الفحص مجاني وبدون ذكاء اصطناعي؛ «صلّح بالذكاء» بيكتب مسودة بتراجعها قبل الحفظ.|Checks every piece: the search title and description, the page's text, picture descriptions and repeated titles. The check is free, with no AI; «Fix with AI» drafts better words you check before saving.|בודק כל פריט: כותרת ותיאור לחיפוש, טקסט העמוד, תיאורי תמונות וכותרות כפולות. הבדיקה חינמית וללא AI; «לתקן עם AI» כותב טיוטה שבודקים לפני השמירה.",
          )}
        </p>
        {status.isSuccess && !ai ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-6 text-amber-100" data-testid="seo-ai-off">
            {say("الكتابة بالذكاء مطفية — وصف الصور شغّال بدونها. شغّلها من|Writing with AI is off — picture descriptions work without it. Switch it on from|הכתיבה עם AI כבויה — תיאורי התמונות עובדים גם בלעדיה. אפשר להפעיל מ")}{" "}
            <Link to="/admin/ai" className="underline underline-offset-2">{say("صفحة الذكاء الاصطناعي|the AI page|עמוד הבינה המלאכותית")}</Link>
          </p>
        ) : null}
      </section>

      {scan.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}><Spinner /> {say("عم نفحص…|Checking…|בודק…")}</div>
      ) : scan.isError || !scan.data ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(scan.error)}</div>
      ) : (
        <>
          <section className={`${box} flex flex-wrap items-center gap-5`}>
            <div className="text-center" data-testid="seo-average">
              <div className={`text-4xl font-bold tabular-nums ${tone(scan.data.average)}`}>{scan.data.average}</div>
              <div className="text-[11px] text-white/50">{say("من 100|out of 100|מתוך 100")}</div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{say(`${scan.data.total} قطعة، ${scan.data.products.length} منها بدها تصليح|${scan.data.total} pieces, ${scan.data.products.length} need work|${scan.data.total} פריטים, ${scan.data.products.length} צריכים תיקון`)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.entries(scan.data.counts) as Array<[SeoIssue, number]>).sort((a, b) => b[1] - a[1]).map(([i, n]) => (
                  <button key={i} type="button" aria-pressed={only === i} onClick={() => setOnly(only === i ? null : i)} className={`rounded-full border px-2.5 py-1 text-xs ${only === i ? "border-accent-400/70 bg-accent-500/20" : "border-white/10 hover:border-white/25"}`}>
                    {issueName(i)} · {n}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={box}>
            {!list.length ? (
              <p className="text-sm text-emerald-200" data-testid="seo-all-good">{say("كل القطع تمام ✓|Every piece is fine ✓|כל הפריטים תקינים ✓")}</p>
            ) : (
              <ul className="divide-y divide-white/6">
                {list.slice(0, 120).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start gap-3 py-3" data-testid="seo-row">
                    <span className={`w-10 shrink-0 text-center text-lg font-semibold tabular-nums ${tone(p.score)}`}>{p.score}</span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/catalog/products/${p.id}`} className="text-sm font-medium hover:underline">{p.title}</Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.issues.map((i) => (
                          <span key={i} className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-white/70">
                            {issueName(i)}{i === "noAlt" ? ` (${p.missingAlts})` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Fixer report={p} ai={ai} onDone={() => void qc.invalidateQueries({ queryKey: ["seo-scan"] })} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
