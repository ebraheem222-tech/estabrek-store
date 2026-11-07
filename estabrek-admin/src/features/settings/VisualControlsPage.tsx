import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getVisualControls, saveVisualControls } from "../../api/visualControls.api";
import type { VisualControls } from "../../../../estabrek-storefront/src/lib/visualControls";
import { CardDesignFields, InteractionFields } from "./VisualControlsForm";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../api/http";
import { tr } from "../../lib/words";

export default function VisualControlsPage() {
  const { hasPermission } = useAuth();
  const [value, setValue] = useState<VisualControls>();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const load = async () => { setBusy(true); setError(""); try { setValue(await getVisualControls()); setSaved(false); } catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(false); } };
  useEffect(() => { void load(); }, []);
  const patch = (next: Partial<VisualControls>) => { setValue(current => ({ ...current!, ...next })); setSaved(false); };
  const save = async () => {
    if (!value) return; setBusy(true); setError("");
    try { setValue(await saveVisualControls(value)); setSaved(true); }
    catch (e: any) { setError(e?.response?.status === 409 ? tr("الإعدادات تغيّرت من جلسة ثانية. انسخ تعديلاتك ثم أعد التحميل قبل الحفظ.", "Settings changed in another session. Copy your changes, then reload before saving.") : getApiErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-5xl space-y-5 p-4" data-testid="visual-controls-page">
    <h1 className="text-xl font-semibold">{tr("بطاقات المنتجات والتفاعلات", "Product cards and interactions")}</h1>
    <p className="text-sm text-white/65">{tr("هذه إعدادات المتجر الافتراضية. من محرر الصفحات بتقدر تخصصها لكل صفحة وعنصر. حفظها يغيّر الإعداد العام للمتجر؛ تخصيص الصفحة يحتاج نشر الصفحة.", "These are store defaults. Override them on pages and elements in the editor. Saving updates the store defaults; page overrides need page publication.")}</p>
    <Link to="/admin/pages" className="text-sm underline">{tr("افتح محرر الصفحات", "Open page editor")}</Link>
    {error && <p role="alert" className="text-red-300">{error}</p>}{saved && <p role="status" className="text-emerald-300">{tr("تم حفظ إعدادات المتجر.", "Store defaults saved.")}</p>}
    {value && <div className="grid items-start gap-4 md:grid-cols-2"><CardDesignFields value={value.cardDesign} disabled={busy || !hasPermission("settings:write")} onChange={cardDesign => patch({ cardDesign })} /><InteractionFields value={value.interactions} disabled={busy || !hasPermission("settings:write")} onChange={interactions => patch({ interactions })} /></div>}
    <div className="flex gap-3"><button type="button" disabled={busy || !value || !hasPermission("settings:write")} onClick={() => void save()} className="rounded-lg bg-accent-500 px-4 py-2 disabled:opacity-40" data-testid="visual-controls-save">{tr("حفظ إعدادات المتجر", "Save store defaults")}</button><button type="button" disabled={busy} onClick={() => void load()} className="rounded-lg border border-white/15 px-4 py-2">{tr("إعادة التحميل", "Reload")}</button></div>
  </main>;
}
