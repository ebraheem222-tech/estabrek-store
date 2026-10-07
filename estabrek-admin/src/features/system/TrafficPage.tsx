// حماية الضغط والصيانة: maintenance mode, the traffic-pressure model (e^-x),
// who is pressing on the server right now, and IPs blocked by hand.
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { env } from "../../config/env";
import * as SystemAPI from "../../api/system.api";
import * as FeaturesAPI from "../../api/features.api";
import { getSettings, updateSettings } from "../../api/settings.api";
import type { PressureSettings, TrafficClient, TrafficView } from "../../api/system.api";
import { describeDevice } from "../team/teamText";
import { humanMinutes, parseIpLines, ipLines } from "./policyText";
import {
  MODE_TEXT,
  STATUS_TEXT,
  humanSeconds,
  percent,
  pressureOf,
  previewUrl,
  secondsToBlock,
  steadyPressure,
  untilText,
} from "./trafficText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

export default function TrafficPage() {
  const { hasPermission } = useAuth();
  return (
    <div dir="rtl" className="space-y-4" data-testid="traffic-page">
      {hasPermission("settings:read") ? <MaintenanceCard /> : null}
      <PressureCard />
      <LiveCard />
      <BlocksCard />
    </div>
  );
}

/* ---------------- Maintenance ---------------- */

function MaintenanceCard() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canChange = hasPermission("settings:write");
  const q = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const s = q.data;
  const [confirmOn, setConfirmOn] = useState(false);

  const toggle = useMutation({
    mutationFn: (on: boolean) => FeaturesAPI.setFeature("maintenance", on),
    onSuccess: (out) => {
      toast.success(out.enabled ? "اشتغل وضع الصيانة" : "رجع المتجر يشتغل للكل");
      setConfirmOn(false);
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["features"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  if (!s) return null;
  const on = s.maintenanceMode === true;
  const link = s.maintenanceKey ? previewUrl(env.VITE_STOREFRONT_BASE_URL, s.maintenanceKey) : null;

  return (
    <section className={box} data-testid="maintenance-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold">وضع الصيانة</h1>
            {on ? (
              <Badge size="sm" variant="warning" dot>
                شغّال: الموقع مسكّر للزوار
              </Badge>
            ) : (
              <Badge size="sm" dot>
                مطفي
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-white/60">
            وقت تحديث كبير أو مشكلة: الزوار بيشوفوا شاشة «راجعين قريباً» مع رسالتك وزر واتساب، والطلبات بتوقف. الأدمن بيضل شغّال، وإنتَ بتشوف الموقع برابط المعاينة.
          </p>
        </div>
        {canChange ? (
          <div className="shrink-0">
            {on ? (
              <Button variant="primary" className="whitespace-nowrap" onClick={() => toggle.mutate(false)} isLoading={toggle.isPending}>
                فتح الموقع للكل
              </Button>
            ) : (
              <Button variant="secondary" className="whitespace-nowrap" onClick={() => setConfirmOn(true)} isLoading={toggle.isPending}>
                تشغيل الصيانة
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <MessageEditor key={s.maintenanceMessage ?? ""} saved={s.maintenanceMessage ?? ""} canChange={canChange} />
        <div>
          <div className="text-sm font-medium">رابط المعاينة</div>
          {link ? (
            <>
              <p className="mt-1 text-xs text-white/50">افتحه وإنتَ بوضع الصيانة لتشوف الموقع. الطلبات بتضل موقّفة حتى بالمعاينة. لا تشاركه.</p>
              <div className="mt-2 flex gap-2">
                <input readOnly dir="ltr" value={link} className={`${field} min-w-0 flex-1`} onFocus={(e) => e.currentTarget.select()} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success("انسخ الرابط"), () => undefined)}
                >
                  نسخ
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-white/50">بيطلع هون أول مرة بتشغّل فيها الصيانة.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOn}
        title="تشغيل وضع الصيانة"
        message="الزوار رح يشوفوا شاشة «راجعين قريباً» والطلبات رح توقف لحتى تطفيه. الأدمن بيضل شغّال."
        confirmText="تشغيل"
        isLoading={toggle.isPending}
        onConfirm={() => toggle.mutate(true)}
        onCancel={() => setConfirmOn(false)}
      />
    </section>
  );
}

function MessageEditor({ saved, canChange }: { saved: string; canChange: boolean }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState(saved);
  const save = useMutation({
    mutationFn: () => updateSettings({ maintenanceMessage: message.trim() || null }),
    onSuccess: () => {
      toast.success("انحفظت الرسالة");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  return (
    <div>
      <label htmlFor="maint-msg" className="block text-sm font-medium">
        الرسالة للزوار
      </label>
      <textarea
        id="maint-msg"
        rows={3}
        maxLength={400}
        value={message}
        disabled={!canChange}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="منحدّث المتجر وراجعين خلال ساعة. لأي سؤال راسلونا على واتساب."
        className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm"
      />
      {canChange ? (
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => save.mutate()} isLoading={save.isPending} disabled={saved === message}>
          حفظ الرسالة
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------- The model ---------------- */

const NUMBERS: Array<{ key: keyof PressureSettings; label: string; unit: string; help: string }> = [
  { key: "capacity", label: "سعة التحمّل", unit: "نقطة", help: "قديش «ضغط» بيتحمّل الـ IP. أكبر = أصبر." },
  { key: "halfLifeSeconds", label: "سرعة الهدوء", unit: "ثانية", help: "الضغط بينزل للنص كل هالمدة إذا وقف." },
  { key: "slowAt", label: "بداية التبطيء", unit: "%", help: "من هون الردود بتبطأ لحد ثانيتين." },
  { key: "blockAt", label: "حد الحظر", unit: "%", help: "هون بينحظر مؤقتاً." },
  { key: "blockMinutes", label: "مدة الحظر الأولى", unit: "دقيقة", help: "وبتتضاعف كل مرة بيرجع." },
  { key: "maxBlockHours", label: "أقصى مدة حظر", unit: "ساعة", help: "سقف التضاعف." },
  { key: "weightRead", label: "فتح صفحة", unit: "نقطة", help: "طلب قراءة عادي." },
  { key: "weightWrite", label: "تعديل أو طلب", unit: "نقاط", help: "طلب شراء، تسجيل…" },
  { key: "weightAuth", label: "محاولة دخول", unit: "نقاط", help: "دخول، كود، تنبيه توفّر." },
  { key: "weightFail", label: "طلب فاشل", unit: "نقاط", help: "دخول غلط، صفحة مش موجودة (بوتات بتفتّش)." },
];

function PressureCard() {
  const q = useQuery({ queryKey: ["system", "security"], queryFn: SystemAPI.getSecurityPolicy });
  if (q.isError) return <section className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</section>;
  if (!q.data) {
    return (
      <section className={`${box} flex items-center gap-2 text-sm`}>
        <Spinner /> جاري التحميل…
      </section>
    );
  }
  const saved = q.data.policy.pressure;
  return <PressureEditor key={JSON.stringify(saved)} saved={saved} limits={q.data.limits} />;
}

function PressureEditor({ saved, limits }: { saved: PressureSettings; limits: SystemAPI.PolicyLimits }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canChange = hasPermission("system:write");
  const [draft, setDraft] = useState<PressureSettings>(saved);
  const [allowText, setAllowText] = useState(ipLines(saved.allow));

  const next = useMemo(() => ({ ...draft, allow: parseIpLines(allowText) }), [draft, allowText]);
  const dirty = JSON.stringify(next) !== JSON.stringify(saved);
  const bad = useMemo(() => {
    const out: string[] = [];
    for (const n of NUMBERS) {
      const lim = limits[`pressure.${n.key}`];
      const v = next[n.key] as number;
      if (!lim || !Number.isInteger(v) || v < lim.min || v > lim.max) out.push(n.key);
    }
    if (next.slowAt >= next.blockAt) out.push("slowAt");
    return out;
  }, [next, limits]);

  const save = useMutation({
    mutationFn: () => SystemAPI.saveSecurityPolicy({ pressure: next }),
    onSuccess: () => {
      toast.success("انحفظت إعدادات الحماية");
      qc.invalidateQueries({ queryKey: ["system"] });
      qc.invalidateQueries({ queryKey: ["traffic"] });
    },
    onError: (e) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) }),
  });

  const set = (k: keyof PressureSettings, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const ex = examples(draft);

  return (
    <section className={box} data-testid="pressure-card">
      <h2 className="font-semibold">حماية الضغط</h2>
      <p className="mt-1 text-sm text-white/60">
        كل IP إله «ضغط» بين 0 و100%. كل طلب بيزيده، وبيهدى لحاله مع الوقت (بينزل للنص كل {draft.halfLifeSeconds} ثانية). الزبونة العادية بتضل تحت، والبوت اللي بيضرب السيرفر بيطلع لفوق وبينحظر. الأدمن المسجّل ما بينحسب.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="وضع الحماية">
        {(Object.keys(MODE_TEXT) as Array<PressureSettings["mode"]>).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={draft.mode === m}
            disabled={!canChange}
            onClick={() => set("mode", m)}
            className={`rounded-xl border px-4 py-2 text-sm ${draft.mode === m ? "border-[var(--btn-solid-border)] bg-[var(--btn-solid-bg)] text-[var(--btn-solid-text)]" : "border-white/10 bg-white/[0.03]"} disabled:opacity-60`}
          >
            {MODE_TEXT[m].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/60">{MODE_TEXT[draft.mode].hint}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {NUMBERS.map((n) => {
            const lim = limits[`pressure.${n.key}`];
            const v = draft[n.key] as number;
            const invalid = bad.includes(n.key);
            return (
              <div key={n.key}>
                <label htmlFor={`p-${n.key}`} className="block text-sm font-medium">
                  {n.label}
                </label>
                <p className="mt-0.5 text-xs text-white/50">{n.help}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id={`p-${n.key}`}
                    type="number"
                    inputMode="numeric"
                    dir="ltr"
                    min={lim?.min}
                    max={lim?.max}
                    value={Number.isFinite(v) ? v : ""}
                    disabled={!canChange}
                    onChange={(e) => set(n.key, e.target.value === "" ? NaN : Math.round(Number(e.target.value)))}
                    className={`${field} w-24 ${invalid ? "border-red-500/60" : ""}`}
                  />
                  <span className="text-sm text-white/60">{n.unit}</span>
                </div>
                {lim ? <p className={`mt-1 text-xs ${invalid ? "text-red-300" : "text-white/40"}`}>{`من ${lim.min} لـ ${lim.max}`}</p> : null}
              </div>
            );
          })}
          <div className="sm:col-span-2">
            <label htmlFor="p-allow" className="block text-sm font-medium">
              IPs ما بتنحسب أبداً
            </label>
            <p className="mt-0.5 text-xs text-white/50">مثلاً مكتبك أو سيرفر تاني بيحكي مع المتجر. IP أو نطاق بكل سطر.</p>
            <textarea
              id="p-allow"
              rows={2}
              dir="ltr"
              disabled={!canChange}
              value={allowText}
              onChange={(e) => setAllowText(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <PressureCurve s={draft} />
          <ul className="space-y-1.5 text-xs text-white/70" data-testid="pressure-examples">
            {ex.map((e) => (
              <li key={e.label}>
                <span className="font-medium text-white/90">{e.label}:</span> {e.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {canChange ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={!dirty || bad.length > 0}>
            حفظ
          </Button>
          {dirty ? (
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(saved);
                setAllowText(ipLines(saved.allow));
              }}
            >
              تراجع
            </Button>
          ) : null}
          {bad.includes("slowAt") ? <span className="text-xs text-red-300">بداية التبطيء لازم تكون أقل من حد الحظر.</span> : null}
        </div>
      ) : null}
    </section>
  );
}

/** What the numbers mean in practice. */
function examples(s: PressureSettings) {
  const valid = [s.capacity, s.halfLifeSeconds, s.blockAt, s.weightRead, s.weightAuth, s.weightFail].every((v) => Number.isFinite(v) && v > 0);
  if (!valid) return [];
  const shopper = steadyPressure(0.5, s.weightRead, s);
  return [
    { label: "زبونة بتتصفح (طلب كل ثانيتين)", text: `بتضل على ${percent(shopper)} تقريباً` },
    { label: "بوت (10 طلبات بالثانية)", text: `بينحظر بعد ${humanSeconds(secondsToBlock(10, s.weightRead, s))}` },
    { label: "تخمين كلمة سر (محاولة بالثانية)", text: `بينحظر بعد ${humanSeconds(secondsToBlock(1, s.weightAuth + s.weightFail, s))}` },
    { label: "مدد الحظر لما يرجع", text: [0, 1, 2, 3].map((k) => humanMinutes(Math.min(s.blockMinutes * 2 ** k, s.maxBlockHours * 60))).join(" ← ") },
  ];
}

/** pressure = 1 − e^(−score/capacity), with the slow and block lines. */
function PressureCurve({ s }: { s: PressureSettings }) {
  const W = 320;
  const H = 150;
  const pad = 24;
  const ok = Number.isFinite(s.capacity) && s.capacity > 0;
  const maxScore = (ok ? s.capacity : 200) * 4;
  const x = (score: number) => pad + (score / maxScore) * (W - pad * 2);
  const y = (p: number) => H - pad - p * (H - pad * 2);
  const points = Array.from({ length: 61 }, (_, i) => {
    const score = (i / 60) * maxScore;
    return `${x(score).toFixed(1)},${y(pressureOf(score, ok ? s.capacity : 200)).toFixed(1)}`;
  }).join(" ");
  const line = (p: number, cls: string, label: string) =>
    Number.isFinite(p) ? (
      <g>
        <line x1={pad} x2={W - pad} y1={y(p)} y2={y(p)} className={cls} strokeDasharray="4 4" strokeWidth={1} />
        <text x={W - pad} y={y(p) - 4} textAnchor="end" className="fill-current text-[10px] opacity-70">
          {label}
        </text>
      </g>
    ) : null;
  return (
    <figure className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <svg style={{ direction: "ltr" }} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="منحنى الضغط حسب النقاط">
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} className="stroke-current opacity-30" />
        <line x1={pad} x2={pad} y1={pad} y2={H - pad} className="stroke-current opacity-30" />
        {line(s.slowAt / 100, "stroke-amber-400", `${s.slowAt}%`)}
        {line(s.blockAt / 100, "stroke-red-400", `${s.blockAt}%`)}
        <polyline points={points} fill="none" className="stroke-current" strokeWidth={2} />
        <text x={pad} y={H - 6} className="fill-current text-[10px] opacity-60">
          0
        </text>
        <text x={W - pad} y={H - 6} textAnchor="end" className="fill-current text-[10px] opacity-60">
          {Math.round(maxScore)}
        </text>
      </svg>
      <figcaption className="space-y-0.5 px-1 text-[11px] text-white/50">
        <div>الضغط (لفوق) حسب النقاط (لليمين): الضغط = 1 − e^(−النقاط ÷ السعة)</div>
        <div>
          <span className="text-amber-300">- - -</span> بداية التبطيء · <span className="text-red-300">- - -</span> حد الحظر
        </div>
      </figcaption>
    </figure>
  );
}

/* ---------------- Live ---------------- */

function LiveCard() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const q = useQuery({ queryKey: ["traffic"], queryFn: SystemAPI.getTraffic, refetchInterval: 10_000 });
  const [blockFor, setBlockFor] = useState<TrafficClient | null>(null);
  const forgive = useMutation({
    mutationFn: (ip: string) => SystemAPI.forgiveIp(ip),
    onSuccess: () => {
      toast.success("انمسح ضغطه");
      qc.invalidateQueries({ queryKey: ["traffic"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const d = q.data;

  return (
    <section className={box} data-testid="traffic-live">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">مين بيضغط هلّق</h2>
          <p className="mt-1 text-xs text-white/50">بتتحدّث كل 10 ثواني. الأعلى ضغطاً أول.</p>
        </div>
        {d ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge size="sm">{`${d.tracked} IP`}</Badge>
            {d.counts.blocked ? <Badge size="sm" variant="danger">{`${d.counts.blocked} محظور`}</Badge> : null}
            {d.counts.wouldBlock ? <Badge size="sm" variant="warning">{`${d.counts.wouldBlock} كان رح ينحظر`}</Badge> : null}
            {d.counts.slowed ? <Badge size="sm" variant="warning">{`${d.counts.slowed} بتبطّأ`}</Badge> : null}
          </div>
        ) : null}
      </div>
      {q.isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Spinner /> جاري التحميل…
        </div>
      ) : q.isError ? (
        <div className="mt-3 text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
      ) : d && d.clients.length ? (
        <ul className="mt-3 divide-y divide-white/10" data-testid="traffic-clients">
          {d.clients.slice(0, 50).map((c) => (
            <li key={c.ip} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm" dir="ltr">
                    {c.ip}
                  </span>
                  {c.ip === d.yourIp ? <Badge size="sm">إنتَ</Badge> : null}
                  {c.status !== "ok" ? (
                    <Badge size="sm" variant={STATUS_TEXT[c.status].variant}>
                      {STATUS_TEXT[c.status].label}
                      {c.blockedUntil ? ` · ${untilText(c.blockedUntil, d.now)}` : ""}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <PressureBar p={c.pressure} s={d.settings} />
                  <span className="w-10 text-xs tabular-nums">{percent(c.pressure)}</span>
                </div>
                <div className="mt-1 truncate text-xs text-white/50" dir="ltr" style={{ textAlign: "right" }}>
                  {`${c.lastMethod} ${c.lastPath}`}
                </div>
                <div className="text-xs text-white/50">
                  {`${c.hits} طلب · ${describeDevice(c.userAgent)}`}
                  {c.strikes ? ` · انحظر ${c.strikes} مرة` : ""}
                </div>
              </div>
              {canWrite && c.ip !== d.yourIp ? (
                <div className="flex shrink-0 gap-2">
                  {c.pressure > 0.05 || c.status !== "ok" ? (
                    <Button size="sm" variant="ghost" onClick={() => forgive.mutate(c.ip)} isLoading={forgive.isPending && forgive.variables === c.ip}>
                      مسح الضغط
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" onClick={() => setBlockFor(c)}>
                    حظر
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/60">
          {d?.settings.mode === "off" ? "الحماية مطفية، فما في أرقام." : "هادي هلّق. ما في حدا بيضغط."}
        </p>
      )}
      <BlockDialog client={blockFor} onClose={() => setBlockFor(null)} />
    </section>
  );
}

function PressureBar({ p, s }: { p: number; s: PressureSettings }) {
  const color = p >= s.blockAt / 100 ? "bg-red-400" : p >= s.slowAt / 100 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="h-2 w-full max-w-[260px] overflow-hidden rounded-full bg-white/10" aria-hidden>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, Math.round(p * 100))}%` }} />
    </div>
  );
}

const DURATIONS: Array<{ label: string; minutes: number | null }> = [
  { label: "ساعة", minutes: 60 },
  { label: "يوم", minutes: 60 * 24 },
  { label: "أسبوع", minutes: 60 * 24 * 7 },
  { label: "دائم (لحتى تفكّه)", minutes: null },
];

function BlockDialog({ client, onClose }: { client: TrafficClient | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [minutes, setMinutes] = useState<number | null>(60);
  const block = useMutation({
    mutationFn: () => SystemAPI.blockIp({ ip: client!.ip, minutes, reason: `ضغط ${percent(client!.pressure)} · ${client!.lastPath}`.slice(0, 200) }),
    onSuccess: () => {
      toast.success("انحظر");
      qc.invalidateQueries({ queryKey: ["traffic"] });
      onClose();
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  return (
    <Modal
      open={!!client}
      title={`حظر ${client?.ip ?? ""}`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => block.mutate()} isLoading={block.isPending}>
            حظر
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-3 text-sm">
          <p>هالـ IP ما رح يقدر يفتح الموقع ولا يحكي مع السيرفر طول المدة.</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="المدة">
            {DURATIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={minutes === o.minutes}
                onClick={() => setMinutes(o.minutes)}
                className={`rounded-xl border px-3 py-1.5 text-sm ${minutes === o.minutes ? "border-[var(--btn-solid-border)] bg-[var(--btn-solid-bg)] text-[var(--btn-solid-text)]" : "border-white/10"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
      </div>
    </Modal>
  );
}

/* ---------------- Blocks by hand ---------------- */

function BlocksCard() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const q = useQuery({ queryKey: ["traffic"], queryFn: SystemAPI.getTraffic, refetchInterval: 10_000 });
  const [ip, setIp] = useState("");
  const [minutes, setMinutes] = useState<number | null>(60 * 24);
  const [reason, setReason] = useState("");
  const add = useMutation({
    mutationFn: () => SystemAPI.blockIp({ ip: ip.trim(), minutes, reason: reason.trim() || undefined }),
    onSuccess: () => {
      toast.success("انحظر");
      setIp("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["traffic"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => SystemAPI.unblockIp(id),
    onSuccess: () => {
      toast.success("انفكّ الحظر");
      qc.invalidateQueries({ queryKey: ["traffic"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const d: TrafficView | undefined = q.data;

  return (
    <section className={box} data-testid="traffic-blocks">
      <h2 className="font-semibold">محظورين باليد</h2>
      <p className="mt-1 text-xs text-white/50">بيضلّوا محظورين حتى لو الحماية مطفية. للنطاقات الكبيرة استعمل صفحة «حماية السيرفر».</p>
      {d?.blocks.length ? (
        <ul className="mt-3 divide-y divide-white/10 text-sm">
          {d.blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <span className="font-mono" dir="ltr">
                  {b.ip}
                </span>
                <div className="truncate text-xs text-white/50">
                  {untilText(b.until, d.now)}
                  {b.reason ? ` · ${b.reason}` : ""}
                </div>
              </div>
              {canWrite ? (
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(b.id)} isLoading={remove.isPending && remove.variables === b.id}>
                  فك الحظر
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/60">ما في حدا محظور باليد.</p>
      )}
      {canWrite ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (ip.trim()) add.mutate();
          }}
        >
          <label className="flex-1 text-sm">
            <span className="block font-medium">IP</span>
            <input dir="ltr" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="203.0.113.7" className={`${field} mt-1 w-full`} />
          </label>
          <label className="text-sm">
            <span className="block font-medium">المدة</span>
            <select value={minutes ?? ""} onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : null)} className={`${field} mt-1 w-full sm:w-44`}>
              {DURATIONS.map((o) => (
                <option key={o.label} value={o.minutes ?? ""}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-sm">
            <span className="block font-medium">السبب (اختياري)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className={`${field} mt-1 w-full`} />
          </label>
          <Button type="submit" variant="secondary" isLoading={add.isPending} disabled={!ip.trim()}>
            حظر
          </Button>
        </form>
      ) : null}
    </section>
  );
}
