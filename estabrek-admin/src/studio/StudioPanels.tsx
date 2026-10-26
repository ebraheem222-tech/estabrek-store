/**
 * The new editor's side panels for what's selected: an old section (move, hide,
 * delete, its colours and motion, the opening's switches and film lines), a field
 * inside it (edit the words, change the picture or clip), a rose scene (move,
 * hide), and the shop's theme (preview, then save for the whole shop).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import { VideoPickerModal } from "../components/media/VideoPickerModal";
import { tr } from "../lib/words";
import { adminLang, type Lang } from "../lib/lang";
import { ROSE_ID, type StoreThemeInfo } from "./storeThemes";
import { ROSE_PALETTES } from "./themes";

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
/** The film opening's own line colours (the shop's RoseHeroFilm LINE_COLORS). */
const FILM_COLORS = ["#b2486a", "#7c5fa8", "#3f7f78", "#a87a2c"];
const PALETTE_LABEL: Record<string, () => string> = {
  pearl: () => tr("لؤلؤي", "Pearl"),
  blush: () => tr("وردي فاتح", "Blush"),
  rose: () => tr("وردي دافئ", "Warm rose"),
  lilac: () => tr("ليلكي", "Lilac"),
  berry: () => tr("توتي", "Berry"),
};

export function SectionActions({ canUp, canDown, hidden, busy, onUp, onDown, onToggle, onDelete }: { canUp: boolean; canDown: boolean; hidden: boolean; busy: boolean; onUp: () => void; onDown: () => void; onToggle: () => void; onDelete?: () => void }) {
  return (
    <div className="flex flex-wrap gap-1" data-testid="studio-section-actions">
      <button type="button" className={btn} disabled={busy || !canUp} onClick={onUp}>↑ {tr("لفوق", "Up")}</button>
      <button type="button" className={btn} disabled={busy || !canDown} onClick={onDown}>↓ {tr("لتحت", "Down")}</button>
      <button type="button" className={btn} disabled={busy} onClick={onToggle} data-testid="studio-toggle-visible">{hidden ? tr("إظهار", "Show") : tr("إخفاء", "Hide")}</button>
      {onDelete ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={onDelete} data-testid="studio-delete">{tr("حذف", "Delete")}</button> : null}
    </div>
  );
}

/** Words that save when the field is left (or Enter), only if they changed. */
export function Field({ label, value, multiline, onSave, testId }: { label: string; value: string; multiline?: boolean; onSave: (v: string) => void; testId?: string }) {
  const [v, setV] = useState(value);
  const [was, setWas] = useState(value);
  if (was !== value) {
    setWas(value);
    setV(value);
  }
  const save = () => v !== value && onSave(v);
  const cls = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
  return (
    <label className="block text-[11px] text-white/55">
      {label}
      {multiline ? (
        <textarea className={`${cls} min-h-[84px]`} value={v} onChange={(e) => setV(e.target.value)} onBlur={save} data-testid={testId} />
      ) : (
        <input className={cls} value={v} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} data-testid={testId} />
      )}
    </label>
  );
}

export function SectionSettings({ type, data, words, busy, onSet }: {
  type: string;
  /** The section's data in the main language (switches, colours). */
  data: Record<string, unknown>;
  /** The section's words in the language being edited. */
  words: Record<string, unknown>;
  busy: boolean;
  onSet: (path: Array<string | number>, value: unknown, inLanguage?: boolean) => void;
}) {
  const p = (data.rosePresentation ?? {}) as { palette?: string; motionIntensity?: string };
  const toggle = (key: string, label: string, def = true) => (
    <label key={key} className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={data[key] === undefined ? def : data[key] !== false} onChange={(e) => onSet([key], e.target.checked)} data-testid={`studio-toggle-${key}`} />
    </label>
  );
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] p-3" data-testid="studio-settings">
      <div className="text-xs font-medium text-white/70">{tr("إعدادات القسم", "Section settings")}</div>
      <label className="block text-[11px] text-white/55">
        {tr("ألوان القسم", "Section colours")}
        <select className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs" disabled={busy} value={p.palette ?? ""} onChange={(e) => onSet(["rosePresentation", "palette"], e.target.value || null)}>
          <option value="">{tr("تلقائية حسب المشهد", "Automatic for the scene")}</option>
          {ROSE_PALETTES.map((k) => <option key={k} value={k}>{PALETTE_LABEL[k]()}</option>)}
        </select>
        <span className="mt-1 block text-[10px] leading-4 text-white/35">{tr("بتلوّن الصفحة مع السكرول بالصفحات الداخلية. بالرئيسية الألوان من المشاهد (المواسم والقصص).", "They colour the page with the scroll on inner pages. On the home the colours come from the scenes (seasons and stories).")}</span>
      </label>
      <label className="block text-[11px] text-white/55">
        {tr("الحركة", "Motion")}
        <select className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs" disabled={busy} value={p.motionIntensity ?? "cinematic"} onChange={(e) => onSet(["rosePresentation", "motionIntensity"], e.target.value)}>
          <option value="cinematic">{tr("سينمائية", "Cinematic")}</option>
          <option value="subtle">{tr("هادئة", "Subtle")}</option>
        </select>
      </label>
      {type === "HERO" ? (
        <div className="space-y-2 border-t border-white/[0.06] pt-3">
          {toggle("roseHeroFilm", tr("فيلم الافتتاح مع السكرول", "The scroll film opening"))}
          {toggle("roseVideoEnabled", tr("الفيديو تحت الافتتاح", "The clip under the opening"))}
          {toggle("rose3dEnabled", tr("مشهد القماش", "The fabric scene"))}
          {toggle("roseSeasonsEnabled", tr("المواسم", "Seasons"))}
          {toggle("roseStoriesEnabled", tr("قصص الكولكشن", "Collection stories"))}
          {toggle("roseInstagramEnabled", tr("إنستغرام", "Instagram"))}
          <Field
            label={tr("سطور الفيلم (سطر لكل لفّة)", "Film lines (one per turn)")}
            multiline
            value={Array.isArray(words.roseFilmLines) ? words.roseFilmLines.join("\n") : ""}
            onSave={(v) => onSet(["roseFilmLines"], v.split("\n").map((x) => x.trim()).filter(Boolean), true)}
            testId="studio-film-lines"
          />
          <Field label={tr("السطر الأخير", "Closing line")} value={typeof words.roseFilmClosing === "string" ? words.roseFilmClosing : ""} onSave={(v) => onSet(["roseFilmClosing"], v.trim() || null, true)} />
          <div className="space-y-1.5" data-testid="studio-film-colors">
            <div className="text-[11px] text-white/55">{tr("ألوان سطور الفيلم (بالدور)", "The film lines' colours (in turn)")}</div>
            {FILM_COLORS.map((own, i) => {
              const list = Array.isArray(data.roseFilmColors) ? (data.roseFilmColors as unknown[]) : [];
              return (
                <SeedPick
                  key={i}
                  label={`${tr("سطر", "Line")} ${i + 1}`}
                  own={own}
                  value={list[i]}
                  busy={busy}
                  onPick={(hex) => {
                    const next = FILM_COLORS.map((_, j) => (j === i ? hex ?? "" : typeof list[j] === "string" ? String(list[j]) : ""));
                    onSet(["roseFilmColors"], next.some(Boolean) ? next : null);
                  }}
                />
              );
            })}
          </div>
          <p className="text-[11px] leading-5 text-white/40">{tr("الفاضي بياخد كلام المتجر الجاهز.", "Empty takes the shop's own words.")}</p>
        </div>
      ) : null}
    </div>
  );
}

const HEX6 = /^#[0-9a-f]{6}$/i;

/** A colour of the shop's design that can be changed: its own until one is picked. */
export function SeedPick({ label, value, own, busy, onPick, testId }: { label: string; value: unknown; own: string; busy: boolean; onPick: (hex: string | null) => void; testId?: string }) {
  const mine = typeof value === "string" && HEX6.test(value) ? value : null;
  const [hex, setHex] = useState(mine ?? own);
  const [was, setWas] = useState(mine);
  if (was !== mine) {
    setWas(mine);
    setHex(mine ?? own);
  }
  return (
    <div className="flex items-center gap-2 text-[11px] text-white/60" data-testid={testId}>
      <input type="color" aria-label={label} className="h-7 w-9 shrink-0 cursor-pointer rounded border border-white/[0.1] bg-transparent" disabled={busy} value={hex} onChange={(e) => setHex(e.target.value)} onBlur={() => hex.toLowerCase() !== (mine ?? own).toLowerCase() && onPick(hex)} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {mine ? (
        <button type="button" className={btn} disabled={busy} onClick={() => onPick(null)}>{tr("الجاهز", "The shop's own")}</button>
      ) : (
        <span className="text-[10px] text-white/35">{tr("الجاهز", "The shop's own")}</span>
      )}
    </div>
  );
}

/** The rose scenes' own colours (each turns the page's and header's colours while it shows). */
const SCENE_SEEDS: Record<string, Array<[string, string, () => string]>> = {
  seasons: [["winter", "#7d8ec4", () => tr("الشتاء", "Winter")], ["spring", "#e9a27c", () => tr("الربيع", "Spring")]],
  stories: [["accessories", "#c4a266", () => tr("الإكسسوارات", "Accessories")], ["kids", "#e59b9b", () => tr("الأطفال", "Kids")], ["incense", "#9b6b4e", () => tr("المباخر", "Incense")]],
};
/** Where a scene's products and links come from. */
const SCENE_SOURCE: Record<string, () => string> = {
  seasons: () => tr("المنتجات من تصنيفات اسمها فيه شتاء أو ربيع أو صيف (شتوي، ربيع، صيفي…). بلاها بيطلع المشهد بصور جاهزة.", "The products come from categories named for winter, spring or summer. Without them the scene shows ready pictures."),
  stories: () => tr("كل فصل من تصنيف: إكسسوارات، أطفال، بخور. فصل بلا تصنيف ما بيطلع.", "Each chapter comes from a category: accessories, kids, incense. A chapter without its category doesn't show."),
  instagram: () => tr("الحساب من رابط إنستغرام بالإعدادات، والصور من أول صور المنتجات.", "The account is the Instagram link in the settings; the pictures are the first product pictures."),
  fabric: () => tr("دراسة القماش بتطلع بعد أول قسم منتجات.", "The fabric study shows after the first products section."),
};

/**
 * A rose scene's own settings: shown or not, its colours (the winter colour is the lilac
 * that fills the page while the seasons show), where its products come from. Its words
 * change by clicking them on the page.
 */
export function SceneSettings({ block, scene, shown, busy, onShown, onSeed }: {
  block: string;
  /** The opening's roseScenes.<block>. */
  scene: Record<string, unknown> | undefined;
  shown: boolean;
  busy: boolean;
  onShown: (on: boolean) => void;
  onSeed: (part: string, hex: string | null) => void;
}) {
  const seeds = SCENE_SEEDS[block] ?? [];
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] p-3" data-testid="studio-scene">
      <div className="text-xs font-medium text-white/70">{tr("إعدادات المشهد", "Scene settings")}</div>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-white/75">{tr("ظاهر بالصفحة", "Shown on the page")}</span>
        <input type="checkbox" disabled={busy} checked={shown} onChange={(e) => onShown(e.target.checked)} data-testid="studio-scene-shown" />
      </label>
      {seeds.length ? (
        <div className="space-y-1.5">
          <div className="text-[11px] text-white/55">{tr("ألوان المشهد", "The scene's colours")}</div>
          {seeds.map(([part, own, name]) => (
            <SeedPick key={part} label={name()} own={own} value={(scene?.[part] as Record<string, unknown> | undefined)?.seed} busy={busy} onPick={(hex) => onSeed(part, hex)} testId={`studio-seed-${part}`} />
          ))}
          <p className="text-[10px] leading-4 text-white/40">
            {block === "seasons"
              ? tr("وقت المشهد، الصفحة وراسها بيلبسوا لون الموسم: لون الشتاء الجاهز هو الليلكي.", "While the scene shows, the page and its header wear the season's colour: the ready winter colour is the lilac.")
              : tr("وقت المشهد، الصفحة وراسها بيلبسوا لون الفصل.", "While the scene shows, the page and its header wear the chapter's colour.")}
          </p>
        </div>
      ) : null}
      <p className="text-[11px] leading-5 text-white/45">{SCENE_SOURCE[block]?.()}</p>
      <p className="text-[11px] leading-5 text-white/45">{tr("لتغيير أي كلمة بالمشهد: كبسة عليها بالصفحة، وبتكتبها بكل لغة.", "To change any word of the scene: click it on the page, and write it in each language.")}</p>
    </div>
  );
}

/**
 * A field's words in each language the store shows. The main language's are the shop's
 * words for all of them until a language has its own; empty takes a language's own away.
 */
export function WordsPanel({ langs, main, names, multiline, busy, valueOf, onSave }: {
  langs: Lang[];
  main: Lang;
  names: Record<Lang, string>;
  multiline: boolean;
  busy: boolean;
  valueOf: (l: Lang) => string;
  onSave: (l: Lang, v: string) => void;
}) {
  const order = [main, ...langs.filter((l) => l !== main)];
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-words">
      <div className="text-xs font-medium text-white/70">{tr("الكلام بكل لغة", "The words in each language")}</div>
      {order.map((l) => (
        <div key={l} className={busy ? "pointer-events-none opacity-60" : ""} data-lang={l}>
          <Field label={l === main ? `${names[l]} (${tr("الأساسية", "main")})` : names[l]} multiline={multiline} value={valueOf(l)} onSave={(v) => onSave(l, v)} testId={`studio-words-${l}`} />
        </div>
      ))}
      <p className="text-[10px] leading-4 text-white/35">{tr("الفاضي بياخد كلام المتجر الجاهز، أو كلام اللغة الأساسية.", "Empty takes the shop's own words, or the main language's.")}</p>
    </div>
  );
}

/** Where a piece's words and pictures come from (the editor changes its look and motion only). */
const PART_SOURCE: Record<string, () => string> = {
  products: () => tr("الاسم والسعر والصور بتيجي من المنتج نفسه، وبتتغيّر من صفحة المنتجات.", "The name, price and pictures come from the product itself and change on the products page."),
  categories: () => tr("اسم التصنيف ورابطه بيجوا من صفحة التصنيفات.", "The category's name and link come from the categories page."),
  moving: () => tr("بيتحرّك لحاله مع المشهد. بتقدر تخفي المشهد كله من إعداداته.", "It moves by itself with the scene. The whole scene can be hidden from its settings."),
  instagram: () => tr("الصور من أول صور المنتجات، والحساب من رابط إنستغرام بالإعدادات.", "The pictures are the first product pictures, and the account is the Instagram link in the settings."),
  design: () => tr("جزء من تصميم القسم. كلامه وصوره بتتغيّر من إعدادات القسم.", "Part of the section's design. Its words and pictures change from the section's settings."),
};
const sourceOf = (name: string) =>
  name.startsWith("card") ? "products" : name === "category" ? "categories" : ["mascot", "scene", "meter", "steps", "film", "cue"].includes(name) ? "moving" : name === "tiles" || name === "tile" || name === "handle" ? "instagram" : "design";

export function PartInfo({ extra }: { extra: { kind: "part"; name: string; n: number; count: number } | { kind: "auto"; tag: string } }) {
  const source = extra.kind === "part" ? sourceOf(extra.name) : "design";
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-3 text-[11px] leading-5 text-white/55" data-testid="studio-part">
      <p>{PART_SOURCE[source]()}</p>
      {extra.kind === "part" && extra.count > 1 ? <p className="text-white/40">{tr(`واحدة من ${extra.count} متلها بهالقسم.`, "One of {0} alike in this section.", [extra.count])}</p> : null}
      {source === "products" ? <Link to="/admin/catalog/products" className="block text-accent-300 hover:underline">{tr("صفحة المنتجات", "The products page")}</Link> : null}
      {source === "categories" ? <Link to="/admin/catalog/categories" className="block text-accent-300 hover:underline">{tr("صفحة التصنيفات", "The categories page")}</Link> : null}
    </div>
  );
}

export function MediaSlot({ kind, value, busy, onSet }: { kind: "image" | "video"; value: string; busy: boolean; onSet: (url: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(value);
  const [was, setWas] = useState(value);
  if (was !== value) {
    setWas(value);
    setUrl(value);
  }
  const ok = /^(\/(?!\/)|https:\/\/)\S+$/.test(url.trim());
  return (
    <div className="space-y-2" data-testid="studio-media">
      {kind === "image" ? (
        <>
          {value ? <img src={value} alt="" className="h-28 w-full rounded-lg object-cover" /> : <p className="text-[11px] text-white/45">{tr("هلّق: صورة المتجر الجاهزة", "Now: the shop's own picture")}</p>}
          <div className="flex flex-wrap gap-1">
            <button type="button" className={btn} disabled={busy} onClick={() => setOpen(true)} data-testid="studio-pick-image">{tr("اختيار صورة", "Choose a picture")}</button>
            {value ? <button type="button" className={btn} disabled={busy} onClick={() => onSet(null)}>{tr("رجوع للجاهزة", "Back to the shop's own")}</button> : null}
          </div>
          <MediaLibraryModal open={open} onClose={() => setOpen(false)} title={tr("صورة القسم", "The section's picture")} onSelect={(u) => { setOpen(false); onSet(u); }} />
        </>
      ) : (
        <>
          <label className="block text-[11px] text-white/55">
            {tr("رابط الفيديو (MP4، من مكتبة الفيديوهات أو أي رابط https)", "Video link (MP4, from the video library or any https link)")}
            <input dir="ltr" className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/clip.mp4" data-testid="studio-video-url" />
          </label>
          <div className="flex flex-wrap gap-1">
            <button type="button" className={btn} disabled={busy || !ok || url.trim() === value} onClick={() => onSet(url.trim())}>{tr("حفظ", "Save")}</button>
            <button type="button" className={btn} disabled={busy} onClick={() => setOpen(true)} data-testid="studio-pick-video">{tr("من مكتبة الفيديوهات", "From the video library")}</button>
            {value ? <button type="button" className={btn} disabled={busy} onClick={() => onSet(null)}>{tr("رجوع للجاهز", "Back to the shop's own")}</button> : null}
          </div>
          <VideoPickerModal open={open} onClose={() => setOpen(false)} onPick={({ url: picked }) => { setOpen(false); onSet(picked); }} />
        </>
      )}
    </div>
  );
}

export function ThemePanel({ themes, failed, current, preview, mode, onPreview, onMode, onSave, saving }: { themes: StoreThemeInfo[]; failed?: boolean; current: string; preview: string | null; mode: "light" | "dark" | null; onPreview: (id: string | null) => void; onMode: (m: "light" | "dark" | null) => void; onSave: () => void; saving: boolean }) {
  const shown = preview ?? current;
  const lang = adminLang();
  const options = [{ id: ROSE_ID, name: tr("تصميم الورد", "The rose design"), swatch: ["#fff8f4", "#e8b4ce", "#7d2448"], modes: [] as string[] }, ...themes.map((t) => ({ id: t.id, name: t.name[lang] || t.name.en, swatch: [t.swatch[0], t.swatch[2], t.swatch[3]], modes: t.modes as string[] }))];
  const modes = options.find((t) => t.id === shown)?.modes ?? [];
  return (
    <div className="space-y-3" data-testid="studio-theme">
      <div className="text-sm font-semibold">{tr("ثيم المتجر", "Store theme")}</div>
      <p className="text-[11px] leading-5 text-white/45">{tr("الاختيار بيبيّن هون بس. الحفظ بيغيّره لكل المتجر.", "A choice shows here only. Saving changes it for the whole store.")}</p>
      {failed ? <p className="text-[11px] text-amber-200/80">{tr("ما قدرنا نجيب الثيمات من المتجر.", "The themes couldn't be loaded from the store.")}</p> : null}
      <div className="grid grid-cols-1 gap-2">
        {options.map((t) => (
          <button key={t.id} type="button" onClick={() => onPreview(t.id === current ? null : t.id)} aria-pressed={shown === t.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-start text-xs ${shown === t.id ? "border-accent-400/60 bg-white/[0.08]" : "border-white/[0.08] hover:bg-white/[0.04]"}`} data-testid="studio-theme-option" data-theme-id={t.id}>
            <span className="flex">
              {t.swatch.map((c, i) => <span key={i} className="-ms-1 h-4 w-4 rounded-full border border-white/20 first:ms-0" style={{ background: c }} />)}
            </span>
            <span className="flex-1">{t.name}</span>
            {t.id === current ? <span className="text-[10px] text-accent-300">{tr("الحالي", "Current")}</span> : null}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {([null, "light", "dark"] as const).filter((m) => m === null || modes.includes(m)).map((m) => (
          <button key={String(m)} type="button" className={`${btn} ${mode === m ? "bg-white/[0.16]" : ""}`} onClick={() => onMode(m)}>
            {m === null ? tr("حسب المتجر", "As the store") : m === "light" ? tr("فاتح", "Light") : tr("غامق", "Dark")}
          </button>
        ))}
      </div>
      <button type="button" className="w-full rounded-lg bg-accent-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-40" disabled={(!preview && !mode) || saving} onClick={onSave} data-testid="studio-theme-save">
        {tr("حفظ الثيم لكل المتجر", "Save the theme for the whole store")}
      </button>
    </div>
  );
}
