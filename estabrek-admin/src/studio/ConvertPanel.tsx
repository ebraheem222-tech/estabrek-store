/**
 * Turning old sections into the new editor's own elements (convert.ts): one section from its
 * panel, or every old section of the page at once. What can't come along is said before; the
 * old section goes to the bin as one change, so Undo brings it back.
 */
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { convertPreview, type Converted, type Dropped, type OldSection, type RoseRole } from "./convert";

const box = "space-y-2 rounded-xl border border-white/[0.08] p-3";

const DROPPED: Record<Dropped, () => string> = {
  roseLook: () => tr("شكل تصميم الورد لهالقسم (بيصير بشكل العناصر الجديدة)", "The rose design's own look for this section (it takes the new elements' look)"),
  look: () => tr("ستايل القسم القديم (كلاسات Tailwind)", "The old section's own look (Tailwind classes)"),
  layout: () => tr("ترتيب الافتتاح الخاص (نصّين أو تلات أعمدة أو ثيم)", "The opening's special layout (split, three columns or a theme)"),
  description: () => tr("وصف كل باقة", "Each plan's description"),
  bio: () => tr("نبذة كل شخص", "Each person's bio"),
  socials: () => tr("روابط التواصل بعد الأول", "Social links after the first"),
  formFields: () => tr("حقول النموذج الخاصة (النموذج الجديد إله حقوله)", "The form's own fields (the new form has its own)"),
  map: () => tr("الخريطة (رابطها ما فيه عنوان)", "The map (its link has no address)"),
  icons: () => tr("أيقونات بأسماء مش معروفة", "Icons by unknown names"),
  pictures: () => tr("صور مش من موقع آمن (http أو data)", "Pictures not from a safe address (http or data)"),
  links: () => tr("روابط مش آمنة", "Unsafe links"),
  extra: () => tr("الزيادة عن العدد المسموح", "What goes beyond the allowed number"),
};
const WHY: Record<Exclude<Converted, { ok: true }>["why"], () => string> = {
  rose: () => tr("هاد افتتاح الورد: بيتعدّل من هون مباشرة، وبيضل متل ما هو.", "This is the rose opening: it's set right here, and stays as it is."),
  html: () => tr("قسم HTML خاص: عدّل الـ HTML تبعه من فوق، وبيضل قسم قديم.", "A custom HTML section: edit its HTML above; it stays an old section."),
  video: () => tr("فيديو يوتيوب أو فيميو: العناصر الجديدة بتشغّل ملفات فيديو بس، فبيضل قسم قديم.", "A YouTube or Vimeo clip: the new elements play video files only, so it stays an old section."),
  nested: () => tr("شبكة فيها أقسام تانية: بتضل قسم قديم.", "A grid holding other sections: it stays an old section."),
  global: () => tr("هيدر أو فوتر أو إعلان عام للمتجر: بيضل متل ما هو.", "The store's global header, footer or announcement: it stays as it is."),
  unknown: () => tr("نوع قديم مش معروف: بيضل متل ما هو.", "An unknown old type: it stays as it is."),
};

export function ConvertPanel({ section, main, rose, busy, onConvert }: { section: OldSection; main: Lang; rose?: RoseRole; busy: boolean; onConvert: () => void }) {
  const r = convertPreview(section, main, rose);
  return (
    <div className={box} data-testid="studio-convert">
      <div className="text-xs font-medium text-white/70">{tr("لعناصر المحرر الجديد", "To the new editor's elements")}</div>
      {r.ok ? (
        <>
          <p className="text-[11px] leading-5 text-white/50">{tr("بيصير قسم جديد بكلامه بكل اللغات وصوره وروابطه وقوائمه، وبيتعدّل كله من هون. القديم بيروح للسلة، و«تراجع» برجّعه.", "It becomes a new section with its words in every language, its pictures, links and lists, all edited here. The old one goes to the bin; Undo brings it back.")}</p>
          {r.dropped.length ? (
            <div className="text-[11px] leading-5 text-amber-200/80" data-testid="studio-convert-dropped">
              {tr("ما بيجي معه:", "Doesn't come along:")}
              <ul className="list-disc ps-4">{r.dropped.map((d) => <li key={d}>{DROPPED[d]()}</li>)}</ul>
            </div>
          ) : null}
          <button type="button" disabled={busy} onClick={onConvert} className="w-full rounded-lg bg-accent-500 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40" data-testid="studio-convert-go">
            {tr("حوّله لعناصر جديدة", "Turn it into new elements")}
          </button>
        </>
      ) : (
        <p className="text-[11px] leading-5 text-white/50" data-testid="studio-convert-why" data-why={r.why}>{WHY[r.why]()}</p>
      )}
    </div>
  );
}

/** Every old section of the page at once: how many can come along, and the button. */
export function ConvertAllPanel({ sections, main, roseOf, busy, onConvert }: { sections: OldSection[]; main: Lang; roseOf: (s: OldSection) => RoseRole | undefined; busy: boolean; onConvert: () => void }) {
  if (!sections.length) return null;
  const can = sections.filter((s) => convertPreview(s, main, roseOf(s)).ok).length;
  const rose = sections.some((s) => roseOf(s) === "look");
  return (
    <div className={box} data-testid="studio-convert-all">
      <div className="text-xs font-medium text-white/70">{tr("الأقسام القديمة بهالصفحة", "This page's old sections")}</div>
      <p className="text-[11px] leading-5 text-white/50">
        {tr(`${sections.length} قسم قديم، منهم ${can} بيتحوّلوا لعناصر جديدة. الباقي بيضل متل ما هو.`, "{0} old sections, {1} of them can become new elements. The rest stay as they are.", [sections.length, can])}
      </p>
      {rose ? <p className="text-[11px] leading-5 text-amber-200/80" data-testid="studio-convert-all-rose">{tr("المتجر بتصميم الورد: الأقسام المحوّلة بتاخد شكل العناصر الجديدة بدل شكل الورد.", "The store wears the rose design: turned sections take the new elements' look instead of the rose one.")}</p> : null}
      <button type="button" disabled={busy || !can} onClick={onConvert} className="w-full rounded-lg bg-white/[0.08] px-2 py-1.5 text-xs text-white hover:bg-white/[0.12] disabled:opacity-40" data-testid="studio-convert-all-go">
        {tr(`حوّل الـ ${can} مرة وحدة`, "Turn all {0} at once", [can])}
      </button>
    </div>
  );
}
