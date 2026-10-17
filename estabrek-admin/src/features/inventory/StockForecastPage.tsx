// توقّع المخزون: when each size runs out at the current pace, what to reorder from
// the supplier, what nobody looked at, and what people look at but don't buy.
// From the orders and the popularity counts (السرعة والكاش → الشعبية).
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { formatCurrencyILS } from "../../lib/format";
import { downloadText, toCsv } from "../../lib/csv";
import * as InsightsAPI from "../../api/insights.api";
import type { ForecastProduct, ForecastSettings, StockInsights } from "../../api/insights.api";
import { NumberInput, Segmented, Stat } from "../system/cacheParts";
import { STATUS_TEXT, SETTINGS_TEXT, daysText, filterProducts, forecastSentence, lastViewedText, paceText, reorderRows, type ForecastFilter } from "./forecastText";

type Shelf = "unseen" | "looked";
const KEY = ["insights", "stock"];

export default function StockForecastPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("inventory:write");
  const q = useQuery({ queryKey: KEY, queryFn: InsightsAPI.getStockInsights });
  const [tab, setTab] = useState<ForecastFilter>("urgent");
  const [shelf, setShelf] = useState<Shelf>("unseen");
  const [showSettings, setShowSettings] = useState(false);

  if (!q.data) {
    return (
      <div dir="rtl">
        <PageHeader title="توقّع المخزون" />
        <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>
      </div>
    );
  }
  const d = q.data;
  const s = d.summary;
  const download = () => {
    const { head, rows } = reorderRows(d.products, d.settings);
    if (!rows.length) return toast.info("ما في شي للطلب هلّق");
    downloadText(`reorder-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(head, rows));
  };

  return (
    <div dir="rtl" className="space-y-4 pb-16" data-testid="forecast-page">
      <PageHeader
        title="توقّع المخزون"
        subtitle={`على سرعة البيع: آخر 7 أيام مع آخر ${d.settings.windowDays} يوم، والتوصيل من المورّد ${daysText(d.settings.leadDays)}.`}
        right={
          <>
            <Button variant="ghost" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings}>
              الأرقام
            </Button>
            <Button variant="secondary" onClick={download} disabled={!s.reorderPieces}>
              نزّل قائمة الطلب
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="بيخلص قريب" value={String(s.soon)} note={`قبل ما توصل طلبية (${daysText(d.settings.leadDays)})`} testId="forecast-soon" />
        <Stat label="خلص وعليه طلب" value={String(s.soldOut)} />
        <Stat label="للطلب من المورّد" value={s.reorderPieces.toLocaleString("en")} note="قطعة" />
        <Stat label="ما حدا شافه" value={String(s.unseen)} note={s.unseenValue ? `${formatCurrencyILS(s.unseenValue)} بضاعة واقفة` : undefined} />
      </div>

      {showSettings ? <SettingsCard data={d} canWrite={canWrite} onSaved={() => qc.invalidateQueries({ queryKey: KEY })} /> : null}

      {d.viewsDays < d.settings.unseenDays ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          {d.viewsDays
            ? `عدّ المشاهدات بلّش من ${daysText(d.viewsDays)} بس، فقائمة «ما حدا شافه» بتكمل بعد ${daysText(d.settings.unseenDays - d.viewsDays)}. لهلّق فيها بس اللي ما انشاف من ما بلّش العدّ.`
            : "عدّ المشاهدات لسا ما بلّش (السرعة والكاش ← الشعبية). توقّع المخزون شغّال من الطلبات، بس «ما حدا شافه» و«بيتفرجوا وما بيشتروا» بيحتاجوه."}
        </p>
      ) : null}

      <Segmented
        value={tab}
        disabled={false}
        onChange={setTab}
        options={[
          { value: "urgent", label: `بيخلص (${s.soon + s.soldOut + s.watch})` },
          { value: "reorder", label: "للطلب" },
          { value: "all", label: "الكل" },
        ]}
      />
      <ProductList products={filterProducts(d.products, tab)} tab={tab} />

      <section className="space-y-3 pt-4" data-testid="forecast-still">
        <div>
          <h2 className="text-lg font-semibold">بضاعة واقفة</h2>
          <p className="text-sm text-white/60">على الرف وما عم تتحرّك: فرصة لصورة أوضح، مكان بالرئيسية، أو خصم.</p>
        </div>
        <Segmented
          value={shelf}
          disabled={false}
          onChange={setShelf}
          options={[
            { value: "unseen", label: `ما حدا شافه (${s.unseen})` },
            { value: "looked", label: `بيتفرجوا وما بيشتروا (${s.lookedNotBought})` },
          ]}
        />
        {shelf === "unseen" ? (
          <ShelfList
            empty="ما في. كل المنتجات اللي بالمخزون انشافت بآخر الأيام."
            rows={d.unseen.map((p) => ({ ...p, line: `${lastViewedText(p.lastViewedAt, d.now)} · على الرف من ${daysText(p.ageDays)}` }))}
            hint={`على الرف أكثر من ${daysText(d.settings.unseenDays)}، وما حدا فتح صفحته ولا اشترى منه.`}
          />
        ) : (
          <ShelfList
            empty="ما في."
            rows={d.lookedNotBought.map((p) => ({ ...p, line: `${p.views.toLocaleString("en")} مشاهدة · ${p.bags.toLocaleString("en")} للسلة · ولا بيعة` }))}
            hint={`انفتح كثير بآخر ${daysText(d.settings.unseenDays)} وما انباع: ممكن السعر، المقاسات، أو الصور ما بتوضّحه.`}
          />
        )}
      </section>
    </div>
  );
}

function SettingsCard({ data, canWrite, onSaved }: { data: StockInsights; canWrite: boolean; onSaved: () => void }) {
  const [draft, setDraft] = useState<ForecastSettings>(data.settings);
  const save = useMutation({
    mutationFn: () => InsightsAPI.saveForecastSettings(draft),
    onSuccess: () => (toast.success("انحفظت الأرقام"), onSaved()),
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const keys = Object.keys(SETTINGS_TEXT) as Array<keyof ForecastSettings>;
  const bad = keys.some((k) => !Number.isInteger(draft[k]) || draft[k] < data.limits[k].min || draft[k] > data.limits[k].max);
  const dirty = keys.some((k) => draft[k] !== data.settings[k]);
  return (
    <Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {keys.map((k) => (
          <NumberInput
            key={k}
            id={`forecast-${k}`}
            label={SETTINGS_TEXT[k].label}
            unit={SETTINGS_TEXT[k].unit}
            help={SETTINGS_TEXT[k].help}
            value={draft[k]}
            def={data.defaults[k]}
            limits={data.limits[k]}
            invalid={!Number.isInteger(draft[k]) || draft[k] < data.limits[k].min || draft[k] > data.limits[k].max}
            disabled={!canWrite}
            onChange={(v) => setDraft({ ...draft, [k]: v })}
          />
        ))}
      </div>
      {canWrite ? (
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={!dirty || bad}>
            حفظ
          </Button>
          {dirty ? (
            <Button variant="ghost" onClick={() => setDraft(data.settings)}>
              تراجع
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function Thumb({ url }: { url: string | null }) {
  return url ? <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" /> : <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5" />;
}

function ProductList({ products, tab }: { products: ForecastProduct[]; tab: ForecastFilter }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!products.length) {
    return (
      <Card>
        <p className="text-sm text-white/60">{tab === "urgent" ? "ما في شي قرب يخلص على هالسرعة." : tab === "reorder" ? "ما في شي للطلب هلّق." : "ما في منتجات."}</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2" data-testid="forecast-list">
      {products.map((p) => {
        const st = STATUS_TEXT[p.status];
        const isOpen = open === p.productId;
        return (
          <Card key={p.productId} padding="sm">
            <div className="flex items-start gap-3">
              <Thumb url={p.thumbUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/catalog/products/${p.productId}`} className="truncate font-medium hover:underline">
                    {p.title}
                  </Link>
                  <Badge size="sm" variant={st.variant}>
                    {st.label}
                  </Badge>
                  {p.rising ? (
                    <Badge size="sm" variant="info">
                      عم يطلب أكثر
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm">{forecastSentence(p)}</p>
                <p className="mt-0.5 text-xs text-white/50">
                  {[`${paceText(p.pace)}`, `موجود ${p.available.toLocaleString("en")}`, p.stock !== p.available ? `${(p.stock - p.available).toLocaleString("en")} محجوز بطلبات` : null, p.reorder ? `اطلب ${p.reorder.toLocaleString("en")}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button type="button" className="shrink-0 text-xs text-white/60 underline" onClick={() => setOpen(isOpen ? null : p.productId)} aria-expanded={isOpen}>
                {isOpen ? "خبّي" : `المقاسات (${p.variants.length})`}
              </button>
            </div>
            {isOpen ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs" data-testid={`forecast-variants-${p.productId}`}>
                  <thead className="text-white/50">
                    <tr className="text-right">
                      <th className="py-1.5 font-normal">اللون والمقاس</th>
                      <th className="font-normal">موجود</th>
                      <th className="font-normal">انباع آخر 7 أيام</th>
                      <th className="font-normal">السرعة</th>
                      <th className="font-normal">بيخلص بعد</th>
                      <th className="font-normal">اطلب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {p.variants.map((v) => (
                      <tr key={v.variantId}>
                        <td className="py-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            {v.colorHex ? <span className="h-3 w-3 rounded-full border border-white/20" style={{ background: v.colorHex }} /> : null}
                            {`${v.color !== "Default" ? `${v.color} · ` : ""}${v.size}`}
                          </span>
                        </td>
                        <td className="tabular-nums">{v.held ? `${v.available} (+${v.held} محجوز)` : v.available}</td>
                        <td className="tabular-nums">{v.sold7}</td>
                        <td className={v.rough ? "text-white/50" : ""} title={v.rough ? "انباع منه أقل من 3 بهالمدة: تقريبي" : undefined}>
                          {paceText(v.pace)}
                        </td>
                        <td className={`tabular-nums ${STATUS_TEXT[v.status].variant === "danger" ? "text-red-300" : STATUS_TEXT[v.status].variant === "warning" ? "text-amber-300" : ""}`}>
                          {v.status === "noSales" || v.status === "empty" ? "—" : daysText(v.daysLeft)}
                        </td>
                        <td className="tabular-nums font-medium">{v.reorder || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function ShelfList({ rows, empty, hint }: { rows: Array<{ productId: string; title: string; thumbUrl: string | null; stock: number; stockValue: number; onSale: boolean; line: string }>; empty: string; hint: string }) {
  if (!rows.length) {
    return (
      <Card>
        <p className="text-sm text-white/60">{empty}</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2" data-testid="forecast-shelf">
      <p className="px-1 text-xs text-white/60">{hint}</p>
      {rows.map((p) => (
        <Card key={p.productId} padding="sm">
          <div className="flex items-center gap-3">
            <Thumb url={p.thumbUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/catalog/products/${p.productId}`} className="truncate font-medium hover:underline">
                  {p.title}
                </Link>
                {p.onSale ? (
                  <Badge size="sm" variant="accent">
                    عليه خصم
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-white/50">{p.line}</p>
            </div>
            <div className="shrink-0 text-left text-xs">
              <div className="tabular-nums">{`${p.stock.toLocaleString("en")} قطعة`}</div>
              <div className="tabular-nums text-white/50">{formatCurrencyILS(p.stockValue)}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
