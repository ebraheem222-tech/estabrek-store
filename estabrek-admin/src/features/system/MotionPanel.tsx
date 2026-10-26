// الحركة والتحميل: how the shop's scroll scenes move (on/off and smoothness per
// section), the 3D frame rate and sharpness, the light mode, and how early things
// load. Part of the speed & cache page; saved with the same save bar. Every default
// is what the shop did before these settings existed.
import { Badge } from "../../components/ui/Badge";
import { env } from "../../config/env";
import type { MotionLimits, MotionSection, StorefrontMotion } from "../../api/cache.api";
import { NumberInput, Segmented, Toggle } from "./cacheParts";
import { PRELOAD_TEXT, SECTION_TEXT, endPreviewUrl, motionPreviewUrl, smoothText } from "./cacheText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

export function MotionPanel({
  draft,
  defaults,
  limits,
  fpsChoices,
  sections,
  bad,
  canWrite,
  dirty,
  onChange,
  onSection,
}: {
  draft: StorefrontMotion;
  defaults: StorefrontMotion;
  limits: MotionLimits;
  fpsChoices: number[];
  sections: MotionSection[];
  bad: string[];
  canWrite: boolean;
  /** Unsaved motion changes (the preview shows them before saving). */
  dirty: boolean;
  onChange: <K extends keyof StorefrontMotion>(field: K, value: StorefrontMotion[K]) => void;
  onSection: (name: MotionSection, field: "on" | "smoothMs", value: boolean | number) => void;
}) {
  const shop = env.VITE_STOREFRONT_BASE_URL;
  const num = (name: "maxStepMs" | "liteMemoryGb" | "desktopDpr" | "phoneDpr" | "lazyPercent" | "prebuildAfterMs" | "rumPercent", limit: keyof MotionLimits) => ({
    id: `motion-${name}`,
    value: draft[name],
    def: defaults[name],
    limits: limits[limit],
    invalid: bad.includes(`storefront.${name}`),
    disabled: !canWrite,
    onChange: (v: number) => onChange(name, v),
  });
  const allOn = sections.every((s) => draft.sections[s].on);

  return (
    <div className="space-y-4" data-testid="cache-motion">
      <section className={box}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold">الحركة والتحميل</h2>
            <p className="mt-1 text-sm text-white/60">
              كيف بيتحرك المتجر مع السكرول، قديش سريع الـ 3D وقديش واضح، ومتى بيبلّش يحمّل الأقسام والفيديوهات. الأرقام الافتراضية هي نفس اللي كان شغّال، فما
              بيتغيّر شي لحتى تغيّره. بعد الحفظ بيوصل للزباين خلال دقيقة تقريباً.
            </p>
            <p className="mt-2 text-xs text-white/50">المفتاح العام لحركة السكرول كلها بضل بالإعدادات («تأثيرات التمرير»). هون بتتحكم بكل قسم لحاله.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <a
              href={motionPreviewUrl(shop, draft)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
              data-testid="motion-preview"
            >
              {dirty ? "عاين التغييرات بمتصفحك" : "افتح المتجر للمعاينة"}
            </a>
            <a href={endPreviewUrl(shop)} target="_blank" rel="noreferrer" className="text-xs underline opacity-70 hover:opacity-100">
              إنهاء المعاينة
            </a>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/50">
          المعاينة بتشغّل الإعدادات اللي هون (حتى لو مش محفوظة) بهالمتصفح بس، لحتى تكبس «إنهاء المعاينة». الزباين ما بيشوفوها.
        </p>
      </section>

      <section className={box}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">حركة السكرول لكل قسم</h2>
          {!allOn ? (
            <Badge size="sm" variant="warning">
              في أقسام ثابتة
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-white/60">
          «النعومة» هي قديش بياخد القسم وقت ليلحق السكرول (مثل الألعاب: كل إطار بيقرّب من مكان السكرول). أقل = بيلحق أسرع، أكثر = أنعم وأبطأ. 65 سريع، 90
          متوازن، 110 ناعم، 140 سينمائي. القسم الموقّف بيبيّن بنسخته الثابتة (زي اللي بيطلبوا حركة أقل).
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {sections.map((name) => {
            const part = draft.sections[name];
            const path = `storefront.sections.${name}.smoothMs`;
            return (
              <li key={name} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center" data-testid={`motion-section-${name}`}>
                <Toggle
                  label={SECTION_TEXT[name].label}
                  help={SECTION_TEXT[name].note}
                  checked={part.on}
                  disabled={!canWrite}
                  onChange={(v) => onSection(name, "on", v)}
                />
                <div className={part.on ? "" : "opacity-50"}>
                  <NumberInput
                    id={`motion-${name}-smooth`}
                    label="النعومة"
                    unit="ms"
                    hint={smoothText}
                    value={part.smoothMs}
                    def={defaults.sections[name].smoothMs}
                    limits={limits.smoothMs}
                    invalid={bad.includes(path)}
                    disabled={!canWrite || !part.on}
                    onChange={(v) => onSection(name, "smoothMs", v)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
          <Toggle
            label="القفز للإطارات الرئيسية بالسكرول السريع"
            help="لما الزبون يسكرل بسرعة بالفيديو، بيروح لأقرب إطار رئيسي: أنعم بكتير، والفرق بالدقة ما بينشاف."
            checked={draft.keyframeSnap}
            disabled={!canWrite}
            onChange={(v) => onChange("keyframeSnap", v)}
          />
          <NumberInput
            label="أكبر خطوة بالإطار الواحد"
            unit="ms"
            help="إذا الجهاز علّق (تبويب مخفي)، الحركة ما بتقفز أكثر من هيك مرة وحدة."
            {...num("maxStepMs", "maxStepMs")}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={box}>
          <h2 className="font-semibold">سرعة ووضوح الـ 3D</h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-sm font-medium">أعلى سرعة (إطار بالثانية)</span>
              <p className="mt-0.5 text-xs text-white/50">الـ 3D ما بيرسم أسرع من هيك، ولا أسرع من شاشة الجهاز. الفيديوهات بتضل على 120.</p>
              <Segmented
                value={String(draft.maxFps)}
                disabled={!canWrite}
                onChange={(v) => onChange("maxFps", Number(v) as StorefrontMotion["maxFps"])}
                options={fpsChoices.map((f) => ({ value: String(f), label: String(f) }))}
              />
            </div>
            <Toggle
              label="خفّف السرعة لحالها على الأجهزة الضعيفة"
              help="إذا الجهاز ما لحق، بينزل درجة (120 → 90 → 60 → 45 → 30) وبيرجع يطلع لما يرتاح. إذا طفيته، بيضل على أعلى سرعة."
              checked={draft.adaptive}
              disabled={!canWrite}
              onChange={(v) => onChange("adaptive", v)}
            />
            <NumberInput
              label="دقة الـ 3D على الكمبيوتر"
              unit="%"
              help="من دقة الشاشة الحادة (160 = ×1.6). أعلى = أوضح وأتقل."
              hint={(v) => `× ${(v / 100).toFixed(2)}`}
              {...num("desktopDpr", "dpr")}
            />
            <NumberInput
              label="دقة الـ 3D على التلفون"
              unit="%"
              help="على 60 إطار. بسرعات أعلى بتنزل شوي لحالها لتضل الحركة ناعمة."
              hint={(v) => `× ${(v / 100).toFixed(2)}`}
              {...num("phoneDpr", "dpr")}
            />
          </div>
        </section>

        <section className={box}>
          <h2 className="font-semibold">الوضع الخفيف والتلفونات</h2>
          <p className="mt-1 text-xs text-white/60">بالوضع الخفيف الـ 3D على 30 إطار وبدقة عادية، والباقي متل ما هو.</p>
          <div className="mt-4 space-y-4">
            <NumberInput
              label="الوضع الخفيف لأجهزة الذاكرة القليلة"
              unit="GB"
              help="الأجهزة اللي ذاكرتها هيك أو أقل. 0 = أبداً."
              hint={(v) => (v === 0 ? "أبداً" : `${v} GB أو أقل`)}
              {...num("liteMemoryGb", "liteMemoryGb")}
            />
            <Toggle
              label="الوضع الخفيف مع «توفير البيانات»"
              help="لما الزبون مشغّل توفير البيانات بالتلفون."
              checked={draft.liteOnSaveData}
              disabled={!canWrite}
              onChange={(v) => onChange("liteOnSaveData", v)}
            />
            <Toggle
              label="تأثير الزجاج (التغبيش) على التلفونات"
              help="كان مطفي لأنه بياخد نص شغل كرت الشاشة وقت السكرول. الشكل تقريباً نفسه بدونه."
              checked={draft.phoneGlass}
              disabled={!canWrite}
              onChange={(v) => onChange("phoneGlass", v)}
            />
          </div>
        </section>
      </div>

      <section className={box}>
        <h2 className="font-semibold">التحميل المسبق (Lazy loading)</h2>
        <p className="mt-1 text-xs text-white/60">الأقسام والفيديوهات والـ 3D بيبلّشوا يتحمّلوا قبل ما يوصلهم الزبون بشوي، مش كلهم أول ما تفتح الصفحة.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <NumberInput
            label="مسافة التحميل المسبق"
            unit="%"
            help="100 = زي قبل (تقريباً شاشة قبل القسم). أكثر = بيتحمّل أبكر (أنعم، بس بيصرف إنترنت أكثر)."
            hint={(v) => (v === 100 ? "زي قبل" : v > 100 ? "أبكر" : "أقرب")}
            {...num("lazyPercent", "lazyPercent")}
          />
          <div>
            <span className="text-sm font-medium">تحميل فيديو الحملة</span>
            <p className="mt-0.5 text-xs text-white/50">لما الزبون يقرّب منه. «كله» = جاهز للسكرول فوراً.</p>
            <Segmented
              value={draft.videoPreload}
              disabled={!canWrite}
              onChange={(v) => onChange("videoPreload", v)}
              options={(Object.keys(PRELOAD_TEXT) as Array<StorefrontMotion["videoPreload"]>).map((k) => ({ value: k, label: PRELOAD_TEXT[k] }))}
            />
          </div>
          <Toggle
            label="جهّز الـ 3D مسبقاً وقت الزبون بيقرأ"
            help="لما الصفحة توقف عن السكرول شوي، الـ 3D بيتجهّز بالخلفية، فما بيعلّق السكرول لما يوصله."
            checked={draft.prebuild3d}
            disabled={!canWrite}
            onChange={(v) => onChange("prebuild3d", v)}
          />
          <div className={draft.prebuild3d ? "" : "opacity-50"}>
            <NumberInput
              label="بداية التجهيز"
              unit="ms"
              help="بعد فتح الصفحة بهالقد (الفصول)، ودراسة القماش بعدها بثانية، والمجموعات بعدها بثانيتين."
              hint={(v) => `${(v / 1000).toFixed(1)} ثانية`}
              {...num("prebuildAfterMs", "prebuildAfterMs")}
              disabled={!canWrite || !draft.prebuild3d}
            />
          </div>
        </div>
        <p className="mt-4 text-xs text-white/50">
          تحميل الصور الكسول وتمويهها وقت التحميل بتتحكم فيهم من الإعدادات («تحميل الصور الكسول» و«تمويه الصور أثناء التحميل»).
        </p>
      </section>

      <section className={box}>
        <h2 className="font-semibold">قياس سرعة الزباين</h2>
        <p className="mt-1 text-xs text-white/60">
          كل صفحة بتبعت تقرير صغير لما الزبون يتركها: سرعة الفتح والضغط والسكرول. بس نوع الصفحة والجهاز والنظام والأرقام، بلا عنوان ولا كوكيز.
          النتايج بـ «مراقبة السرعة والأولوية» ← «تجربة الزباين».
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <NumberInput
            label="الزيارات اللي بتقيس سرعتها"
            unit="%"
            help="100 = كل الزيارات. بالمتاجر الكبيرة 10–25% بتكفي. 0 = وقّف القياس. المتصفحات اللي طالبة «لا تتبعني» ما بتبعت شي."
            hint={(v) => (v === 0 ? "موقّف" : v === 100 ? "كل الزيارات" : `زيارة من كل ${Math.max(1, Math.round(100 / v))}`)}
            {...num("rumPercent", "rumPercent")}
          />
        </div>
      </section>
    </div>
  );
}

export default MotionPanel;
