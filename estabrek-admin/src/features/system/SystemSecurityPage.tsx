// حماية السيرفر: sign-in, sessions, two-step sign-in, codes, request limits and IP lists,
// set from here instead of server environment variables.
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as SystemAPI from "../../api/system.api";
import type { PolicyRevision, SecurityPolicy } from "../../api/system.api";
import { describeDevice, relativeTime } from "../team/teamText";
import { ALERT_TEXT, FIELD_LABELS, changedPaths, describeChanged, humanMinutes, ipLines, outOfRange, parseIpLines, policyPatch } from "./policyText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

export default function SystemSecurityPage() {
  const qc = useQueryClient();
  const { hasPermission, admin } = useAuth();
  const canWrite = hasPermission("system:write");
  const q = useQuery({ queryKey: ["system", "security"], queryFn: SystemAPI.getSecurityPolicy });
  const [draft, setDraft] = useState<SecurityPolicy | null>(null);
  const [ipText, setIpText] = useState({ adminAllow: "", adminBlock: "", siteBlock: "" });
  const [confirm, setConfirm] = useState<{ kind: "reset" } | { kind: "restore"; rev: PolicyRevision } | null>(null);

  // Start editing from the saved rules (and again after each save).
  useEffect(() => {
    if (!q.data) return;
    setDraft(q.data.policy);
    setIpText({
      adminAllow: ipLines(q.data.policy.ip.adminAllow),
      adminBlock: ipLines(q.data.policy.ip.adminBlock),
      siteBlock: ipLines(q.data.policy.ip.siteBlock),
    });
  }, [q.data]);

  const withIps = useMemo<SecurityPolicy | null>(
    () =>
      draft
        ? {
            ...draft,
            ip: { adminAllow: parseIpLines(ipText.adminAllow), adminBlock: parseIpLines(ipText.adminBlock), siteBlock: parseIpLines(ipText.siteBlock) },
          }
        : null,
    [draft, ipText],
  );
  const patch = useMemo(() => (withIps && q.data ? policyPatch(withIps, q.data.policy) : {}), [withIps, q.data]);
  const dirty = Object.keys(patch).length > 0;
  const bad = useMemo(() => (withIps && q.data ? outOfRange(withIps, q.data.limits) : []), [withIps, q.data]);

  const after = (msg: string) => (out: { changed: string[] }) => {
    toast.success(msg, { description: describeChanged(out.changed) });
    setConfirm(null);
    qc.invalidateQueries({ queryKey: ["system", "security"] });
  };
  const onError = (e: unknown) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) });
  const save = useMutation({ mutationFn: () => SystemAPI.saveSecurityPolicy(patch), onSuccess: after("انحفظت قواعد الأمان"), onError });
  const reset = useMutation({ mutationFn: SystemAPI.resetSecurityPolicy, onSuccess: after("رجعت القواعد للافتراضي"), onError });
  const restore = useMutation({ mutationFn: (id: string) => SystemAPI.restoreSecurityPolicy(id), onSuccess: after("رجعت القواعد للنسخة المختارة"), onError });

  if (q.isLoading || !draft || !q.data) {
    return (
      <div dir="rtl" className={box}>
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
  const set = <K extends keyof SecurityPolicy>(section: K, field: keyof SecurityPolicy[K], value: unknown) =>
    setDraft((prev) => (prev ? { ...prev, [section]: { ...prev[section], [field]: value } } : prev));
  const num = (section: keyof SecurityPolicy, field: string) => ({
    path: `${section}.${field}`,
    value: (draft as any)[section][field] as number,
    def: (d.defaults as any)[section][field] as number,
    limits: d.limits[`${section}.${field}`],
    invalid: bad.includes(`${section}.${field}`),
    disabled: !canWrite,
    onChange: (v: number) => set(section as any, field as any, v),
  });

  return (
    <div dir="rtl" className="space-y-4 pb-24" data-testid="system-security">
      <div className={box}>
        <h1 className="text-lg font-semibold">حماية السيرفر</h1>
        <p className="mt-1 text-sm text-white/60">
          قواعد الدخول والجلسات والحماية من الطلبات الكثيرة، بتتغيّر من هون بدون كود وبدون إعادة تشغيل. أي قيمة ما بتغيّرها بتضل على
          إعدادات السيرفر (env).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge size="sm">
            الـ IP تبعك: <span dir="ltr">{d.yourIp || "—"}</span>
          </Badge>
          {d.updatedAt ? <Badge size="sm">آخر تعديل {relativeTime(d.updatedAt)}</Badge> : <Badge size="sm">على الإعدادات الافتراضية</Badge>}
        </div>
        {!d.fromDb ? (
          <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
            السيرفر شغّال على وضع الطوارئ (SECURITY_POLICY_FROM_DB=false): القواعد هون بتنحفظ بس ما بتنطبّق، والمطبّق هو إعدادات env.
          </div>
        ) : null}
        {d.ipLooksLikeProxy ? (
          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            السيرفر شايف IP داخلي ({d.yourIp}) بدل الـ IP الحقيقي. على Railway ضيف المتغيّر <b dir="ltr">TRUST_PROXY=true</b>، وإلا كل الزوار
            بيبيّنوا كأنهم من نفس الـ IP (قوائم IP وتحديد الطلبات ما بتشتغل صح).
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="تسجيل الدخول" note="بعد عدد معيّن من كلمات المرور الغلط، الحساب بينقفل مؤقتاً.">
          <NumberField label={FIELD_LABELS["login.maxFailed"]} unit="محاولات" {...num("login", "maxFailed")} />
          <NumberField
            label={FIELD_LABELS["login.lockMinutes"]}
            unit="دقيقة"
            hint={(v) => humanMinutes(v)}
            {...num("login", "lockMinutes")}
          />
        </Section>

        <Section title="الجلسات" note="مدة بقاء الجهاز داخل، ومتى يطلب كلمة المرور من جديد.">
          <NumberField label={FIELD_LABELS["session.lifetimeDays"]} unit="يوم" {...num("session", "lifetimeDays")} />
          <NumberField
            label={FIELD_LABELS["session.idleHours"]}
            unit="ساعة"
            help="إذا الجهاز ما انستخدم هالمدة، بيطلع لحاله. 0 = متوقف."
            hint={(v) => (v === 0 ? "متوقف" : `بعد ${humanMinutes(v * 60)} بدون استخدام`)}
            {...num("session", "idleHours")}
          />
          <NumberField
            label={FIELD_LABELS["session.accessMinutes"]}
            unit="دقيقة"
            help="بعدها الجهاز بيجدد الرمز لحاله. أقصر = إيقاف الحسابات بيوصل أسرع."
            {...num("session", "accessMinutes")}
          />
        </Section>

        <Section title="التحقق بخطوتين" note="كود من تطبيق المصادقة أو SMS بعد كلمة المرور. اللي ما فعّله، بيقدر يفوت بس على صفحة الأمان تبعه لحتى يفعّله.">
          <Segmented
            value={draft.twoFactor.required}
            disabled={!canWrite}
            onChange={(v) => set("twoFactor", "required", v)}
            options={[
              { value: "off", label: "اختياري" },
              { value: "owners", label: "إجباري لأصحاب المتجر" },
              { value: "everyone", label: "إجباري للكل" },
            ]}
          />
          {draft.twoFactor.required !== "off" && !admin?.twoFactorEnabled ? (
            <p className="text-xs text-amber-200">لازم تفعّله لحسابك أنت أول (من صفحة الأمان) قبل ما تحفظ.</p>
          ) : null}
          <Toggle
            label={FIELD_LABELS["alerts.newDevice"]}
            help="بيسجّل تنبيه لما حدا يفوت من IP أول مرة بيستخدمه. التنبيهات بتبيّن تحت."
            checked={draft.alerts.newDevice}
            disabled={!canWrite}
            onChange={(v) => set("alerts", "newDevice", v)}
          />
        </Section>

        <Section title="أكواد الـ SMS" note="للدخول برقم التلفون وللتحقق بخطوتين عن طريق SMS.">
          <NumberField label={FIELD_LABELS["otp.ttlMinutes"]} unit="دقيقة" {...num("otp", "ttlMinutes")} />
          <NumberField label={FIELD_LABELS["otp.maxAttempts"]} unit="محاولات" {...num("otp", "maxAttempts")} />
        </Section>

        <Section
          title="الحماية من الطلبات الكثيرة"
          note="إذا IP بعت طلبات أكثر من هيك خلال النافذة، بياخد رسالة 'استنى شوي' لحتى تخلص. الأرقام العالية مريحة للزوار، والواطية أقوى ضد الهجمات."
        >
          <NumberField label={FIELD_LABELS["rateLimit.windowSeconds"]} unit="ثانية" {...num("rateLimit", "windowSeconds")} />
          <NumberField label={FIELD_LABELS["rateLimit.perPath"]} unit="طلب" {...num("rateLimit", "perPath")} />
          <NumberField label={FIELD_LABELS["rateLimit.perIp"]} unit="طلب" {...num("rateLimit", "perIp")} />
          <NumberField label={FIELD_LABELS["rateLimit.authWindowSeconds"]} unit="ثانية" {...num("rateLimit", "authWindowSeconds")} />
          <NumberField label={FIELD_LABELS["rateLimit.auth"]} unit="طلب" {...num("rateLimit", "auth")} />
        </Section>

        <Section title="قوائم IP" note="IP واحد أو نطاق (مثل 203.0.113.0/24)، كل واحد بسطر. هاي بتنضاف على قوائم env إذا في.">
          <IpListField
            label={FIELD_LABELS["ip.adminAllow"]}
            help="إذا القائمة فاضية، أي IP بيقدر يفتح صفحة الدخول. إذا فيها شي، بس هاي الـ IPs."
            value={ipText.adminAllow}
            disabled={!canWrite}
            onChange={(v) => setIpText((p) => ({ ...p, adminAllow: v }))}
            onAddMine={d.yourIp ? () => setIpText((p) => ({ ...p, adminAllow: ipLines(parseIpLines(`${p.adminAllow}\n${d.yourIp}`)) })) : undefined}
          />
          <IpListField
            label={FIELD_LABELS["ip.adminBlock"]}
            value={ipText.adminBlock}
            disabled={!canWrite}
            onChange={(v) => setIpText((p) => ({ ...p, adminBlock: v }))}
          />
          <IpListField
            label={FIELD_LABELS["ip.siteBlock"]}
            help="ما بيقدروا يفتحوا المتجر ولا الـ API أبداً."
            value={ipText.siteBlock}
            disabled={!canWrite}
            onChange={(v) => setIpText((p) => ({ ...p, siteBlock: v }))}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={box}>
          <h2 className="font-semibold">تنبيهات الأمان</h2>
          <p className="mt-1 text-xs text-white/60">آخر محاولات الدخول الغلط، الحسابات اللي انقفلت، والدخول من أجهزة جديدة.</p>
          {d.alerts.length ? (
            <ul className="mt-3 divide-y divide-white/10 text-sm" data-testid="security-alerts">
              {d.alerts.map((a) => (
                <li key={a.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className={a.type === "LOGIN_FAILURE" ? "" : "font-medium"}>{ALERT_TEXT[a.type] ?? a.type}</span>
                    {a.adminUser ? <span className="text-white/60"> · {a.adminUser.name}</span> : null}
                  </span>
                  <span className="flex flex-wrap gap-x-3 text-xs text-white/50">
                    <span>{relativeTime(a.at)}</span>
                    {a.userAgent ? <span>{describeDevice(a.userAgent)}</span> : null}
                    {a.ip ? <span dir="ltr">{a.ip}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/60">ما في تنبيهات.</p>
          )}
        </div>

        <div className={box}>
          <h2 className="font-semibold">سجل التغييرات</h2>
          <p className="mt-1 text-xs text-white/60">قبل كل تغيير منحفظ القواعد زي ما كانت (آخر 30). الاسترجاع كمان بينحفظ، فبتقدر ترجع عنه.</p>
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
        </div>
      </div>

      {canWrite && dirty ? (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 sm:bottom-4 lg:right-72" data-testid="security-save-bar">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--surface,#fff)] p-3 shadow-xl">
            <span className="text-sm">
              {bad.length ? (
                <span className="text-red-300">في قيم برّا الحد المسموح: {describeChanged(bad)}</span>
              ) : (
                <>تغييرات مش محفوظة: {describeChanged(withIps ? changedPaths(withIps, d.policy) : [])}</>
              )}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(d.policy);
                  setIpText({ adminAllow: ipLines(d.policy.ip.adminAllow), adminBlock: ipLines(d.policy.ip.adminBlock), siteBlock: ipLines(d.policy.ip.siteBlock) });
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
        title={confirm?.kind === "reset" ? "رجوع للافتراضي" : "استرجاع القواعد"}
        message={
          confirm?.kind === "reset"
            ? "كل القواعد بترجع لإعدادات السيرفر (env)، وقوائم IP اللي هون بتنمسح. النسخة الحالية بتنحفظ بالسجل."
            : confirm
              ? `القواعد بترجع زي ما كانت ${relativeTime(confirm.rev.createdAt)}. النسخة الحالية بتنحفظ بالسجل.`
              : ""
        }
        confirmText={confirm?.kind === "reset" ? "رجوع للافتراضي" : "استرجاع"}
        variant="warning"
        isLoading={reset.isPending || restore.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "reset") reset.mutate();
          else restore.mutate(confirm.rev.id);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className={box}>
      <h2 className="font-semibold">{title}</h2>
      {note ? <p className="mt-1 text-xs text-white/60">{note}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function NumberField({
  path,
  label,
  unit,
  help,
  hint,
  value,
  def,
  limits,
  invalid,
  disabled,
  onChange,
}: {
  path: string;
  label: string;
  unit: string;
  help?: string;
  hint?: (v: number) => string;
  value: number;
  def: number;
  limits?: { min: number; max: number };
  invalid: boolean;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const id = `policy-${path.replace(".", "-")}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {help ? <p className="mt-0.5 text-xs text-white/50">{help}</p> : null}
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          dir="ltr"
          min={limits?.min}
          max={limits?.max}
          value={Number.isFinite(value) ? value : ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Math.round(Number(e.target.value)))}
          className={`h-10 w-28 rounded-xl border bg-white/[0.03] px-3 text-sm ${invalid ? "border-red-500/60" : "border-white/[0.08]"} disabled:opacity-60`}
          data-policy={path}
        />
        <span className="text-sm text-white/60">{unit}</span>
        {hint && Number.isFinite(value) ? <span className="text-xs text-white/50">({hint(value)})</span> : null}
      </div>
      <p className={`mt-1 text-xs ${invalid ? "text-red-300" : "text-white/40"}`}>
        {limits ? `من ${limits.min} لـ ${limits.max}` : ""} · الافتراضي {def}
      </p>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  disabled,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  disabled: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${value === o.value ? "bg-white/10 font-medium" : "text-white/60 hover:bg-white/5"} disabled:opacity-60`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, help, checked, disabled, onChange }: { label: string; help?: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {help ? <span className="block text-xs text-white/50">{help}</span> : null}
      </span>
    </label>
  );
}

function IpListField({
  label,
  help,
  value,
  disabled,
  onChange,
  onAddMine,
}: {
  label: string;
  help?: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onAddMine?: () => void;
}) {
  const count = parseIpLines(value).length;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-white/50">{count ? `${count}` : "فاضية"}</span>
      </div>
      {help ? <p className="mt-0.5 text-xs text-white/50">{help}</p> : null}
      <textarea
        dir="ltr"
        rows={3}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"203.0.113.10\n198.51.100.0/24"}
        className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 font-mono text-xs disabled:opacity-60"
        aria-label={label}
      />
      {onAddMine && !disabled ? (
        <button type="button" className="mt-1 text-xs underline opacity-80 hover:opacity-100" onClick={onAddMine}>
          + ضيف الـ IP تبعي
        </button>
      ) : null}
    </div>
  );
}
