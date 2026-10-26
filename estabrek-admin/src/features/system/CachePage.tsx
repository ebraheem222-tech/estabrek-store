// السرعة والكاش: the shop's cache layers (server memory + Redis), live hit/miss
// numbers per namespace, and their settings (memory, eviction rule, TTL), set
// from here instead of code.
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as CacheAPI from "../../api/cache.api";
import type {
  CacheConfig,
  CacheLimits,
  CacheLive,
  CacheNamespaceLive,
  CacheNamespaceName,
  CachePatch,
  CachePolicy,
  StorefrontMotion,
} from "../../api/cache.api";
import type { PolicyRevision } from "../../api/system.api";
import { relativeTime } from "../team/teamText";
import { Bar, NumberInput, Segmented, Stat, Toggle } from "./cacheParts";
import { PopularityPanel } from "./PopularityPanel";
import { MotionPanel } from "./MotionPanel";
import {
  GROUP_TEXT,
  NAMESPACE_TEXT,
  POLICY_TEXT,
  budgets,
  cachePatch,
  changedPaths,
  describeChanged,
  durationText,
  formatBytes,
  motionOutOfRange,
  motionPatch,
  outOfRange,
  ratioText,
  redisText,
  savedText,
  shortKey,
  uptimeText,
} from "./cacheText";
import { loc } from "@/lib/lang";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

type Confirm = { kind: "purge"; ns?: CacheNamespaceName } | { kind: "reset" } | { kind: "restore"; rev: PolicyRevision };

export default function CachePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const q = useQuery({ queryKey: ["system", "cache"], queryFn: CacheAPI.getCachePage });
  const liveQ = useQuery({ queryKey: ["system", "cache", "live"], queryFn: CacheAPI.getCacheLive, refetchInterval: 5_000, enabled: !!q.data });
  const [draft, setDraft] = useState<CacheConfig | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [motionDraft, setMotionDraft] = useState<StorefrontMotion | null>(null);
  type Tab = "cache" | "popular" | "motion";
  const [tab, setTab] = useState<Tab>(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    return hash === "popular" || hash === "motion" ? hash : "cache";
  });

  // Start editing from the saved settings (and again after each save).
  const [editing, setEditing] = useState<CacheConfig | null>(null);
  if (q.data && q.data.config !== editing) {
    setEditing(q.data.config);
    setDraft(q.data.config);
    setMotionDraft(q.data.storefront);
  }

  const saved = q.data?.config;
  const savedMotion = q.data?.storefront;
  const motionDiff = useMemo(() => (motionDraft && savedMotion ? motionPatch(motionDraft, savedMotion) : {}), [motionDraft, savedMotion]);
  const motionDirty = Object.keys(motionDiff).length > 0;
  const patch = useMemo<CachePatch>(
    () => ({ ...(draft && saved ? cachePatch(draft, saved) : {}), ...(motionDirty ? { storefront: motionDiff } : {}) }),
    [draft, saved, motionDiff, motionDirty],
  );
  const dirty = Object.keys(patch).length > 0;
  const bad = useMemo(
    () => [...(draft && q.data ? outOfRange(draft, q.data.limits) : []), ...(motionDraft && q.data ? motionOutOfRange(motionDraft, q.data.motionLimits) : [])],
    [draft, motionDraft, q.data],
  );
  const pendingPaths = () => [
    ...(draft && q.data ? changedPaths(draft, q.data.config) : []),
    ...Object.entries(motionDiff).flatMap(([k, v]) =>
      k === "sections"
        ? Object.entries(v as object).flatMap(([n, f]) => Object.keys(f as object).map((x) => `storefront.sections.${n}.${x}`))
        : [`storefront.${k}`],
    ),
  ];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["system", "cache"] });
  };
  const after = (msg: string) => (out: { changed: string[] }) => {
    toast.success(msg, { description: describeChanged(out.changed) });
    setConfirm(null);
    refresh();
  };
  const onError = (e: unknown) => toast.error("ما زبط", { description: getApiErrorMessage(e) });
  const save = useMutation({ mutationFn: () => CacheAPI.saveCacheConfig(patch), onSuccess: after("انحفظت الإعدادات"), onError });
  const reset = useMutation({ mutationFn: CacheAPI.resetCacheConfig, onSuccess: after("رجعت الإعدادات للافتراضي"), onError });
  const restore = useMutation({ mutationFn: (id: string) => CacheAPI.restoreCacheConfig(id), onSuccess: after("رجعت الإعدادات للنسخة المختارة"), onError });
  const purge = useMutation({
    mutationFn: (ns?: CacheNamespaceName) => CacheAPI.purgeCache(ns),
    onSuccess: (out) => {
      toast.success(out.namespace ? `تفضّى «${NAMESPACE_TEXT[out.namespace].label}»` : "تفضّى كل الكاش", {
        description: "الطلبات الجاية بتنبني من جديد من قاعدة البيانات، وصفحات المتجر كمان.",
      });
      setConfirm(null);
      refresh();
    },
    onError,
  });

  if (q.isLoading || !draft || !motionDraft || !q.data) {
    return (
      <div className={box}>
        {q.isError ? (
          <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Spinner /> جاري التحميل…
          </div>
        )}
      </div>
    );
  }

  const d = q.data;
  const live: CacheLive = liveQ.data ?? d.live;
  const redis = redisText(live.redis, draft.useRedis);
  const plan = budgets(draft);
  const setNs = (name: CacheNamespaceName, field: keyof CacheConfig["namespaces"][CacheNamespaceName], value: unknown) =>
    setDraft((prev) => (prev ? { ...prev, namespaces: { ...prev.namespaces, [name]: { ...prev.namespaces[name], [field]: value } } } : prev));

  return (
    <div className="space-y-4 pb-24" data-testid="cache-page">
      <div className={box}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">السرعة والكاش</h1>
            <p className="mt-1 text-sm text-white/60">
              السيرفر بيحفظ أجوبة المتجر (المنتجات، الفلاتر، الصفحات…) بالذاكرة، فالزبون بياخدها فوراً بدل ما نسأل قاعدة البيانات كل مرة. أي تعديل على منتج أو
              مخزون أو صفحة بيفضّي اللي بيخصّه لحاله، وما في سعر عرض بيضل غلط بعد ما يبلّش أو يخلص.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {live.enabled ? (
                <Badge size="sm" variant="success" dot>
                  شغّال
                </Badge>
              ) : (
                <Badge size="sm" variant="warning">
                  متوقف
                </Badge>
              )}
              <Badge size="sm" variant={redis.variant}>
                {redis.label}
              </Badge>
              <Badge size="sm">شغّال من {uptimeText(live.uptimeSeconds)}</Badge>
              {d.updatedAt ? <Badge size="sm">آخر تعديل {relativeTime(d.updatedAt)}</Badge> : <Badge size="sm">على الإعدادات الافتراضية</Badge>}
            </div>
            <p className="mt-2 text-xs text-white/50">{redis.hint}</p>
          </div>
          {canWrite ? (
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0 whitespace-nowrap"
              onClick={() => setConfirm({ kind: "purge" })}
              data-testid="cache-purge-all"
            >
              فضّي كل الكاش
            </Button>
          ) : null}
        </div>
        {d.envDisabled ? (
          <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
            الكاش موقّف من السيرفر (CACHE_ENABLED=false): الإعدادات هون بتنحفظ بس ما بتنطبّق لحتى تشيل هالمتغيّر.
          </div>
        ) : null}
      </div>

      <div className="sm:max-w-xl">
        <Segmented
          value={tab}
          disabled={false}
          onChange={(v) => {
            setTab(v);
            try {
              window.history.replaceState(null, "", v === "cache" ? window.location.pathname : `#${v}`);
            } catch {
              /* ignore */
            }
          }}
          options={[
            { value: "cache", label: "الكاش" },
            { value: "popular", label: "الشعبية والتجهيز المسبق" },
            { value: "motion", label: "الحركة والتحميل" },
          ]}
        />
      </div>

      {tab === "motion" ? (
        <MotionPanel
          draft={motionDraft}
          defaults={d.storefrontDefaults}
          limits={d.motionLimits}
          fpsChoices={d.fpsChoices}
          sections={d.motionSections}
          bad={bad}
          canWrite={canWrite}
          dirty={motionDirty}
          onChange={(field, value) => setMotionDraft((prev) => (prev ? { ...prev, [field]: value } : prev))}
          onSection={(name, field, value) =>
            setMotionDraft((prev) => (prev ? { ...prev, sections: { ...prev.sections, [name]: { ...prev.sections[name], [field]: value } } } : prev))
          }
        />
      ) : tab === "popular" ? (
        <PopularityPanel
          draft={draft.popularity}
          defaults={d.defaults.popularity}
          limits={d.limits}
          bad={bad}
          canWrite={canWrite}
          productTtlSeconds={draft.namespaces.products.ttlSeconds}
          live={live}
          onChange={(field, value) => setDraft((prev) => (prev ? { ...prev, popularity: { ...prev.popularity, [field]: value } } : prev))}
        />
      ) : (
        <>
          <LiveCard live={live} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className={box}>
              <h2 className="font-semibold">الإعدادات العامة</h2>
              <p className="mt-1 text-xs text-white/60">الذاكرة لكل الكاش على السيرفر، وبتنقسم على الأنواع حسب الحصّة تبع كل واحد.</p>
              <div className="mt-4 space-y-4">
                <Toggle
                  label="الكاش شغّال"
                  help="إذا طفيته، كل طلب بيروح لقاعدة البيانات (أبطأ، بس مفيد لو بدك تتأكد من مشكلة)."
                  checked={draft.enabled}
                  disabled={!canWrite}
                  onChange={(v) => setDraft({ ...draft, enabled: v })}
                />
                <NumberInput
                  id="cache-memoryMb"
                  label="الذاكرة"
                  unit="MB"
                  help="64 MB بتكفي آلاف المنتجات. لما تمتلي، قاعدة الإخراج بتقرر شو يطلع."
                  value={draft.memoryMb}
                  def={d.defaults.memoryMb}
                  limits={d.limits.memoryMb}
                  invalid={bad.includes("memoryMb")}
                  disabled={!canWrite}
                  onChange={(v) => setDraft({ ...draft, memoryMb: v })}
                />
                <Toggle
                  label="استخدم Redis كمان (طبقة تانية)"
                  help="الجواب بينحفظ بـ Redis كمان: بيتشارك بين السيرفرات وبيضل بعد إعادة التشغيل. بدها REDIS_URL."
                  checked={draft.useRedis}
                  disabled={!canWrite}
                  onChange={(v) => setDraft({ ...draft, useRedis: v })}
                />
              </div>
            </section>

            <section className={box}>
              <h2 className="font-semibold">قواعد الإخراج (لما الذاكرة تمتلي)</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {(Object.keys(POLICY_TEXT) as CachePolicy[]).map((p) => (
                  <li key={p}>
                    <span className="font-medium" dir="ltr">
                      {POLICY_TEXT[p].label}
                    </span>
                    {p === "smart" ? <span className="text-xs text-white/50"> (الافتراضي)</span> : null}
                    <span className="block text-xs text-white/60">{POLICY_TEXT[p].hint}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/50">
                «مدة الصلاحية» هي أقصى مدة. التعديلات بتفضّي الكاش قبلها، وبداية ونهاية العروض كمان. «النسخة القديمة» يعني لما تخلص المدة، طلب واحد بيبني نسخة
                جديدة والباقي بياخدوا القديمة فوراً بدل ما يستنوا.
              </p>
            </section>
          </div>

          <section className={box} data-testid="cache-namespaces">
            <h2 className="font-semibold">أنواع الكاش</h2>
            <p className="mt-1 text-xs text-white/60">كل نوع إله ذاكرته وقاعدته ومدته. الأرقام من وقت ما اشتغل السيرفر، وبتتحدّث كل 5 ثواني.</p>
            <div className="mt-4 grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
              {live.namespaces.map((n) => (
                <NamespaceCard
                  key={n.name}
                  live={n}
                  config={draft.namespaces[n.name]}
                  defaults={d.defaults.namespaces[n.name]}
                  limits={d.limits}
                  plannedBytes={plan[n.name]}
                  bad={bad}
                  canWrite={canWrite}
                  onChange={(field, value) => setNs(n.name, field, value)}
                  onPurge={() => setConfirm({ kind: "purge", ns: n.name })}
                />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopKeysCard live={live} />
            <section className={box}>
              <h2 className="font-semibold">متى بيتغيّر الكاش لحاله</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <span className="text-white/60">بداية أو نهاية العرض الجاي: </span>
                  {live.nextChange.catalog ? (
                    <span>{new Date(live.nextChange.catalog).toLocaleString(loc("ar"))}</span>
                  ) : (
                    <span className="text-white/50">ما في</span>
                  )}
                </li>
                <li>
                  <span className="text-white/60">نشر أو إخفاء الصفحة الجاية: </span>
                  {live.nextChange.cms ? <span>{new Date(live.nextChange.cms).toLocaleString(loc("ar"))}</span> : <span className="text-white/50">ما في</span>}
                </li>
              </ul>
              <h3 className="mt-4 text-sm font-medium">آخر تعديل فضّى الكاش</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {(Object.keys(GROUP_TEXT) as Array<keyof typeof GROUP_TEXT>).map((g) => (
                  <li key={g} className="flex justify-between gap-2">
                    <span className="text-white/60">{GROUP_TEXT[g]}</span>
                    <span>{live.lastWriteAt[g] ? relativeTime(live.lastWriteAt[g]!) : "ما في من وقت ما اشتغل"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/50">رجّعت نسخة احتياطية من الكمبيوتر؟ اكبس «فضّي كل الكاش» فوق، لأنه السيرفر ما بيشوف الاسترجاع.</p>
            </section>
          </div>
        </>
      )}

      <section className={box}>
        <h2 className="font-semibold">سجل التغييرات</h2>
        <p className="mt-1 text-xs text-white/60">قبل كل تغيير منحفظ الإعدادات زي ما كانت (آخر 30). الاسترجاع كمان بينحفظ، فبتقدر ترجع عنه.</p>
        {d.revisions.length ? (
          <ol className="mt-3 divide-y divide-white/10 text-sm">
            {d.revisions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  تغيّر بعدها: {describeChanged(r.changed)}
                  <span className="block text-xs text-white/50">
                    {relativeTime(r.createdAt)}
                    {r.adminName ? ` · ${r.adminName}` : ""}
                  </span>
                </span>
                {canWrite ? (
                  <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "restore", rev: r })}>
                    رجوع لهون
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-white/60">ما في تغييرات بعد.</p>
        )}
        {canWrite ? (
          <div className="mt-4">
            <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: "reset" })}>
              رجوع للإعدادات الافتراضية
            </Button>
          </div>
        ) : null}
      </section>

      {canWrite && dirty ? (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 sm:bottom-4 lg:start-72" data-testid="cache-save-bar">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--surface,#fff)] p-3 shadow-xl">
            <span className="text-sm">
              {bad.length ? (
                <span className="text-red-300">في قيم برّا الحد المسموح: {describeChanged(bad)}</span>
              ) : (
                <>تغييرات مش محفوظة: {describeChanged(pendingPaths())}</>
              )}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(d.config);
                  setMotionDraft(d.storefront);
                }}
              >
                تراجع
              </Button>
              <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={bad.length > 0}>
                حفظ
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.kind === "purge"
            ? confirm.ns
              ? `تفضية «${NAMESPACE_TEXT[confirm.ns].label}»`
              : "تفضية كل الكاش"
            : confirm?.kind === "reset"
              ? "رجوع للافتراضي"
              : "استرجاع الإعدادات"
        }
        message={
          confirm?.kind === "purge"
            ? "الأجوبة المحفوظة بتنمسح على كل السيرفرات، وصفحات المتجر بتتحدّث. أول زيارات بعدها أبطأ شوي لحتى ينبني الكاش من جديد."
            : confirm?.kind === "reset"
              ? "كل إعدادات هالصفحة (الكاش والشعبية والحركة) بترجع للافتراضي. النسخة الحالية بتنحفظ بالسجل."
              : confirm
                ? `الإعدادات بترجع زي ما كانت ${relativeTime(confirm.rev.createdAt)}. النسخة الحالية بتنحفظ بالسجل.`
                : ""
        }
        confirmText={confirm?.kind === "purge" ? "فضّي" : confirm?.kind === "reset" ? "رجوع للافتراضي" : "استرجاع"}
        variant="warning"
        isLoading={purge.isPending || reset.isPending || restore.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "purge") purge.mutate(confirm.ns);
          else if (confirm.kind === "reset") reset.mutate();
          else restore.mutate(confirm.rev.id);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

/* ---------------- Live numbers ---------------- */

function LiveCard({ live }: { live: CacheLive }) {
  const used = live.memory.limitBytes ? live.memory.usedBytes / live.memory.limitBytes : 0;
  return (
    <section className={box} data-testid="cache-live">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="من الكاش" value={ratioText(live.totals.hitRatio)} note={`${live.totals.hits.toLocaleString("en")} طلب`} testId="cache-hit-ratio" />
        <Stat label="من قاعدة البيانات" value={live.totals.misses.toLocaleString("en")} note="طلب انبنى من جديد" />
        <Stat label="وقت موفّر" value={savedText(live.totals.savedMs)} note="على قاعدة البيانات" />
        <Stat label="محفوظ هلّق" value={live.totals.entries.toLocaleString("en")} note={`جواب · ${formatBytes(live.memory.usedBytes)}`} />
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-white/60">
          <span>الذاكرة</span>
          <span dir="ltr">
            {formatBytes(live.memory.usedBytes)} / {formatBytes(live.memory.limitBytes)}
          </span>
        </div>
        <Bar value={used} />
      </div>
      <div className="mt-4">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-white/60">
          <span>آخر ساعة (كل عمود دقيقة)</span>
          <span className="flex gap-3">
            <span className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-sm bg-emerald-400/80" /> من الكاش
            </span>
            <span className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-sm bg-amber-400/80" /> من قاعدة البيانات
            </span>
          </span>
        </div>
        <History history={live.history} now={live.now} />
      </div>
    </section>
  );
}

function History({ history, now }: { history: CacheLive["history"]; now: number }) {
  const end = Math.floor(now / 60_000) * 60_000;
  const byMinute = new Map(history.map((m) => [m.t, m]));
  const minutes = Array.from({ length: 60 }, (_, i) => byMinute.get(end - (59 - i) * 60_000) ?? { t: end - (59 - i) * 60_000, hits: 0, misses: 0 });
  const max = Math.max(1, ...minutes.map((m) => m.hits + m.misses));
  return (
    <svg viewBox="0 0 600 60" className="mt-2 h-16 w-full" preserveAspectRatio="none" role="img" aria-label="الطلبات بآخر ساعة">
      {minutes.map((m, i) => {
        const hh = (m.hits / max) * 58;
        const mh = (m.misses / max) * 58;
        // Right to left like the page: the newest minute is on the left.
        const x = (59 - i) * 10 + 1;
        return (
          <g key={m.t}>
            <rect x={x} y={60 - hh} width={8} height={hh} className="fill-emerald-400/80" />
            <rect x={x} y={60 - hh - mh} width={8} height={mh} className="fill-amber-400/80" />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- One namespace ---------------- */

function NamespaceCard({
  live,
  config,
  defaults,
  limits,
  plannedBytes,
  bad,
  canWrite,
  onChange,
  onPurge,
}: {
  live: CacheNamespaceLive;
  config: CacheConfig["namespaces"][CacheNamespaceName];
  defaults: CacheConfig["namespaces"][CacheNamespaceName];
  limits: CacheLimits;
  plannedBytes: number;
  bad: string[];
  canWrite: boolean;
  onChange: (field: keyof CacheConfig["namespaces"][CacheNamespaceName], value: unknown) => void;
  onPurge: () => void;
}) {
  const text = NAMESPACE_TEXT[live.name];
  const path = (f: string) => `namespaces.${live.name}.${f}`;
  const served = live.hits + live.staleHits;
  const hasBad = bad.some((b) => b.startsWith(`namespaces.${live.name}.`));
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid={`cache-ns-${live.name}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{text.label}</h3>
            {!live.on ? <Badge size="sm">متوقف</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-white/50">{text.note}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tabular-nums">{ratioText(live.hitRatio)}</span>
          {canWrite ? (
            <Button size="xs" variant="ghost" onClick={onPurge} disabled={!live.entries}>
              فضّي
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-white/50">من الكاش</dt>
          <dd className="tabular-nums">
            {served.toLocaleString("en")}
            {live.l2Hits ? <span className="text-white/50"> ({live.l2Hits} Redis)</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-white/50">انبنى</dt>
          <dd className="tabular-nums">{live.misses.toLocaleString("en")}</dd>
        </div>
        <div>
          <dt className="text-white/50">بناء الجواب</dt>
          <dd className="tabular-nums">{live.loads ? `${live.avgLoadMs} ms` : "—"}</dd>
        </div>
        <div>
          <dt className="text-white/50">محفوظ</dt>
          <dd className="tabular-nums">
            {live.entries.toLocaleString("en")}
            {live.policy === "smart" && live.protectedEntries ? <span className="text-white/50"> ({live.protectedEntries} محمي)</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-white/50">طلع لأنه امتلى</dt>
          <dd className="tabular-nums">{live.evictions.size.toLocaleString("en")}</dd>
        </div>
        <div>
          <dt className="text-white/50">انمسح بتعديل</dt>
          <dd className="tabular-nums">{live.evictions.invalidated.toLocaleString("en")}</dd>
        </div>
      </dl>
      <div className="mt-2">
        <div className="flex justify-between text-[11px] text-white/50">
          <span>الذاكرة</span>
          <span dir="ltr">
            {formatBytes(live.bytes)} / {formatBytes(plannedBytes)}
          </span>
        </div>
        <Bar value={plannedBytes ? live.bytes / plannedBytes : 0} />
      </div>

      <details className="group mt-3 border-t border-white/10 pt-3" open={hasBad || undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm [&::-webkit-details-marker]:hidden">
          <span className="font-medium">الإعدادات</span>
          <span className="flex items-center gap-2 text-xs text-white/60">
            {config.enabled ? `${durationText(config.ttlSeconds)} · ${POLICY_TEXT[config.policy].label} · ${formatBytes(plannedBytes)}` : "متوقف"}
            <span className="transition group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </span>
        </summary>
        <div className="mt-3 space-y-3">
          <Toggle label="شغّال" checked={config.enabled} disabled={!canWrite} onChange={(v) => onChange("enabled", v)} />
          <div>
            <span className="text-sm font-medium">قاعدة الإخراج</span>
            <Segmented
              value={config.policy}
              disabled={!canWrite}
              onChange={(v) => onChange("policy", v)}
              options={(Object.keys(POLICY_TEXT) as CachePolicy[]).map((p) => ({ value: p, label: POLICY_TEXT[p].label }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput
              id={`cache-${live.name}-ttl`}
              label="مدة الصلاحية (TTL)"
              unit="ثانية"
              hint={durationText}
              value={config.ttlSeconds}
              def={defaults.ttlSeconds}
              limits={limits.ttlSeconds}
              invalid={bad.includes(path("ttlSeconds"))}
              disabled={!canWrite}
              onChange={(v) => onChange("ttlSeconds", v)}
            />
            <NumberInput
              id={`cache-${live.name}-stale`}
              label="النسخة القديمة وقت التحديث"
              unit="ثانية"
              hint={durationText}
              value={config.staleSeconds}
              def={defaults.staleSeconds}
              limits={limits.staleSeconds}
              invalid={bad.includes(path("staleSeconds"))}
              disabled={!canWrite}
              onChange={(v) => onChange("staleSeconds", v)}
            />
            <NumberInput
              id={`cache-${live.name}-share`}
              label="حصّة الذاكرة"
              unit=""
              hint={() => formatBytes(plannedBytes)}
              value={config.share}
              def={defaults.share}
              limits={limits.share}
              invalid={bad.includes(path("share"))}
              disabled={!canWrite}
              onChange={(v) => onChange("share", v)}
            />
            <NumberInput
              id={`cache-${live.name}-browser`}
              label="بمتصفح الزبون"
              unit="ثانية"
              help="0 = لأ. أكثر من 0 يعني التعديلات ممكن تتأخر هالمدة عند اللي فاتح."
              hint={durationText}
              value={config.browserSeconds}
              def={defaults.browserSeconds}
              limits={limits.browserSeconds}
              invalid={bad.includes(path("browserSeconds"))}
              disabled={!canWrite}
              onChange={(v) => onChange("browserSeconds", v)}
            />
          </div>
        </div>
      </details>
    </div>
  );
}

/* ---------------- Busiest answers ---------------- */

function TopKeysCard({ live }: { live: CacheLive }) {
  return (
    <section className={box} data-testid="cache-top">
      <h2 className="font-semibold">الأكثر طلباً من الكاش</h2>
      <p className="mt-1 text-xs text-white/60">الأجوبة المحفوظة هلّق، الأكثر استخداماً أول.</p>
      {live.top.length ? (
        <ol className="mt-3 divide-y divide-white/10 text-sm">
          {live.top.map((t) => (
            <li key={`${t.ns}|${t.key}`} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs" dir="ltr" style={{ textAlign: "right" }} title={t.key}>
                  {shortKey(t.key)}
                </span>
                <span className="block text-[11px] text-white/50">
                  {NAMESPACE_TEXT[t.ns]?.label ?? t.ns} · {formatBytes(t.bytes)}
                  {t.freshForSeconds != null ? ` · صالح ${durationText(t.freshForSeconds) || "لثواني"}` : ""}
                  {t.status === 404 ? " · مش موجود" : ""}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{t.hits.toLocaleString("en")}×</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-white/60">لسا ما في شي انطلب من الكاش.</p>
      )}
    </section>
  );
}
