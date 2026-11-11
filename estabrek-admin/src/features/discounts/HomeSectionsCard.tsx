// أقسام الرئيسية بالأرقام: what each home section does for the visits that see it (seen, taps, bag adds after
// a tap in it), the order the numbers suggest, and trying that order on part of the visits (an A/B test of kind
// "homeOrder"; keeping B writes the order into the home page).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import * as AbAPI from "../../api/experiments.api";
import type { HomeSectionRow } from "../../api/experiments.api";
import { tr } from "@/lib/words";

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export function HomeSectionsCard({ canWrite, busy, onTry }: { canWrite: boolean; busy: boolean; onTry: (order: string[]) => void }) {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["experiments", "home-sections", days], queryFn: () => AbAPI.getHomeSections(days), refetchInterval: 120_000 });
  const d = q.data;
  const byKey = new Map((d?.sections ?? []).map((s) => [s.key, s]));
  const name = (key: string) => byKey.get(key)?.label ?? key;
  const best = Math.max(0.0001, ...(d?.sections ?? []).map((s) => s.score));
  const rows = [...(d?.sections ?? [])].sort((a, b) => Number(b.onPage) - Number(a.onPage) || (d!.current.indexOf(a.key) - d!.current.indexOf(b.key)) || b.seen - a.seen);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2" data-testid="home-sections">
        <div>
          <h2 className="font-semibold">{tr("أقسام الرئيسية بالأرقام", "The home page's sections in numbers")}</h2>
          <p className="mt-1 text-xs leading-5 text-white/55">
            {tr(
              "كل قسم: كم زيارة شافته، كم مرة انكبس إشي فيه، وكم قطعة انضافت للسلة بعد ما انكبس فيه. الترتيب المقترح بيحط الأقسام الأقوى أعلى (الافتتاحية بتضل أول)، وبتقدري تجرّبيه على نص الزوار قبل ما تعتمديه.",
              "For each section: how many visits saw it, how many tapped something in it, and how many bag adds followed a tap in it. The suggested order puts the strongest sections higher (the opening stays first); try it on half the visits before keeping it.",
            )}
          </p>
        </div>
        <select className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label={tr("الفترة", "Period")}>
          {[7, 30, 90].map((n) => <option key={n} value={n}>{tr(`آخر ${n} يوم`, "Last {0} days", [n])}</option>)}
        </select>
      </div>

      {!d ? (
        <div className="mt-3">{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</div>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-xs text-white/50">
                  <th className="py-2 text-start font-medium">{tr("القسم", "Section")}</th>
                  <th className="py-2 text-end font-medium">{tr("شافوه", "Seen")}</th>
                  <th className="py-2 text-end font-medium">{tr("كبسوا فيه", "Tapped")}</th>
                  <th className="py-2 text-end font-medium">{tr("للسلة بعده", "Bag adds after")}</th>
                  <th className="w-40 py-2 text-start font-medium ps-4">{tr("قوته", "Strength")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s: HomeSectionRow) => (
                  <tr key={s.key} className="border-t border-white/[0.06]" data-testid={`home-section-${s.key}`}>
                    <td className="py-2">
                      {s.label}
                      {!s.onPage ? <span className="ms-2 text-xs text-white/40">{tr("(مشهد ثابت)", "(fixed scene)")}</span> : null}
                    </td>
                    <td className="py-2 text-end tabular-nums">{s.seen}</td>
                    <td className="py-2 text-end tabular-nums">{s.taps} <span className="text-xs text-white/45">{pct(s.tapRate)}</span></td>
                    <td className="py-2 text-end tabular-nums">{s.bags} <span className="text-xs text-white/45">{pct(s.bagRate)}</span></td>
                    <td className="py-2 ps-4">
                      {s.enough ? (
                        <div className="h-2 rounded-full bg-white/[0.06]" aria-label={tr(`القوة ${Math.round((s.score / best) * 100)}%`, "Strength {0}%", [Math.round((s.score / best) * 100)])}>
                          <div className="h-2 rounded-full bg-accent-500" style={{ width: `${Math.max(4, (s.score / best) * 100)}%` }} />
                        </div>
                      ) : (
                        <span className="text-xs text-white/40">{tr(`لسا قليل (أقل من ${d.minSeen} زيارة)`, "Too few yet (under {0} visits)", [d.minSeen])}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.08] p-3" data-testid="home-suggested">
            {d.suggested ? (
              <>
                <div className="text-sm font-semibold">{tr("الترتيب اللي بتقترحه الأرقام", "The order the numbers suggest")}</div>
                <ol className="mt-2 grid gap-1 text-sm">
                  {d.suggested.map((key, i) => {
                    const was = d.current.indexOf(key);
                    return (
                      <li key={key} className="flex items-center gap-2">
                        <span className="w-5 text-white/40 tabular-nums">{i + 1}</span>
                        <span>{name(key)}</span>
                        {was !== i ? <span className="text-xs text-white/45">{was > i ? tr(`↑ كان ${was + 1}`, "↑ was {0}", [was + 1]) : tr(`↓ كان ${was + 1}`, "↓ was {0}", [was + 1])}</span> : null}
                      </li>
                    );
                  })}
                </ol>
                {canWrite ? (
                  <Button className="mt-3" size="sm" variant="primary" isLoading={busy} onClick={() => onTry(d.suggested!)}>
                    {tr("جرّبي هالترتيب على نص الزوار", "Try this order on half the visits")}
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-white/60">
                {tr("ما في ترتيب أحسن تقترحه الأرقام لسا: إما الترتيب الحالي هو الأقوى، أو لسا الزيارات قليلة.", "No better order to suggest yet: either this order is already the strongest, or there are too few visits so far.")}
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
