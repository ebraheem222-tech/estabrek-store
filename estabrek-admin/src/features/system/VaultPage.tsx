// الخزنة: the private vault that keeps protected products' masters and signs
// licences, the owner's 20-minute session (password + authenticator code), and
// the Windows launcher buyers download.
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { env } from "../../config/env";
import { dateTime } from "../../lib/orders";
import * as VaultAPI from "../../api/vault.api";
import { Stat } from "./cacheParts";
import { uptimeText } from "./cacheText";
import { buildCommand, countdown, eventText, eventTone, nextVersion, shortHash } from "./vaultText";
import { formatBytes } from "../catalog/composer/protectedText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm";

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

export default function VaultPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const q = useQuery({ queryKey: ["vault"], queryFn: VaultAPI.getVault, refetchInterval: 30_000 });
  const [unlock, setUnlock] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["vault"] });
  const open = q.data?.session?.expiresAt ?? null;
  const now = useNow(Boolean(open));
  const left = countdown(open, now);
  useEffect(() => {
    if (open && !left) void refresh();
  }, [open, left]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useMutation({ mutationFn: VaultAPI.closeVaultSession, onSuccess: () => { toast.success("تسكّرت الخزنة"); void refresh(); } });
  const moveIn = useMutation({
    mutationFn: VaultAPI.moveFilesIn,
    onSuccess: (r) => { toast.success(r.moved ? `دخل ${r.moved} ملف للخزنة` : "ما في ملفات برا الخزنة"); void refresh(); },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const events = useQuery({ queryKey: ["vault-events"], queryFn: VaultAPI.vaultEvents, enabled: Boolean(left), refetchInterval: left ? 15_000 : false });

  if (!q.data) {
    return <div dir="rtl" className={box}>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</div>;
  }
  const d = q.data;
  return (
    <div dir="rtl" className="space-y-4 pb-24" data-testid="vault-page">
      <section className={box}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">🔐 الخزنة</h1>
            <p className="mt-1 text-sm leading-6 text-white/60">
              سيرفر خاص ما إله عنوان على الإنترنت: فيه الملفات الأصلية للمنتجات المحمية (مشفّرة) ومفتاح توقيع التراخيص. المتجر بيطلب منه نسخة الزبونة لحاله وقت البيع؛ أنتِ
              بتفتحيه 20 دقيقة بس لترفعي أو تحذفي ملفات، بكلمة السر وكود التطبيق.
            </p>
          </div>
          {d.on ? (
            left ? (
              <div className="flex shrink-0 items-center gap-2">
                <Badge>مفتوحة · {left}</Badge>
                {canWrite ? <Button size="sm" variant="secondary" isLoading={close.isPending} onClick={() => close.mutate()}>سكّريها هلّق</Button> : null}
              </div>
            ) : canWrite ? (
              <Button variant="primary" className="shrink-0" disabled={!d.reachable} onClick={() => setUnlock(true)} data-testid="vault-open">
                افتحي الخزنة (20 دقيقة)
              </Button>
            ) : null
          ) : null}
        </div>

        {d.on ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="الحالة" value={d.reachable ? "شغّالة" : "ما بترد"} note={d.reachable ? `${d.version ?? ""} · ${uptimeText(d.uptimeSeconds ?? 0)}` : d.error === "VAULT_REFUSED" ? "رفضت السيرفر: تأكدي من السر المشترك" : "نايمة أو العنوان غلط"} testId="vault-state" />
            <Stat label="ملفات بالخزنة" value={String(d.files.inVault)} />
            <Stat label="ملفات لسا برا" value={String(d.files.inDatabase)} note={d.files.inDatabase ? "بقاعدة البيانات (مشفّرة)" : undefined} />
            <Stat label="مفتاح التوقيع" value={d.kid ? shortHash(d.kid) : "—"} />
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-amber-500/10 p-4 text-sm leading-7 text-amber-100" data-testid="vault-off">
            <b>الخزنة مش مركّبة بعد.</b> المنتجات المحمية شغّالة: الملفات محفوظة مشفّرة بقاعدة البيانات والسيرفر نفسه بيوقّع التراخيص. لتركيبها:
            <ol className="mt-2 list-decimal space-y-1 pe-5 text-xs text-amber-100/90">
              <li>بـ Railway: خدمة جديدة من نفس الريبو (estabrek-store-backend)، أمر التشغيل <code dir="ltr">npm run start:vault</code>، ومساحة تخزين (Volume) على <code dir="ltr">/data</code>، وبدون دومين عام.</li>
              <li>متغيراتها: <code dir="ltr">VAULT_SHARED_SECRET</code> و <code dir="ltr">VAULT_MASTER_KEY</code> (كل واحد 32 حرف أو أكثر، عشوائي) و <code dir="ltr">VAULT_DATA_DIR=/data</code>.</li>
              <li>بالسيرفر الأساسي: <code dir="ltr">VAULT_URL</code> (عنوانها الخاص، مثلاً <code dir="ltr">http://vault.railway.internal:4400</code>) ونفس <code dir="ltr">VAULT_SHARED_SECRET</code>.</li>
              <li>لاحقاً مع Tailscale: غيّري <code dir="ltr">VAULT_URL</code> لاسمها بالشبكة، وحطي <code dir="ltr">VAULT_ALLOW_IPS=100.64.0.0/10</code> عندها. ما في تغيير بالكود.</li>
            </ol>
          </div>
        )}

        {d.on && d.files.inDatabase > 0 && left && canWrite ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.04] p-3 text-sm">
            <span className="text-white/70">في {d.files.inDatabase} ملف من قبل الخزنة لسا بقاعدة البيانات.</span>
            <Button size="sm" variant="secondary" isLoading={moveIn.isPending} onClick={() => moveIn.mutate()} data-testid="vault-move-in">
              دخّليهن الخزنة
            </Button>
          </div>
        ) : null}
      </section>

      {left ? (
        <section className={box} data-testid="vault-events">
          <h2 className="mb-2 text-sm font-semibold">سجل الخزنة</h2>
          {events.data?.length ? (
            <ul className="max-h-80 divide-y divide-white/[0.06] overflow-auto text-xs">
              {events.data.map((e, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span className={eventTone(e) === "bad" ? "text-red-300" : eventTone(e) === "info" ? "text-accent-200" : "text-white/75"}>{eventText(e)}</span>
                  <span className="text-white/40">{dateTime(e.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/45">{events.isLoading ? "جارٍ التحميل…" : "ما في أحداث."}</p>
          )}
        </section>
      ) : null}

      <LauncherSection d={d} canWrite={canWrite} onChange={refresh} />

      {unlock ? <UnlockModal onClose={() => setUnlock(false)} onOpened={() => { setUnlock(false); void refresh(); }} /> : null}
    </div>
  );
}

function UnlockModal({ onClose, onOpened }: { onClose: () => void; onOpened: () => void }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const go = useMutation({
    mutationFn: () => VaultAPI.openVaultSession(password, code.replace(/\s+/g, "")),
    onSuccess: () => { toast.success("انفتحت الخزنة لـ 20 دقيقة"); onOpened(); },
    onError: (e) => { setCode(""); toast.error("ما انفتحت", { description: getApiErrorMessage(e) }); },
  });
  const ok = password.length > 0 && /^\d{6,8}$/.test(code.replace(/\s+/g, ""));
  return (
    <Modal
      open
      title="افتحي الخزنة"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="primary" disabled={!ok} isLoading={go.isPending} onClick={() => go.mutate()}>افتحي</Button>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      }
    >
      <form dir="rtl" className="space-y-3 text-sm" data-testid="vault-unlock" onSubmit={(e) => { e.preventDefault(); if (ok) go.mutate(); }}>
        <p className="text-xs leading-6 text-white/55">للأمان، اكتبي كلمة السر من جديد والكود من تطبيق التحقق. الخزنة بتتسكّر لحالها بعد 20 دقيقة. 5 محاولات غلط بيقفلوها ربع ساعة.</p>
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">كلمة السر</span>
          <input type="password" autoComplete="current-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="كلمة السر" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">الكود من التطبيق</span>
          <input dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={8} className={`${field} max-w-[10rem] text-center font-mono tracking-widest`} value={code} onChange={(e) => setCode(e.target.value)} aria-label="كود التحقق" />
        </label>
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}

function LauncherSection({ d, canWrite, onChange }: { d: VaultAPI.VaultState; canWrite: boolean; onChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const current = d.launchers.find((l) => l.isActive) ?? null;
  const [version, setVersion] = useState(() => nextVersion(d.launchers[0]?.version));
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const del = useMutation({ mutationFn: (id: string) => VaultAPI.deleteLauncher(id), onSuccess: () => { toast.success("انحذفت النسخة"); onChange(); } });
  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > d.launcherMaxMb * 1024 * 1024) { toast.error(`أكبر من ${d.launcherMaxMb} MB`); return; }
    setProgress(0);
    try {
      await VaultAPI.uploadLauncher(f, version.trim(), notes.trim(), setProgress);
      toast.success(`انرفع البرنامج ${version}: الزبونات بيشوفنه بصفحة الطلب`);
      setNotes("");
      setVersion(nextVersion(version));
      onChange();
    } catch (e) {
      toast.error("ما انرفع", { description: getApiErrorMessage(e) });
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };
  const command = buildCommand(env.VITE_API_BASE_URL, version);
  return (
    <section className={box} data-testid="launcher-section">
      <h2 className="text-sm font-semibold">💻 برنامج التشغيل (ويندوز)</h2>
      <p className="mt-1 text-xs leading-6 text-white/55">
        الزبونة بتضيف الملف المشفّر والسيريال عليه مرة وحدة، وبيتفعّل على جهازها بس ({d.checkEveryDays ? `بيتأكد أونلاين كل ${d.checkEveryDays} أيام، وبدون إنترنت بيضل شغّال ${d.offlineGraceDays} يوم` : ""}). بيشغّل
        سكربتات Python و PowerShell و Batch و Node و AutoHotkey مباشرة، وباقي الملفات (Roblox، AutoCAD، الطباعة 3D) بيحفظها بمجلد.
      </p>
      <div className="mt-3 rounded-xl bg-white/[0.04] p-3 text-xs leading-6 text-white/65">
        <b className="text-white/80">بناء البرنامج على جهازك</b> (ويندوز، بدون تنزيل إشي). بالمجلد الرئيسي للمشروع:
        <code dir="ltr" className="mt-1 block select-all overflow-x-auto whitespace-nowrap rounded-lg bg-black/30 px-3 py-2 font-mono text-[11px] text-white/80" data-testid="launcher-command">{command}</code>
        بيطلع بـ <code dir="ltr">estabrek-launcher\dist\EstabrekLauncher.exe</code>. ارفعيه هون. ابنيه من جديد إذا تغيّر مفتاح التوقيع (مثلاً لما تركّبي الخزنة).
        <div className="mt-1 text-white/45">المفاتيح الحالية: {d.keys.map((k) => shortHash(k.kid)).join("، ")}. بدون شهادة توقيع، ويندوز بيحذّر الزبونة أول مرة («Windows protected your PC» ← «More info» ← «Run anyway»).</div>
      </div>

      {current ? (
        <p className="mt-3 text-sm text-white/80" data-testid="launcher-current">
          النسخة اللي بتنزل للزبونات: <b dir="ltr">{current.version}</b> · {formatBytes(current.bytes)} · {dateTime(current.createdAt)}
        </p>
      ) : (
        <p className="mt-3 text-xs text-amber-300/90">لسا ما في برنامج مرفوع: الزبونات بيقدرن ينزّلن النسخة المشفّرة ويفتحنها بـ <bdi dir="ltr">7-Zip</bdi>، بس بدون ربط بالجهاز.</p>
      )}

      {canWrite ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
          <input dir="ltr" className={`${field} text-center`} value={version} onChange={(e) => setVersion(e.target.value)} aria-label="رقم النسخة" />
          <input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="شو الجديد (اختياري)" aria-label="ملاحظات" />
          <input ref={input} type="file" accept=".exe" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} data-testid="launcher-file" />
          <Button variant="secondary" disabled={progress !== null || !/^\d+(\.\d+){1,3}$/.test(version.trim())} onClick={() => input.current?.click()}>
            {progress !== null ? `جارٍ الرفع ${progress}%` : "+ رفع EstabrekLauncher.exe"}
          </Button>
        </div>
      ) : null}

      {d.launchers.length > 1 ? (
        <ul className="mt-3 divide-y divide-white/[0.06] text-xs">
          {d.launchers.filter((l) => !l.isActive).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 py-1.5 text-white/55">
              <span dir="ltr">{l.version}</span>
              <span>{dateTime(l.createdAt)}</span>
              {canWrite ? <button type="button" className="text-red-300 hover:text-red-200" onClick={() => del.mutate(l.id)}>حذف</button> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
