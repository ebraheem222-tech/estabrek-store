import { tr } from "../lib/words";
import type { MotionEngine, MotionPreset, MotionProfile } from "./motionProfiles";

/** Shared choices for template previews/imports and the current page's draft. */
export function MotionProfileFields({ value = {}, onChange, busy = false }: {
  value?: MotionProfile; onChange: (value: MotionProfile) => void; busy?: boolean;
}) {
  const control = "mt-1 w-full rounded-lg border border-white/10 bg-surface-925 px-2 py-1.5 text-xs text-white";
  return <div className="grid grid-cols-2 gap-2" data-testid="motion-profile-fields">
    <label className="text-[11px] text-white/60">
      {tr("محرّك الحركة", "Animation engine")}
      <select className={control} disabled={busy} value={value.engine ?? ""} onChange={(e) => onChange({ ...value, engine: (e.target.value || undefined) as MotionEngine | undefined })} data-testid="motion-profile-engine">
        <option value="">{tr("إبقاء المحرّك الحالي", "Keep current engine")}</option>
        <option value="gsap">GSAP</option><option value="anime">Anime.js</option>
      </select>
    </label>
    <label className="text-[11px] text-white/60">
      {tr("أسلوب الحركة", "Motion style")}
      <select className={control} disabled={busy} value={value.preset ?? "original"} onChange={(e) => onChange({ ...value, preset: e.target.value as MotionPreset })} data-testid="motion-profile-preset">
        <option value="original">{tr("الحركة الأصلية", "Original motion")}</option>
        <option value="none">{tr("بلا حركة عناصر", "No element motion")}</option>
        <option value="calm">{tr("حركة هادئة", "Calm motion")}</option>
        <option value="rich">{tr("حركة غنية", "Rich motion")}</option>
      </select>
    </label>
  </div>;
}
