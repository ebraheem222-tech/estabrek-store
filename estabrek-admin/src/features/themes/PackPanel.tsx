/**
 * A theme's whole pack (the shop's storeThemes/packs.ts): beside its colours and fonts, its text
 * and button styles, boxes, hovers, focus ring, icons, shapes, motion, cursor, loading indicator
 * and 3D look. Each part can come from another pack (the mix), or be turned off where it can.
 * Tried on the preview first; applied as one: the theme, the kit (header.storeKit) and the
 * editor's shared styles.
 */
import { adminLang } from "../../lib/lang";
import { tr } from "../../lib/words";
import { CUT_SHAPES, PATTERN_KINDS } from "../../studio/cutShapes";
import { FONT_CHOICES } from "./customize";
import { PACK_PARTS, fontPresetOf, isKitPart, type KitPart, type PackKit, type PackPart } from "../../studio/packs";
import type { StoreThemeInfo } from "../../studio/storeThemes";
import { OFF, type PackChoice, type PackFrom } from "./packChoice";

const PART_LABEL: Record<PackPart, () => string> = {
  colours: () => tr("الألوان", "Colours"),
  fonts: () => tr("الخطوط", "Fonts"),
  type: () => tr("أحجام العناوين", "Heading sizes"),
  button: () => tr("الأزرار", "Buttons"),
  box: () => tr("الكروت", "Cards"),
  hover: () => tr("مرور الماوس", "Mouse hover"),
  focus: () => tr("إطار التركيز", "Focus ring"),
  icons: () => tr("الأيقونات", "Icons"),
  decor: () => tr("الأشكال والنقشة والحافة", "Shapes, pattern and edge"),
  motion: () => tr("الحركة", "Motion"),
  cursor: () => tr("مؤشر الماوس", "Cursor"),
  loader: () => tr("علامة التحميل", "Loading indicator"),
  model: () => tr("شكل الـ 3D", "3D look"),
};
const NAMES: Record<string, () => string> = {
  // Buttons and boxes.
  solid: () => tr("ممتلئ", "Solid"), outline: () => tr("بإطار", "Outlined"), soft: () => tr("ناعم", "Soft"), shadow: () => tr("بظل", "Shadowed"), glow: () => tr("بتوهّج", "Glowing"), underline: () => tr("بخط تحت", "Underlined"),
  flat: () => tr("سادة", "Flat"), line: () => tr("بخط", "Lined"), glass: () => tr("زجاجي", "Glass"), pop: () => tr("بارز", "Pop"),
  // Hovers.
  none: () => tr("بدون", "None"), lift: () => tr("بيطلع", "Lifts"), grow: () => tr("بيكبر", "Grows"), magnetic: () => tr("مغناطيس", "Magnetic"), pulse: () => tr("نبض", "Pulse"), jelly: () => tr("جيلي", "Jelly"), shake: () => tr("هزّة", "Shake"), zoom: () => tr("تكبير", "Zoom"), tilt: () => tr("ميلان", "Tilt"),
  // Focus.
  ring: () => tr("حلقة", "Ring"), offset: () => tr("حلقة بعيدة", "Offset ring"), dashed: () => tr("متقطّع", "Dashed"), thick: () => tr("عريض", "Thick"),
  // Edges and motion.
  wave: () => tr("موجة", "Wave"), slant: () => tr("مائلة", "Slant"), arc: () => tr("قوس", "Arc"), zigzag: () => tr("متعرّجة", "Zigzag"),
  fade: () => tr("ظهور", "Fade"), up: () => tr("طلوع", "Rise"), "zoom-in": () => tr("تكبير", "Zoom in"), blur: () => tr("من ضباب", "From a blur"), "wipe-up": () => tr("مسح لفوق", "Wipe up"), start: () => tr("انزلاق", "Slide in"), "flip-x": () => tr("قلب", "Flip"),
  same: () => tr("متل الباقي", "Like the rest"), lines: () => tr("أسطر", "By lines"), words: () => tr("كلمات", "By words"), letters: () => tr("حروف", "By letters"), scramble: () => tr("حروف مخربطة", "Scrambled"),
  // 3D.
  neon: () => tr("نيون", "Neon"), metal: () => tr("معدن", "Metal"), toy: () => tr("لعبة", "Toy"), voxel: () => tr("مكعّبات", "Voxel"), matte: () => tr("مطفي", "Matte"), gold: () => tr("ذهب", "Gold"),
  studio: () => tr("استوديو", "Studio"), sunset: () => tr("غروب", "Sunset"), night: () => tr("ليل", "Night"), warm: () => tr("دافي", "Warm"),
  // Cursors (the shop's cms/style cursor themes).
  "theme-dark": () => tr("غامق", "Dark"), "theme-neon": () => tr("نيون", "Neon"), "theme-gaming": () => tr("ألعاب", "Gaming"), "theme-retro": () => tr("ريترو", "Retro"), "theme-minimal": () => tr("بسيط", "Minimal"),
  "theme-creative": () => tr("فنّي", "Creative"), "theme-professional": () => tr("رسمي", "Professional"), "theme-playful": () => tr("مرح", "Playful"), "theme-nature": () => tr("طبيعة", "Nature"),
  // Loading indicators (the shop's cms/effects loading animations).
  "spinner-simple": () => tr("دوّارة بسيطة", "Simple spinner"), "spinner-arc": () => tr("قوس دوّار", "Spinning arc"), "spinner-glow": () => tr("دوّارة متوهّجة", "Glowing spinner"), "spinner-orbit": () => tr("مدار", "Orbit"),
  "dots-bounce": () => tr("نقاط بتنط", "Bouncing dots"), "dots-pulse": () => tr("نقاط نابضة", "Pulsing dots"), "dots-wave": () => tr("نقاط موجة", "Wave of dots"),
  "bars-progress": () => tr("شريط تقدّم", "Progress bar"), "bars-slide": () => tr("شريط منزلق", "Sliding bar"), "bars-equalizer": () => tr("معادل صوت", "Equaliser"),
  "ring-pulse": () => tr("حلقة نابضة", "Pulsing ring"), "ring-dash": () => tr("حلقة متقطّعة", "Dashed ring"), "loader-heartbeat": () => tr("نبضة قلب", "Heartbeat"), "loader-infinity": () => tr("لانهاية", "Infinity"), "loader-pacman": () => tr("باكمان", "Pac-Man"),
};
const ICON_SETS: Record<string, string> = { lucide: "Lucide", tabler: "Tabler", "tabler-filled": "Tabler Filled", "ph-regular": "Phosphor", "ph-thin": "Phosphor Thin", "ph-light": "Phosphor Light", "ph-bold": "Phosphor Bold", "ph-fill": "Phosphor Fill", "ph-duotone": "Phosphor Duotone" };
const shapeName = (id: string) => CUT_SHAPES.find(([k]) => k === id)?.[1]() ?? id;
const patternName = (id: string) => (id === "none" ? NAMES.none() : PATTERN_KINDS.find(([k]) => k === id)?.[1]() ?? id);
const named = (v: string) => NAMES[v]?.() ?? v.replace(/^theme-/, "").replace(/-/g, " ");
/** A font pair's name as the customizer shows it ("Amiri"), from its first family ("th-amiri"). */
const fontName = (family: string) => {
  const id = fontPresetOf(family);
  return (id && FONT_CHOICES.find((f) => f.id === id)?.label().split(/[:：]/)[0]) || family.replace(/^th-/, "");
};

/** What a part of a kit is, in a few words. */
function summary(part: KitPart, k: PackKit): string {
  switch (part) {
    case "type":
      return `×${k.type.scale.toFixed(2)} · ${k.type.weight}${k.type.caps ? ` · ${tr("أحرف كبيرة", "capitals")}` : ""}`;
    case "button":
      return named(k.button.look);
    case "box":
      return named(k.box.look);
    case "hover":
      return `${tr("الأزرار", "Buttons")}: ${named(k.hover.button)} · ${tr("الصور", "Pictures")}: ${named(k.hover.image)}`;
    case "focus":
      return named(k.focus);
    case "icons":
      return ICON_SETS[k.icons] ?? k.icons;
    case "decor":
      return `${shapeName(k.decor.shape)} · ${patternName(k.decor.pattern)} · ${named(k.decor.edge)}`;
    case "motion":
      return k.motion.enter === "none" ? named("none") : `${named(k.motion.enter)} · ${tr("العناوين", "Headings")}: ${named(k.motion.heading)}`;
    case "cursor":
      return named(k.cursor);
    case "loader":
      return named(k.loader);
    case "model":
      return `${named(k.model.finish)} · ${named(k.model.lights)}`;
  }
}

export function PackPanel({ theme, themes, choice, from, onFrom, applied, busy, trying, onTrying, onApply, onRemove }: {
  theme: StoreThemeInfo;
  themes: StoreThemeInfo[];
  choice: PackChoice | null;
  from: PackFrom;
  onFrom: (from: PackFrom) => void;
  /** This theme's pack is the one applied to the store. */
  applied: boolean;
  busy: boolean;
  /** The preview shows the pack (as mixed). */
  trying: boolean;
  onTrying: (on: boolean) => void;
  onApply: (choice: PackChoice) => void;
  onRemove: () => void;
}) {
  const lang = adminLang();
  if (!theme.kit || !choice) return null;
  const byId = new Map(themes.map((t) => [t.id, t]));
  const others = themes.filter((t) => t.id !== theme.id && t.kit);
  const set = (part: PackPart, v: string) => {
    const next = { ...from, [part]: v };
    if (!v) delete next[part];
    onFrom(next);
  };
  const mixed = Object.keys(from).length > 0;

  return (
    <section className="space-y-3 rounded-xl border border-white/[0.08] p-3" aria-label={tr("حزمة الثيم", "The theme's pack")} data-testid="pack-panel">
      <div className="flex flex-wrap items-center gap-2">
        <div className="me-auto">
          <h3 className="text-sm font-semibold">{tr("الحزمة كاملة", "The whole pack")}</h3>
          <p className="text-[11px] leading-5 text-white/45">
            {tr("فوق الألوان والخطوط: ستايلات النصوص والأزرار، الكروت، مرور الماوس، الأيقونات، الأشكال، الحركة، المؤشر، التحميل وشكل الـ 3D. خُد أي جزء من حزمة تانية.", "Beyond colours and fonts: text and button styles, cards, hovers, icons, shapes, motion, cursor, loading and the 3D look. Take any part from another pack.")}
          </p>
        </div>
        {applied ? <span className="rounded-md bg-accent-500/20 px-1.5 py-0.5 text-[10px] text-accent-200" data-testid="pack-applied">{tr("مطبّقة", "Applied")}</span> : null}
      </div>

      <ul className="divide-y divide-white/[0.06] text-xs">
        {PACK_PARTS.map((part) => {
          const kit = isKitPart(part) && from[part] && from[part] !== "off" ? byId.get(from[part]!)?.kit ?? choice.kit : choice.kit;
          const swatch = part === "colours" ? (from.colours ? byId.get(from.colours) : theme)?.swatch : undefined;
          const fonts = part === "fonts" ? (from.fonts ? byId.get(from.fonts) : theme)?.fonts : undefined;
          return (
            <li key={part} className="flex flex-wrap items-center gap-2 py-1.5" data-testid="pack-part" data-part={part}>
              <span className="w-32 shrink-0 text-white/60">{PART_LABEL[part]()}</span>
              <span className="min-w-0 flex-1 truncate text-white/85" data-testid="pack-part-value">
                {swatch ? (
                  <span className="inline-flex h-4 w-24 overflow-hidden rounded align-middle" aria-hidden>
                    {swatch.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
                  </span>
                ) : fonts ? (
                  `${fontName(fonts.display)} · ${fontName(fonts.text)}`
                ) : isKitPart(part) ? (
                  from[part] === "off" ? named("none") : summary(part, kit)
                ) : null}
              </span>
              <select
                className="max-w-[11rem] rounded-lg border border-white/[0.1] bg-surface-925 px-1.5 py-1 text-[11px] text-white"
                value={from[part] ?? ""}
                onChange={(e) => set(part, e.target.value)}
                aria-label={tr(`${PART_LABEL[part]()} من`, "{0} from", [PART_LABEL[part]()])}
                data-testid="pack-part-from"
              >
                <option value="">{tr("من هالحزمة", "From this pack")}</option>
                {isKitPart(part) && OFF[part] ? <option value="off">{tr("بدون", "Off")}</option> : null}
                {others.map((t) => (
                  <option key={t.id} value={t.id}>{t.name[lang] || t.name.en}</option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-1">
        <button type="button" aria-pressed={trying} onClick={() => onTrying(!trying)} className={`rounded-lg px-2.5 py-1.5 text-xs ${trying ? "bg-white/[0.16] text-white" : "bg-white/[0.06] text-white/80 hover:bg-white/[0.1]"}`} data-testid="pack-try">
          {trying ? tr("وقّف التجربة", "Stop trying it") : tr("جرّبها على المعاينة", "Try it on the preview")}
        </button>
        <button type="button" disabled={busy} onClick={() => onApply(choice)} className="rounded-lg bg-accent-500 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40" data-testid="pack-apply">
          {mixed ? tr("طبّق الحزمة المخلوطة", "Apply the mixed pack") : tr("طبّق الحزمة كاملة", "Apply the whole pack")}
        </button>
        {mixed ? <button type="button" className="rounded-lg px-2 py-1.5 text-xs text-white/55 hover:text-white" onClick={() => onFrom({})} data-testid="pack-unmix">{tr("رجّع الأجزاء", "Undo the mix")}</button> : null}
        {applied ? <button type="button" disabled={busy} onClick={onRemove} className="ms-auto rounded-lg px-2 py-1.5 text-xs text-white/55 hover:text-red-300 disabled:opacity-40" data-testid="pack-remove">{tr("شيل الحزمة (خلّي الثيم)", "Take the pack off (keep the theme)")}</button> : null}
      </div>
    </section>
  );
}
