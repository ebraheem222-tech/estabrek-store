import { MediaUrlInput } from "../../components/media/MediaUrlInput";
import type { HeroData } from "./SectionEditor";

export function RoseHeroSettings({
  value,
  onChange,
}: {
  value: HeroData;
  onChange: (next: HeroData) => void;
}) {
  return (
    <details
      className="rounded-2xl border border-pink-300/20 bg-pink-400/5 p-4"
      dir="rtl"
    >
      <summary className="cursor-pointer text-sm font-semibold text-pink-200">
        استبرق — الصفحة الوردية وتجربة الأقمشة 3D
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs leading-6 text-white/60">
          هذه الإعدادات تخص أول Hero في الصفحة الرئيسية. باقي أقسام الصفحة
          وترتيبها وإظهارها تُدار كالمعتاد. صورة الحملة لا تغيّر صور المنتجات.
        </p>
        <label className="block space-y-2 text-sm">
          <span>عنوان الحملة الوردية</span>
          <textarea
            value={value.roseTitle || ""}
            onChange={(e) => onChange({ ...value, roseTitle: e.target.value })}
            placeholder={"أناقة تشبهكِ.\nبكل تفاصيلكِ."}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-pink-300/50"
          />
          <span className="block text-xs text-white/50">
            كل سطر يظهر منفصلاً. اتركيه فارغاً لاستخدام عنوان Hero.
          </span>
        </label>
        <MediaUrlInput
          label="صورة الحملة — تصميم وردي"
          value={value.roseImageUrl || ""}
          onChange={(url) => onChange({ ...value, roseImageUrl: url })}
          placeholder="/editorial/hijab-campaign.webp"
        />
        <label className="block space-y-2 text-sm">
          <span>وصف الصورة لإمكانية الوصول</span>
          <input
            value={value.roseImageAlt || ""}
            onChange={(e) =>
              onChange({ ...value, roseImageAlt: e.target.value })
            }
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-pink-300/50"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={value.rose3dEnabled !== false}
            onChange={(e) =>
              onChange({ ...value, rose3dEnabled: e.target.checked })
            }
            className="accent-pink-400"
          />
          <span>إظهار تجربة الشال ثلاثي الأبعاد</span>
        </label>
        <div className="text-xs leading-6 text-white/50">
          <label className="flex cursor-pointer items-center gap-3 text-sm mb-4">
            <input type="checkbox" checked={value.roseVideoEnabled !== false} onChange={e => onChange({ ...value, roseVideoEnabled: e.target.checked })} className="accent-pink-400" />
            <span>إظهار فيديو الأقمشة الافتراضي</span>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">{["نعومة", "انسياب", "أناقة"].map((word, i) => <label key={word} className="text-xs space-y-2"><span>كلمة المشهد {i + 1}</span><input className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-white" value={value.roseStoryWords?.[i] || ""} placeholder={word} onChange={e => { const words = [...(value.roseStoryWords || ["", "", ""])]; words[i] = e.target.value; onChange({ ...value, roseStoryWords: words }); }} /></label>)}</div>
        <p className="text-xs leading-6 text-white/50">
          تظهر تجربة القماش ضمن افتتاح الصفحة عندما يكون أول قسم Hero، وإلا بعد أول قسم منتجات. ألوانها للإلهام؛ ألوان كل منتج
          تحدد من الكتالوج.
        </p>
      </div>
    </details>
  );
}
