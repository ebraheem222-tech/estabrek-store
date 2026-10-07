// النسخ الاحتياطي: the daily encrypted copy of the database, taking one now,
// downloading one, the history, and how to put a backup back.
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as SystemAPI from "../../api/system.api";
import * as FeaturesAPI from "../../api/features.api";
import type { BackupsView } from "../../api/system.api";
import { relativeTime } from "../team/teamText";
import { STATUS_TEXT, TRIGGER_TEXT, backupHealth, errorText, hourText, humanBytes } from "./backupText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

const HEALTH_STYLE = {
  ok: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  warn: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  bad: "border-red-400/30 bg-red-400/10 text-red-200",
};

export default function BackupsPage() {
  const q = useQuery({ queryKey: ["backups"], queryFn: SystemAPI.getBackups, refetchInterval: (query) => (query.state.data?.runs.some((r) => r.status === "RUNNING") ? 3000 : false) });
  return (
    <div dir="rtl" className="space-y-4" data-testid="backups-page">
      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}>
          <Spinner /> جاري التحميل…
        </div>
      ) : q.isError ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : q.data ? (
        <>
          <StatusCard v={q.data} />
          <HistoryCard v={q.data} />
          <RestoreCard />
        </>
      ) : null}
    </div>
  );
}

function StatusCard({ v }: { v: BackupsView }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const canSwitch = hasPermission("settings:write");
  const health = backupHealth(v.last, { enabled: v.enabled, storageReady: v.storage.ready });

  const run = useMutation({
    mutationFn: SystemAPI.runBackupNow,
    onSuccess: (r) => {
      if (r.status === "SUCCEEDED") toast.success("انحفظت نسخة جديدة");
      else toast.error("ما انحفظت النسخة", { description: errorText(r.error) });
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const download = useMutation({
    mutationFn: SystemAPI.downloadBackup,
    onSuccess: ({ blob, name }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("نزلت النسخة على جهازك");
    },
    onError: (e) => toast.error("ما زبط التنزيل", { description: getApiErrorMessage(e) }),
  });
  const toggle = useMutation({
    mutationFn: (on: boolean) => FeaturesAPI.setFeature("backups", on),
    onSuccess: (f) => {
      toast.success(f.enabled ? "اشتغل النسخ اليومي" : "انطفى النسخ اليومي");
      qc.invalidateQueries({ queryKey: ["backups"] });
      qc.invalidateQueries({ queryKey: ["features"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });

  return (
    <section className={box} data-testid="backup-status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold">النسخ الاحتياطي</h1>
            {v.enabled ? (
              <Badge size="sm" variant="success" dot>
                يومي شغّال
              </Badge>
            ) : (
              <Badge size="sm" dot>
                اليومي مطفي
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-white/60">
            {`كل يوم الساعة ${hourText(v.hour)} (بتوقيت البلاد) بتنحفظ نسخة مشفّرة من كل الداتا: المنتجات، الطلبات، الزبائن، الإعدادات، الصفحات. بتنحفظ برّا السيرفر، وبيضل آخر ${v.keep} نسخة. إذا صار إشي للسيرفر أو انمسح إشي بالغلط، بترجّع الداتا من نسخة.`}
          </p>
        </div>
        {canSwitch ? (
          <Button variant="secondary" className="shrink-0 whitespace-nowrap" onClick={() => toggle.mutate(!v.enabled)} isLoading={toggle.isPending}>
            {v.enabled ? "إطفاء اليومي" : "تشغيل اليومي"}
          </Button>
        ) : null}
      </div>

      <div className={`mt-4 rounded-xl border p-3 text-sm ${HEALTH_STYLE[health.level]}`} data-testid="backup-health">
        {health.text}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="آخر نسخة" value={v.last ? relativeTime(v.last.startedAt) : "—"} />
        <Fact label="حجمها" value={v.last ? humanBytes(v.last.sizeBytes) : "—"} />
        <Fact label="سجلات" value={v.last?.rows != null ? v.last.rows.toLocaleString("ar") : "—"} />
        <Fact label="مكان الحفظ" value={v.storage.ready ? (v.storage.kind === "cloudinary" ? "Cloudinary (خاص)" : v.storage.kind) : "مش مضبوط"} />
      </div>

      {!v.customKey ? (
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
          النسخ مشفّرة بمفتاح معمول من JWT_SECRET. الأحسن: حط بـ Railway متغيّر <span dir="ltr">BACKUP_ENCRYPTION_KEY</span> (أي جملة طويلة، 16 حرف وأكثر)، واحفظ نسخة منه عندك بمكان آمن. بدون المفتاح ما بتنفتح النسخ، وإذا تغيّر JWT_SECRET بتضيع إمكانية فتح النسخ القديمة.
        </p>
      ) : null}

      {canWrite ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => run.mutate()} isLoading={run.isPending} disabled={!v.storage.ready}>
            خذ نسخة هلّق
          </Button>
          <Button variant="secondary" onClick={() => download.mutate()} isLoading={download.isPending}>
            نزّل نسخة على جهازي
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/50">أخذ وتنزيل النسخ بدّه صلاحية «تعديل النظام».</p>
      )}
    </section>
  );
}

function HistoryCard({ v }: { v: BackupsView }) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const link = useMutation({
    mutationFn: (id: string) => SystemAPI.backupLink(id),
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener");
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  return (
    <section className={box}>
      <h2 className="font-semibold">آخر النسخ</h2>
      {v.runs.length ? (
        <ul className="mt-3 divide-y divide-white/10 text-sm" data-testid="backup-runs">
          {v.runs.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{new Date(r.startedAt).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}</span>
                  <Badge size="sm" variant={STATUS_TEXT[r.status].variant}>
                    {STATUS_TEXT[r.status].label}
                  </Badge>
                  <Badge size="sm">{TRIGGER_TEXT[r.trigger] ?? r.trigger}</Badge>
                </div>
                <div className="text-xs text-white/50">
                  {r.status === "FAILED"
                    ? errorText(r.error)
                    : [humanBytes(r.sizeBytes), r.rows != null ? `${r.rows.toLocaleString("ar")} سجل` : "", r.status === "SUCCEEDED" && !r.location ? "انحذفت من مكان الحفظ (قديمة)" : ""]
                        .filter(Boolean)
                        .join(" · ")}
                </div>
              </div>
              {canWrite && r.location ? (
                <Button size="sm" variant="ghost" onClick={() => link.mutate(r.id)} isLoading={link.isPending && link.variables === r.id}>
                  تنزيل
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/60">لسا ما في نسخ.</p>
      )}
    </section>
  );
}

const STEPS = [
  "حطّ الموقع بوضع الصيانة (صفحة «حماية الضغط والصيانة») حتى ما تنعمل طلبات بالنص.",
  "بـ Railway: افتح خدمة الباك إند ← Shell (أو أي جهاز عليه نفس DATABASE_URL ونفس المفتاح).",
  "شوف شو جوّا آخر نسخة (ما بيتغيّر إشي):",
  "رجّعها فعلياً. قبل ما يبدّل، بيحفظ الداتا الحالية بملف before-restore حتى تقدر ترجع عنها:",
  "أو من ملف نزّلته على جهازك (ارفعه للسيرفر أول):",
  "طفّي وضع الصيانة. الموظفين والزباين بيعملوا دخول من جديد.",
];

const COMMANDS: Record<number, string> = {
  2: "npm run backup:restore -- --latest",
  3: "npm run backup:restore -- --latest --yes",
  4: "npm run backup:restore -- ./estabrek-backup-2026-10-13-0000.estbk --yes",
};

function RestoreCard() {
  return (
    <section className={box}>
      <details>
        <summary className="cursor-pointer font-semibold">كيف بترجّع نسخة؟</summary>
        <p className="mt-2 text-sm text-white/60">
          الترجيع بيبدّل كل الداتا بالنسخة، فهو مقصود يكون من السيرفر مش بكبسة من هون. إذا مش متأكد، احكي مع المطوّر قبل.
        </p>
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
          {STEPS.map((s, i) => (
            <li key={i}>
              {s}
              {COMMANDS[i] ? (
                <pre dir="ltr" className="mt-1 overflow-x-auto rounded-lg bg-black/30 p-2 text-left text-xs">
                  {COMMANDS[i]}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 truncate font-semibold">{value}</div>
    </div>
  );
}
