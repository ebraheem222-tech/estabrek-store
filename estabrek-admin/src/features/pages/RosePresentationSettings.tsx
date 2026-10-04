export function RosePresentationSettings({ value, onChange }: { value: any; onChange: (next: any) => void }) {
  const presentation = value?.rosePresentation || {};
  return <details className="rounded-xl border border-pink-300/20 bg-pink-400/5 p-4" dir="rtl">
    <summary className="cursor-pointer text-sm font-semibold text-pink-200">استبرق — ألوان القسم والحركة</summary>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm"><span>لوحة ألوان القسم</span>
        <select className="block w-full rounded-lg bg-slate-900 p-2 text-white" value={presentation.palette || ""} onChange={e => onChange({ ...value, rosePresentation: { ...presentation, palette: e.target.value || undefined } })}>
          <option value="">تلقائية حسب المشهد</option><option value="pearl">لؤلؤي</option><option value="blush">وردي فاتح</option><option value="rose">وردي دافئ</option><option value="lilac">ليلكي</option><option value="berry">توتي</option>
        </select>
      </label>
      <label className="space-y-2 text-sm"><span>شدة الحركة</span>
        <select className="block w-full rounded-lg bg-slate-900 p-2 text-white" value={presentation.motionIntensity || "cinematic"} onChange={e => onChange({ ...value, rosePresentation: { ...presentation, motionIntensity: e.target.value } })}>
          <option value="cinematic">سينمائية</option><option value="subtle">هادئة</option>
        </select>
      </label>
    </div>
  </details>;
}
