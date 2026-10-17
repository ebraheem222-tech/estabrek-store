// تجربة الزباين: how fast the shop is on shoppers' own phones and computers, per
// kind of page, device and system. The shop sends one small report per page
// (no address, no cookies); the numbers are what 75% of visits did better than.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import * as SpeedAPI from "../../api/speed.api";
import type { RumDevice, RumItem, RumMetric, RumOs, RumQuery, RumReport } from "../../api/speed.api";
import { Segmented } from "./cacheParts";
import {
  RUM_DAYS,
  RUM_DEVICE_TEXT,
  RUM_FEW,
  RUM_MAIN,
  RUM_METRIC_TEXT,
  RUM_MORE,
  RUM_OS_TEXT,
  RUM_PAGE_TEXT,
  RUM_RATING_TEXT,
  rumAdvice,
  rumCountText,
  rumLimitsText,
  rumValueText,
  sparkPath,
} from "./rumText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm";

export function ShopperSpeedPanel() {
  const [query, setQuery] = useState<RumQuery>({ days: 7, split: "os" });
  const q = useQuery({ queryKey: ["system", "speed", "rum", query], queryFn: () => SpeedAPI.getRum(query), refetchInterval: 60_000, placeholderData: (p) => p });
  const r = q.data;

  return (
    <div className="space-y-4" data-testid="speed-rum">
      <section className={box}>
        <h2 className="font-semibold">تجربة الزباين</h2>
        <p className="mt-1 text-sm text-white/60">
          قديش المتجر سريع على أجهزة الزباين نفسهم. كل صفحة بتبعت تقرير صغير لما الزبون يتركها: نوع الصفحة والجهاز والنظام والأرقام بس، بلا عنوان ولا كوكيز.
          الرقم هو اللي 75% من الزيارات كانت أحسن منه (متل Google).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs text-white/60">المدة</span>
            <Segmented value={String(query.days)} disabled={false} onChange={(v) => setQuery({ ...query, days: Number(v) })} options={RUM_DAYS} />
          </label>
          <label className="block">
            <span className="text-xs text-white/60">الجهاز</span>
            <select
              className={`${field} mt-1.5 w-full`}
              value={query.device ?? ""}
              onChange={(e) => setQuery({ ...query, device: (e.target.value || undefined) as RumDevice | undefined })}
              data-testid="rum-device"
            >
              <option value="">كل الأجهزة</option>
              {(Object.keys(RUM_DEVICE_TEXT) as RumDevice[]).map((k) => (
                <option key={k} value={k}>
                  {RUM_DEVICE_TEXT[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/60">النظام</span>
            <select
              className={`${field} mt-1.5 w-full`}
              value={query.os ?? ""}
              onChange={(e) => setQuery({ ...query, os: (e.target.value || undefined) as RumOs | undefined })}
              data-testid="rum-os"
            >
              <option value="">كل الأنظمة</option>
              {(Object.keys(RUM_OS_TEXT).filter((k) => k !== "all") as RumOs[]).map((k) => (
                <option key={k} value={k}>
                  {RUM_OS_TEXT[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" checked={query.split === "os"} onChange={(e) => setQuery({ ...query, split: e.target.checked ? "os" : "device" })} />
          سطر لكل نظام (Android، iPhone…)
        </label>
      </section>

      {!r ? (
        <div className={box}>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</div>
      ) : (
        <Report report={r} />
      )}
    </div>
  );
}

function Report({ report: r }: { report: RumReport }) {
  const empty = !Object.keys(r.overall).length;
  const advice = rumAdvice(r);
  return (
    <>
      <section className={box}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{`كل الزيارات، ${RUM_DAYS.find((d) => d.value === String(r.days))?.label ?? `${r.days} يوم`}`}</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge size="sm">{`${r.collected.reports.toLocaleString("en")} تقرير من آخر تشغيل`}</Badge>
            {r.collected.bots ? <Badge size="sm">{`${r.collected.bots.toLocaleString("en")} من بوتات (ما انحسبوا)`}</Badge> : null}
          </div>
        </div>
        {empty ? (
          <p className="mt-3 text-sm text-white/60" data-testid="rum-empty">
            لسا ما وصل تقارير بهالمدة. بيبلّشوا يوصلوا لما الزباين يفتحوا المتجر (بعد نشر النسخة الجديدة من المتجر). نسبة الزيارات اللي بتقيس من{" "}
            <Link to="/admin/system/cache#motion" className="underline">
              السرعة والكاش ← الحركة والتحميل
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {RUM_MAIN.map((k) => (
                <Card key={k} metric={k} report={r} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
              {RUM_MORE.map((k) => (
                <span key={k}>
                  {`${RUM_METRIC_TEXT[k].label}: `}
                  <span className={`tabular-nums ${r.overall[k]?.rating ? RUM_RATING_TEXT[r.overall[k]!.rating!].cell : ""}`}>{rumValueText(k, r.overall[k]?.value)}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {advice.length ? (
        <section className={box} data-testid="rum-advice">
          <h3 className="text-sm font-semibold">شو ممكن يساعد</h3>
          <ul className="mt-2 space-y-2 text-xs">
            {advice.map((a) => (
              <li key={a.metric} className={`rounded-xl border p-3 ${a.rating === "poor" ? "border-red-400/30 bg-red-500/10" : "border-amber-400/30 bg-amber-500/10"}`}>
                <div className="font-medium">{`${RUM_METRIC_TEXT[a.metric].label}: ${RUM_RATING_TEXT[a.rating].label}`}</div>
                <div className="mt-0.5 text-white/70">{a.text}</div>
                {a.where.length ? <div className="mt-1 text-white/50">{`وين: ${a.where.join("، ")}`}</div> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {r.items.length ? (
        <section className={`${box} overflow-x-auto`}>
          <h3 className="text-sm font-semibold">حسب الصفحة والجهاز</h3>
          <table className="mt-3 w-full min-w-[860px] text-xs" data-testid="rum-table">
            <thead className="text-white/50">
              <tr className="text-right">
                <th className="py-2 font-normal">الصفحة</th>
                <th className="font-normal">الجهاز</th>
                <th className="font-normal">زيارات</th>
                {RUM_MAIN.map((k) => (
                  <th key={k} className="font-normal" title={RUM_METRIC_TEXT[k].note}>
                    {RUM_METRIC_TEXT[k].label}
                  </th>
                ))}
                <th className="font-normal">فتح الصفحة، آخر أسبوعين</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {r.items.slice(0, 60).map((i) => (
                <Row key={`${i.page}|${i.device}|${i.os}`} item={i} />
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-white/50">{`الأرقام الباهتة من أقل من ${RUM_FEW} زيارة، ممكن تتغيّر كثير. «عم يسوء» = آخر 3 أيام أبطأ من الأسبوع اللي قبلها.`}</p>
        </section>
      ) : null}
    </>
  );
}

function Card({ metric, report }: { metric: RumMetric; report: RumReport }) {
  const v = report.overall[metric];
  const rate = v?.rating ? RUM_RATING_TEXT[v.rating] : null;
  return (
    <div className="rounded-xl bg-white/[0.04] p-3" title={`${RUM_METRIC_TEXT[metric].note} ${rumLimitsText(metric, report.thresholds[metric])}`} data-testid={`rum-card-${metric}`}>
      <div className="text-xs text-white/60">{RUM_METRIC_TEXT[metric].label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${rate?.cell ?? ""}`}>{rumValueText(metric, v?.value)}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-white/50">
        {rate ? (
          <Badge size="sm" variant={rate.variant}>
            {rate.label}
          </Badge>
        ) : null}
        <span>{rumCountText(v)}</span>
      </div>
    </div>
  );
}

function Row({ item }: { item: RumItem }) {
  const lcp = item.daily.map((d) => d.lcp);
  const path = sparkPath(lcp, 120, 24);
  const lcpRate = item.metrics.lcp?.rating;
  return (
    <tr>
      <td className="py-2">
        <div>{RUM_PAGE_TEXT[item.page] ?? item.page}</div>
        {item.worse.length ? (
          <span className="mt-0.5 inline-block" title={item.worse.map((k) => RUM_METRIC_TEXT[k].label).join("، ")}>
            <Badge size="sm" variant="danger">
              {`عم يسوء: ${item.worse.map((k) => RUM_METRIC_TEXT[k].label).join("، ")}`}
            </Badge>
          </span>
        ) : null}
      </td>
      <td>{[RUM_DEVICE_TEXT[item.device] ?? item.device, item.os === "all" ? null : RUM_OS_TEXT[item.os] ?? item.os].filter(Boolean).join(" · ")}</td>
      <td className="tabular-nums">{item.visits.toLocaleString("en")}</td>
      {RUM_MAIN.map((k) => {
        const v = item.metrics[k];
        const few = (v?.count ?? 0) < RUM_FEW;
        return (
          <td key={k} className={`tabular-nums ${v?.rating ? RUM_RATING_TEXT[v.rating].cell : "text-white/40"} ${few ? "opacity-60" : ""}`} title={v ? rumCountText(v) : undefined}>
            {rumValueText(k, v?.value)}
          </td>
        );
      })}
      <td>
        {path ? (
          <svg viewBox="0 0 120 24" className="h-6 w-28" preserveAspectRatio="none" role="img" aria-label="فتح الصفحة كل يوم">
            <path d={path} fill="none" strokeWidth={1.5} className={lcpRate === "poor" ? "stroke-red-400" : lcpRate === "okay" ? "stroke-amber-400" : "stroke-emerald-400"} />
          </svg>
        ) : (
          <span className="text-white/40">—</span>
        )}
      </td>
    </tr>
  );
}

export default ShopperSpeedPanel;
