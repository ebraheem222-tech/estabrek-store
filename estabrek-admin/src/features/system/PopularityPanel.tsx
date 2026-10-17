// الشعبية والتجهيز المسبق: which products shoppers look at, save and buy right now
// (a score that fades with time), how much longer their pages stay cached, pinning,
// and building the popular pages in advance. Part of the speed & cache page.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { env } from "../../config/env";
import * as CacheAPI from "../../api/cache.api";
import type { CacheLimits, CacheLive, DayCounts, PopularItem, PopularityConfig } from "../../api/cache.api";
import { relativeTime } from "../team/teamText";
import { NumberInput, Segmented, Stat, Toggle } from "./cacheParts";
import { WARM_REASON_TEXT, boostedTtlText, durationText, timesText, togglePinned } from "./cacheText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

const KIND = [
  { key: "views", label: "مشاهدة", color: "fill-sky-400/80", dot: "bg-sky-400/80" },
  { key: "wishlists", label: "مفضلة", color: "fill-pink-400/80", dot: "bg-pink-400/80" },
  { key: "bags", label: "سلة", color: "fill-amber-400/80", dot: "bg-amber-400/80" },
  { key: "purchases", label: "شراء", color: "fill-emerald-400/80", dot: "bg-emerald-400/80" },
] as const;

export function PopularityPanel({
  draft,
  defaults,
  limits,
  bad,
  canWrite,
  productTtlSeconds,
  live,
  onChange,
}: {
  draft: PopularityConfig;
  defaults: PopularityConfig;
  limits: CacheLimits;
  bad: string[];
  canWrite: boolean;
  productTtlSeconds: number;
  live: CacheLive;
  onChange: <K extends keyof PopularityConfig>(field: K, value: PopularityConfig[K]) => void;
}) {
  const qc = useQueryClient();
  const [days, setDays] = useState<"1" | "7" | "30">("7");
  const q = useQuery({
    queryKey: ["system", "cache", "popular", days],
    queryFn: () => CacheAPI.getPopular({ days: Number(days), limit: 50 }),
    refetchInterval: 30_000,
  });
  const warm = useMutation({
    mutationFn: CacheAPI.warmCache,
    onSuccess: (out) => {
      toast.success(out.built ? `تجهّزت ${out.built} صفحة` : "كل الصفحات الشائعة جاهزة أصلاً", {
        description: `${out.products} منتج · ${out.skipped} كانت جاهزة · ${out.ms} ms`,
      });
      qc.invalidateQueries({ queryKey: ["system", "cache", "live"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const p = live.popularity;
  const lastWarm = live.warm?.last ?? null;
  const field = (name: keyof PopularityConfig) => `popularity.${name}`;
  const num = (
    name: "halfLifeHours" | "weightView" | "weightWishlist" | "weightBag" | "weightPurchase" | "maxTtlMultiplier" | "hotCount" | "warmCount",
    limit: keyof CacheLimits,
  ) => ({
    id: `pop-${name}`,
    value: draft[name],
    def: defaults[name],
    limits: limits[limit],
    invalid: bad.includes(field(name)),
    disabled: !canWrite,
    onChange: (v: number) => onChange(name, v),
  });

  return (
    <div className="space-y-4" data-testid="cache-popularity">
      <section className={box}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold">المنتجات الأكثر شعبية</h2>
            <p className="mt-1 text-sm text-white/60">
              كل منتج إله «شعبية» من اللي بيعمله الزباين فيه: مشاهدة، مفضلة، سلة وشراء، وكل واحدة إلها وزن. الشعبية بتخفّ مع الوقت (النص كل{" "}
              {durationText(draft.halfLifeHours * 3600)})، فالمنتج اللي انطلب اليوم أهم من اللي انطلب الأسبوع الماضي. صفحات الأكثر شعبية بتضل بالكاش لمدة أطول،
              وما بتطلع لما الذاكرة تمتلي، وبتتجهّز قبل ما حدا يطلبها.
            </p>
            <p className="mt-2 text-xs text-white/50">
              ما في أي معلومة عن الزبون: بس عدد لكل منتج. نفس الزبون إذا كرر (تحديث الصفحة) بينحسب مرة وحدة، والبوتات ما بتنحسب.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {p.enabled ? (
                <Badge size="sm" variant="success" dot>
                  شغّال
                </Badge>
              ) : (
                <Badge size="sm" variant="warning">
                  متوقف
                </Badge>
              )}
              <Badge size="sm">{p.tracked.toLocaleString("en")} منتج إله شعبية</Badge>
              <Badge size="sm">{p.hot} محمي</Badge>
              {p.pinned ? (
                <Badge size="sm" variant="info">
                  {p.pinned} مثبّت
                </Badge>
              ) : null}
              <Badge size="sm">{p.lastFlushAt ? `آخر حفظ ${relativeTime(p.lastFlushAt)}` : "لسا ما انحفظ شي"}</Badge>
              {p.flushErrors ? (
                <Badge size="sm" variant="warning">
                  {p.flushErrors} مرة ما انحفظ
                </Badge>
              ) : null}
            </div>
          </div>
          {canWrite ? (
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0 whitespace-nowrap"
              onClick={() => warm.mutate()}
              isLoading={warm.isPending}
              data-testid="cache-warm"
            >
              جهّز الصفحات هلّق
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="انحسب من وقت التشغيل" value={p.counted.toLocaleString("en")} note={`منها ${p.purchases} شراء`} />
          <Stat label="تكرار ما انحسب" value={p.ignored.repeats.toLocaleString("en")} note="نفس الزبون ونفس المنتج" />
          <Stat label="بوتات" value={p.ignored.bots.toLocaleString("en")} note="ما انحسبت" />
          <Stat
            label="آخر تجهيز"
            value={lastWarm ? `${lastWarm.built} صفحة` : "—"}
            note={lastWarm ? `${WARM_REASON_TEXT[lastWarm.reason] ?? lastWarm.reason} · ${relativeTime(lastWarm.at)}` : "بيصير لحاله بعد التعديلات"}
          />
        </div>
      </section>

      <section className={box}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">الترتيب الحالي</h2>
          <div className="w-full sm:w-72">
            <Segmented
              value={days}
              disabled={false}
              onChange={setDays}
              options={[
                { value: "1", label: "اليوم" },
                { value: "7", label: "7 أيام" },
                { value: "30", label: "30 يوم" },
              ]}
            />
          </div>
        </div>
        {q.isLoading ? (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Spinner /> جاري التحميل…
          </div>
        ) : q.isError ? (
          <div className="mt-3 text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : q.data ? (
          <>
            <StoreChart store={q.data.store} />
            {q.data.items.length ? (
              <ol className="mt-4 divide-y divide-white/10" data-testid="popular-list">
                {q.data.items.map((item, i) => (
                  <PopularRow
                    key={item.productId}
                    rank={i + 1}
                    item={item}
                    pinned={draft.pinned.includes(item.productId)}
                    canWrite={canWrite}
                    productTtlSeconds={productTtlSeconds}
                    onPin={() => onChange("pinned", togglePinned(draft.pinned, item.productId))}
                  />
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-white/60">لسا ما في أرقام. بتبلّش تبيّن أول ما الزباين يفتحوا منتجات.</p>
            )}
          </>
        ) : null}
      </section>

      <section className={box}>
        <h2 className="font-semibold">إعدادات الشعبية</h2>
        <p className="mt-1 text-xs text-white/60">التغييرات بتنحفظ من نفس شريط الحفظ تحت.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Toggle
              label="الكاش الذكي شغّال"
              help="إذا طفيته، كل المنتجات بتاخد نفس المدة، وما في تجهيز مسبق."
              checked={draft.enabled}
              disabled={!canWrite}
              onChange={(v) => onChange("enabled", v)}
            />
            <NumberInput
              label="سرعة نسيان الشعبية"
              unit="ساعة"
              help="كل هالمدة الشعبية بتنزل للنص. أقصر = بتتبع الترند أسرع."
              hint={(v) => `النص كل ${durationText(v * 3600)}`}
              {...num("halfLifeHours", "halfLifeHours")}
            />
            <NumberInput
              label="أطول مدة للأكثر شعبية"
              unit="× المدة"
              help="المنتج الأول بالترتيب بياخد هالضعف من مدة الصلاحية، والباقي أقل حسب شعبيته."
              hint={(v) => boostedTtlText(productTtlSeconds, v)}
              {...num("maxTtlMultiplier", "maxTtlMultiplier")}
            />
            <NumberInput
              label="عدد المنتجات المحمية"
              unit="منتج"
              help="الأوائل بالترتيب ما بيطلعوا من الذاكرة لما تمتلي (إلا إذا كلها محمية)."
              {...num("hotCount", "hotCount")}
            />
            <NumberInput
              label="عدد المنتجات اللي بتتجهّز مسبقاً"
              unit="منتج"
              help="صفحاتها بتنبني قبل ما حدا يطلبها: بعد تشغيل السيرفر، بعد التعديلات، وبعد التفضية. 0 = لا."
              {...num("warmCount", "warmCount")}
            />
            <Toggle
              label="جهّز بعد كل تعديل على منتج أو مخزون"
              help="5 ثواني بعد آخر تعديل، الصفحات الشائعة بتنبني من جديد."
              checked={draft.warmOnChange}
              disabled={!canWrite}
              onChange={(v) => onChange("warmOnChange", v)}
            />
          </div>
          <div className="space-y-4">
            <p className="text-sm font-medium">قديش بتوزن كل حركة</p>
            <NumberInput label="مشاهدة صفحة المنتج" unit="" {...num("weightView", "weight")} />
            <NumberInput label="إضافة للمفضلة" unit="" {...num("weightWishlist", "weight")} />
            <NumberInput label="إضافة للسلة" unit="" {...num("weightBag", "weight")} />
            <NumberInput label="شراء (طلب انبعت)" unit="" help="بينحسب لحاله من السيرفر لما ينبعت الطلب." {...num("weightPurchase", "weight")} />
            <p className="text-xs text-white/50">المثبّتة ({draft.pinned.length}/50) دايماً بتنعامل كأنها الأكثر شعبية. ثبّت أو شيل التثبيت من القائمة فوق.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PopularRow({
  rank,
  item,
  pinned,
  canWrite,
  productTtlSeconds,
  onPin,
}: {
  rank: number;
  item: PopularItem;
  pinned: boolean;
  canWrite: boolean;
  productTtlSeconds: number;
  onPin: () => void;
}) {
  const shop = `${env.VITE_STOREFRONT_BASE_URL.replace(/\/+$/, "")}/p/${encodeURIComponent(item.slug)}`;
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center" data-testid="popular-row">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="w-6 shrink-0 text-center text-sm tabular-nums text-white/50">{rank}</span>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="h-12 w-12 shrink-0 rounded-lg bg-white/10" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a href={shop} target="_blank" rel="noreferrer" className="truncate text-sm font-medium hover:underline">
              {item.title}
            </a>
            {pinned ? (
              <Badge size="sm" variant="info">
                مثبّت
              </Badge>
            ) : item.priority === 1 ? (
              <Badge size="sm" variant="success">
                محمي
              </Badge>
            ) : null}
            {!item.isActive ? <Badge size="sm">مخفي</Badge> : null}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10" title={`الشعبية ${Math.round(item.heat * 100)}%`}>
              <div className="h-full rounded-full bg-pink-400" style={{ width: `${Math.max(2, item.heat * 100)}%` }} />
            </div>
            <span className="text-[11px] tabular-nums text-white/50">{item.score.toLocaleString("en")}</span>
            <span className="text-[11px] text-white/50">· الكاش {boostedTtlText(productTtlSeconds, item.ttlMultiplier)}</span>
          </div>
          <Counts c={item.window} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Spark daily={item.daily} />
        <span className="w-12 text-center text-xs tabular-nums text-white/60">{timesText(item.ttlMultiplier)}</span>
        {canWrite ? (
          <Button size="xs" variant={pinned ? "secondary" : "ghost"} onClick={onPin} aria-pressed={pinned}>
            {pinned ? "شيل التثبيت" : "ثبّت"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function Counts({ c }: { c: DayCounts }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/60">
      {KIND.map((k) => (
        <span key={k.key} className="flex items-center gap-1">
          <i className={`inline-block h-1.5 w-1.5 rounded-full ${k.dot}`} />
          {k.label} <span className="tabular-nums">{c[k.key].toLocaleString("en")}</span>
        </span>
      ))}
    </div>
  );
}

/** Daily views of one product, last 14 days (newest on the left, like the page). */
function Spark({ daily }: { daily: PopularItem["daily"] }) {
  const last = daily.slice(-14);
  const max = Math.max(1, ...last.map((d) => d.views + d.bags + d.purchases));
  return (
    <svg viewBox="0 0 84 24" className="h-6 w-24" role="img" aria-label="آخر 14 يوم">
      {last.map((d, i) => {
        const h = ((d.views + d.bags + d.purchases) / max) * 22;
        return <rect key={d.day} x={(last.length - 1 - i) * 6} y={24 - h} width={4} height={Math.max(h, 0.5)} className="fill-pink-400/70" />;
      })}
    </svg>
  );
}

/** The whole shop per day: views, wishlists, bags and purchases. */
function StoreChart({ store }: { store: Array<DayCounts & { day: string }> }) {
  const last = store.slice(-14);
  const max = Math.max(1, ...last.map((d) => d.views + d.wishlists + d.bags + d.purchases));
  const total = last.reduce(
    (s, d) => ({ views: s.views + d.views, wishlists: s.wishlists + d.wishlists, bags: s.bags + d.bags, purchases: s.purchases + d.purchases }),
    {
      views: 0,
      wishlists: 0,
      bags: 0,
      purchases: 0,
    },
  );
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
        <span>كل المتجر، آخر 14 يوم</span>
        <Counts c={total} />
      </div>
      <svg viewBox="0 0 280 60" className="mt-2 h-16 w-full" preserveAspectRatio="none" role="img" aria-label="حركة المتجر آخر 14 يوم">
        {last.map((d, i) => {
          let y = 60;
          const x = (last.length - 1 - i) * 20 + 2;
          return (
            <g key={d.day}>
              {KIND.map((k) => {
                const h = (d[k.key] / max) * 58;
                y -= h;
                return <rect key={k.key} x={x} y={y} width={16} height={h} className={k.color} />;
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default PopularityPanel;
