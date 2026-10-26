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
import { formatCurrency } from "../../lib/format";
import { downloadText, toCsv } from "../../lib/csv";
import * as InsightsAPI from "../../api/insights.api";
import type { ForecastProduct, ForecastSettings, StockInsights } from "../../api/insights.api";
import { NumberInput, Segmented, Stat } from "../system/cacheParts";
import { STATUS_TEXT, SETTINGS_TEXT, daysText, filterProducts, forecastSentence, lastViewedText, paceText, reorderRows, type ForecastFilter } from "./forecastText";
import { tr } from "@/lib/words";

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
      <div>
        <PageHeader title={tr("توقّع المخزون", "Stock forecast")} />
        <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>
      </div>
    );
  }
  const d = q.data;
  const s = d.summary;
  const download = () => {
    const { head, rows } = reorderRows(d.products, d.settings);
    if (!rows.length) return toast.info(tr("ما في شي للطلب هلّق", "Nothing to order right now"));
    downloadText(`reorder-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(head, rows));
  };

  return (
    <div className="space-y-4 pb-16" data-testid="forecast-page">
      <PageHeader
        title={tr("توقّع المخزون", "Stock forecast")}
        subtitle={tr(`على سرعة البيع: آخر 7 أيام مع آخر ${d.settings.windowDays} يوم، والتوصيل من المورّد ${daysText(d.settings.leadDays)}.`, "At the selling pace: the last 7 days with the last {0} days, and supplier delivery {1}.", [d.settings.windowDays, daysText(d.settings.leadDays)])}
        right={
          <>
            <Button variant="ghost" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings}>
              {tr("الأرقام", "The numbers")}
            </Button>
            <Button variant="secondary" onClick={download} disabled={!s.reorderPieces}>
              {tr("تنزيل قائمة الطلب", "Download the order list")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={tr("بيخلص قريب", "Running out soon")} value={String(s.soon)} note={tr(`قبل ما توصل طلبية (${daysText(d.settings.leadDays)})`, "before an order arrives ({0})", [daysText(d.settings.leadDays)])} testId="forecast-soon" />
        <Stat label={tr("خلص وعليه طلب", "Out, still wanted")} value={String(s.soldOut)} />
        <Stat label={tr("للطلب من المورّد", "To order from the supplier")} value={s.reorderPieces.toLocaleString("en")} note={tr("قطعة", "pieces")} />
        <Stat label={tr("ما حدا شافه", "Nobody saw it")} value={String(s.unseen)} note={s.unseenValue ? tr(`${formatCurrency(s.unseenValue)} بضاعة واقفة`, "{0} of goods standing still", [formatCurrency(s.unseenValue)]) : undefined} />
      </div>

      {showSettings ? <SettingsCard data={d} canWrite={canWrite} onSaved={() => qc.invalidateQueries({ queryKey: KEY })} /> : null}

      {d.viewsDays < d.settings.unseenDays ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          {d.viewsDays
            ? tr(`عدّ المشاهدات بلّش من ${daysText(d.viewsDays)} بس، فقائمة «ما حدا شافه» بتكمل بعد ${daysText(d.settings.unseenDays - d.viewsDays)}. لهلّق فيها بس اللي ما انشاف من ما بلّش العدّ.`, "View counting started only {0} ago, so the “Nobody saw it” list completes in {1}. For now it only has what wasn't seen since counting began.", [daysText(d.viewsDays), daysText(d.settings.unseenDays - d.viewsDays)])
            : tr("عدّ المشاهدات لسا ما بلّش (السرعة والكاش ← الشعبية). توقّع المخزون شغّال من الطلبات، بس «ما حدا شافه» و«بيتفرجوا وما بيشتروا» بيحتاجوه.", "View counting hasn't started (Speed and cache → Popularity). The stock forecast works from orders, but “Nobody saw it” and “Looked but didn't buy” need it.")}
        </p>
      ) : null}

      <Segmented
        value={tab}
        disabled={false}
        onChange={setTab}
        options={[
          { value: "urgent", label: tr(`بيخلص (${s.soon + s.soldOut + s.watch})`, "Running out ({0})", [s.soon + s.soldOut + s.watch]) },
          { value: "reorder", label: tr("للطلب", "To order") },
          { value: "all", label: tr("الكل", "All") },
        ]}
      />
      <ProductList products={filterProducts(d.products, tab)} tab={tab} />

      <section className="space-y-3 pt-4" data-testid="forecast-still">
        <div>
          <h2 className="text-lg font-semibold">{tr("بضاعة واقفة", "Goods standing still")}</h2>
          <p className="text-sm text-white/60">{tr("على الرف وما عم تتحرّك: فرصة لصورة أوضح، مكان بالرئيسية، أو خصم.", "On the shelf and not moving: a chance for a clearer photo, a spot on the home page, or a discount.")}</p>
        </div>
        <Segmented
          value={shelf}
          disabled={false}
          onChange={setShelf}
          options={[
            { value: "unseen", label: tr(`ما حدا شافه (${s.unseen})`, "Nobody saw it ({0})", [s.unseen]) },
            { value: "looked", label: tr(`بيتفرجوا وما بيشتروا (${s.lookedNotBought})`, "Looked but didn't buy ({0})", [s.lookedNotBought]) },
          ]}
        />
        {shelf === "unseen" ? (
          <ShelfList
            empty={tr("ما في. كل المنتجات اللي بالمخزون انشافت بآخر الأيام.", "None. Every product in stock was seen in the last days.")}
            rows={d.unseen.map((p) => ({ ...p, line: tr(`${lastViewedText(p.lastViewedAt, d.now)} · على الرف من ${daysText(p.ageDays)}`, "{0} · on the shelf for {1}", [lastViewedText(p.lastViewedAt, d.now), daysText(p.ageDays)]) }))}
            hint={tr(`على الرف أكثر من ${daysText(d.settings.unseenDays)}، وما حدا فتح صفحته ولا اشترى منه.`, "On the shelf more than {0}, and nobody opened its page or bought it.", [daysText(d.settings.unseenDays)])}
          />
        ) : (
          <ShelfList
            empty={tr("ما في.", "None.")}
            rows={d.lookedNotBought.map((p) => ({ ...p, line: tr(`${p.views.toLocaleString("en")} مشاهدة · ${p.bags.toLocaleString("en")} للسلة · ولا بيعة`, "{0} views · {1} to the bag · no sales", [p.views.toLocaleString("en"), p.bags.toLocaleString("en")]) }))}
            hint={tr(`انفتح كثير بآخر ${daysText(d.settings.unseenDays)} وما انباع: ممكن السعر، المقاسات، أو الصور ما بتوضّحه.`, "Opened a lot in the last {0} and not sold: maybe the price, the sizes, or the photos don't show it well.", [daysText(d.settings.unseenDays)])}
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
    onSuccess: () => (toast.success(tr("انحفظت الأرقام", "The numbers were saved")), onSaved()),
    onError: (e) => toast.error(tr("ما زبط", "That didn't work"), { description: getApiErrorMessage(e) }),
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
            {tr("حفظ", "Save")}
          </Button>
          {dirty ? (
            <Button variant="ghost" onClick={() => setDraft(data.settings)}>
              {tr("تراجع", "Undo")}
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
        <p className="text-sm text-white/60">{tab === "urgent" ? tr("ما في شي قرب يخلص على هالسرعة.", "Nothing is close to running out at this pace.") : tab === "reorder" ? tr("ما في شي للطلب هلّق.", "Nothing to order right now.") : tr("ما في منتجات.", "No products.")}</p>
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
                      {tr("عم يطلب أكثر", "Being ordered more")}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm">{forecastSentence(p)}</p>
                <p className="mt-0.5 text-xs text-white/50">
                  {[`${paceText(p.pace)}`, tr(`موجود ${p.available.toLocaleString("en")}`, "{0} in stock", [p.available.toLocaleString("en")]), p.stock !== p.available ? tr(`${(p.stock - p.available).toLocaleString("en")} محجوز بطلبات`, "{0} held by orders", [(p.stock - p.available).toLocaleString("en")]) : null, p.reorder ? tr(`اطلب ${p.reorder.toLocaleString("en")}`, "Order {0}", [p.reorder.toLocaleString("en")]) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button type="button" className="shrink-0 text-xs text-white/60 underline" onClick={() => setOpen(isOpen ? null : p.productId)} aria-expanded={isOpen}>
                {isOpen ? tr("إخفاء", "Hide") : tr(`المقاسات (${p.variants.length})`, "Sizes ({0})", [p.variants.length])}
              </button>
            </div>
            {isOpen ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs" data-testid={`forecast-variants-${p.productId}`}>
                  <thead className="text-white/50">
                    <tr className="text-start">
                      <th className="py-1.5 font-normal">{tr("اللون والمقاس", "Colour and size")}</th>
                      <th className="font-normal">{tr("موجود", "In stock")}</th>
                      <th className="font-normal">{tr("انباع آخر 7 أيام", "Sold last 7 days")}</th>
                      <th className="font-normal">{tr("السرعة", "Pace")}</th>
                      <th className="font-normal">{tr("بيخلص بعد", "Runs out in")}</th>
                      <th className="font-normal">{tr("اطلب", "Order")}</th>
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
                        <td className="tabular-nums">{v.held ? tr(`${v.available} (+${v.held} محجوز)`, "{0} (+{1} held)", [v.available, v.held]) : v.available}</td>
                        <td className="tabular-nums">{v.sold7}</td>
                        <td className={v.rough ? "text-white/50" : ""} title={v.rough ? tr("انباع منه أقل من 3 بهالمدة: تقريبي", "Fewer than 3 sold in this time: rough") : undefined}>
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
                    {tr("عليه خصم", "On discount")}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-white/50">{p.line}</p>
            </div>
            <div className="shrink-0 text-end text-xs">
              <div className="tabular-nums">{tr(`${p.stock.toLocaleString("en")} قطعة`, "{0} pcs", [p.stock.toLocaleString("en")])}</div>
              <div className="tabular-nums text-white/50">{formatCurrency(p.stockValue)}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
