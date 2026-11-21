// Settings → السلة والدفع → تصميم السلة المصغّرة: the small bag that opens when a shopper adds a piece, in one of 100
// designs (estabrek-storefront/src/lib/miniBagDesigns.ts), or as it always was (""). Each design is drawn as it
// will look in the shop: the store's own theme colours, its own products (drawn samples while it has none), on a
// computer and on a phone; the picked one moves as it does in the shop, and opens in the shop itself.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  MINI_BAG_DESIGNS, MINI_BAG_FAMILIES, MINI_BAG_FAMILY_NAMES, MINI_BAG_LINES_NAMES, MINI_BAG_MOODS, MINI_BAG_MOOD_NAMES,
  MINI_BAG_PLACE_NAMES, MINI_BAG_TONE_NAMES, miniBagById, miniBagsFor, type MiniBagDesign, type MiniBagFamily, type MiniBagMood,
} from "../../../../estabrek-storefront/src/lib/miniBagDesigns";
import { adminLang, isRtl } from "../../lib/lang";
import { say } from "../../studio/say";
import { currentStoreThemeId, loadStoreThemes, shopOrigin, ROSE_ID } from "../../studio/storeThemes";
import { listProducts } from "../../api/catalog.api";
import { MiniBagPreview, paletteVars, type SampleLine } from "./MiniBagPreview";

/** A drawn product photo, while the store has none of its own. */
const drawn = (a: string, b: string, shape: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/>${shape}</svg>`)}`;
const SAMPLE_PHOTOS = [
  drawn("#f3d9e2", "#c98aa4", `<path d="M120 190h160l-14 200H134z" fill="#fff" opacity=".85"/><path d="M160 190v-30a40 40 0 0 1 80 0v30" fill="none" stroke="#fff" stroke-width="14" opacity=".85"/>`),
  drawn("#dbe7f3", "#7f9cc4", `<rect x="150" y="150" width="100" height="230" rx="26" fill="#fff" opacity=".85"/><rect x="175" y="110" width="50" height="50" rx="10" fill="#fff" opacity=".7"/>`),
  drawn("#f6e7c8", "#d2a25a", `<circle cx="200" cy="250" r="96" fill="#fff" opacity=".8"/><circle cx="200" cy="250" r="50" fill="#d2a25a" opacity=".5"/>`),
];
type Sample = { lines: SampleLine[]; total: string };
const sampleLines = (currency: string): Sample => {
  const rows: Array<[string, string, string, number, number]> = [
    ["a", say("قطعة مختارة|A chosen piece|פריט נבחר"), say("وردي · M|Pink · M|ורוד · M"), 180, 1],
    ["b", say("الأكثر طلباً|Best seller|הנמכר ביותר"), say("أزرق|Blue|כחול"), 95, 2],
    ["c", say("وصل جديد|Just in|הגיע עכשיו"), "", 60, 1],
  ];
  return {
    lines: rows.map(([id, title, detail, price, quantity], i) => ({ id, title, detail, price: money(price * quantity, currency), photo: SAMPLE_PHOTOS[i], quantity })),
    total: money(rows.reduce((n, r) => n + r[3] * r[4], 0), currency),
  };
};

const money = (n: number | null | undefined, code: string) => {
  if (n == null || !Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(adminLang() === "ar" ? "ar" : adminLang() === "he" ? "he-IL" : "en-GB", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ${code}`;
  }
};

/** The store's theme colours and fonts (none = the rose colours, which the shop's stylesheet already falls back to). */
function useStoreLook(header: unknown) {
  const [look, setLook] = useState<{ vars: CSSProperties; name: string } | null>(null);
  useEffect(() => {
    let alive = true;
    loadStoreThemes()
      .then(({ themes, defaults }) => {
        if (!alive) return;
        const id = currentStoreThemeId(header, defaults);
        const theme = id === ROSE_ID ? null : themes.find((t) => t.id === id);
        if (!theme) return setLook(null);
        const choice = (header as { storeTheme?: { mode?: "light" | "dark" | null } } | null)?.storeTheme;
        const mode = choice?.mode && theme.palettes?.[choice.mode] ? choice.mode : theme.mode;
        setLook({ vars: paletteVars(theme.palettes?.[mode] ?? theme.palettes?.[theme.mode], theme.fonts), name: theme.name[adminLang()] });
      })
      .catch(() => alive && setLook(null));
    return () => { alive = false; };
    // The theme is read once per opening of the settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return look;
}

/** Up to three of the store's own products with a photo, as the bag's sample pieces. */
function useSampleLines(currency: string): Sample {
  const [sample, setSample] = useState<Sample>(() => sampleLines(currency));
  useEffect(() => {
    let alive = true;
    listProducts("active")
      .then((list) => {
        if (!alive || !Array.isArray(list)) return;
        const own = list.filter((p) => p?.summary?.thumbUrl && p.summary.priceMin != null).slice(0, 3);
        if (own.length < 2) return;
        const qty = (i: number) => (i === 1 ? 2 : 1);
        setSample({
          lines: own.map((p, i) => ({
            id: p.id,
            title: p.title,
            detail: p.summary?.colors?.[0]?.name ?? "",
            price: money((p.summary?.priceMin ?? 0) * qty(i), currency),
            photo: p.summary?.thumbUrl ?? "",
            quantity: qty(i),
          })),
          total: money(own.reduce((n, p, i) => n + (p.summary?.priceMin ?? 0) * qty(i), 0), currency),
        });
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [currency]);
  return sample;
}

const words = (w: { ar: string; en: string; he: string }) => w[adminLang()];

export function MiniBagPicker({ value, onChange, header, currency = "ILS", testid = "minibag" }: {
  value: string;
  onChange: (id: string) => void;
  /** The settings' header: the store's theme and its kind of store. */
  header: unknown;
  currency?: string | null;
  testid?: string;
}) {
  const lang = adminLang();
  const dir = isRtl(lang) ? "rtl" : "ltr";
  const industry = (header as { identity?: { industry?: string } } | null)?.identity?.industry ?? null;
  const look = useStoreLook(header);
  const { lines, total } = useSampleLines(currency || "ILS");
  const [family, setFamily] = useState<MiniBagFamily | "all">("all");
  const [mood, setMood] = useState<MiniBagMood | "all">("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => miniBagsFor(industry), [industry]);
  const found = list.filter((x) =>
    (family === "all" || x.family === family) &&
    (mood === "all" || x.mood === mood) &&
    (!q.trim() || [x.name.ar, x.name.en, x.name.he, x.id].some((w) => w.toLowerCase().includes(q.trim().toLowerCase()))));
  const picked = miniBagById(value);

  // The picked one moves as in the shop: closed, then open (again on «شغّل الحركة»).
  const [open, setOpen] = useState(true);
  const timer = useRef(0);
  const replay = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
    timer.current = window.setTimeout(() => setOpen(true), 650);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => { if (picked) replay(); }, [picked?.id]);

  const shop = shopOrigin();
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs transition ${on ? "border-accent-400 bg-accent-500/15" : "border-white/10 hover:bg-white/5"}`;

  return (
    <div className="space-y-4" data-testid={testid}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3" data-testid={`${testid}-picked`}>
        {picked ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-3">
              <MiniBagPreview design={picked} width={560} lines={lines} total={total} vars={look?.vars} dir={dir} still={false} open={open} testid={`${testid}-big`} />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-base font-semibold"><bdi>{words(picked.name)}</bdi></span>
                <span className="text-white/60">· {words(MINI_BAG_FAMILY_NAMES[picked.family])} · {words(MINI_BAG_MOOD_NAMES[picked.mood])}</span>
              </div>
              <p className="text-xs text-white/60">
                {words(MINI_BAG_PLACE_NAMES[picked.place])} · {words(MINI_BAG_LINES_NAMES[picked.lines])} · {words(MINI_BAG_TONE_NAMES[picked.tone])}
                {look ? <> · {say(`بألوان ثيم متجرك (${look.name})|In your store theme's colours (${look.name})|בצבעי ערכת החנות (${look.name})`)}</> : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={replay} className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5" data-testid={`${testid}-replay`}>
                  {say("▶ شغّل الحركة|▶ Play its motion|▶ להפעיל את התנועה")}
                </button>
                {shop ? (
                  <a href={`${shop}/?miniBag=${encodeURIComponent(picked.id)}`} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5" data-testid={`${testid}-open-shop`}>
                    {say("شوفها على متجري ↗|See it on my store ↗|לראות בחנות שלי ↗")}
                  </a>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <MiniBagPreview design={picked} screen="phone" width={200} lines={lines} total={total} vars={look?.vars} dir={dir} still={false} open={open} testid={`${testid}-phone`} />
              <p className="text-center text-[11px] text-white/50">{say("على الموبايل|On a phone|בטלפון")}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/80">
            {say(
              "السلة الأصلية: بطاقة زجاج بتلبس ألوان القطع اللي فيها. اختار تصميم من تحت لتتغيّر.|The original bag: a glass card that wears the colours of the pieces in it. Pick a design below to change it.|הסל המקורי: כרטיס זכוכית שלובש את צבעי הפריטים שבו. בחרו עיצוב למטה כדי לשנות.",
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onChange("")} aria-pressed={!picked} className={`rounded-xl border px-3 py-1.5 text-sm ${!picked ? "border-white/40 bg-white/10" : "border-white/10 hover:bg-white/5"}`} data-testid={`${testid}-none`}>
          {say("بدون تصميم (السلة الأصلية)|No design (the original bag)|בלי עיצוב (הסל המקורי)")}
        </button>
        <input
          className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={say(`دوّر بين ${MINI_BAG_DESIGNS.length} تصميم…|Search ${MINI_BAG_DESIGNS.length} designs…|חיפוש בין ${MINI_BAG_DESIGNS.length} עיצובים…`)}
          aria-label={say("دوّر على تصميم|Search for a design|חיפוש עיצוב")}
          data-testid={`${testid}-search`}
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={say("وين بتفتح|Where it opens|איפה הוא נפתח")}>
        <button type="button" className={chip(family === "all")} aria-pressed={family === "all"} onClick={() => setFamily("all")}>{say("الكل|All|הכול")}</button>
        {MINI_BAG_FAMILIES.map((f) => (
          <button key={f} type="button" className={chip(family === f)} aria-pressed={family === f} onClick={() => setFamily(f)} data-testid={`${testid}-family-${f}`}>
            {words(MINI_BAG_FAMILY_NAMES[f])} <span className="text-white/40">{list.filter((x) => x.family === f).length}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={say("الطابع|Mood|אופי")}>
        <button type="button" className={chip(mood === "all")} aria-pressed={mood === "all"} onClick={() => setMood("all")}>{say("كل الطوابع|Every mood|כל האופיים")}</button>
        {MINI_BAG_MOODS.map((m) => (
          <button key={m} type="button" className={chip(mood === m)} aria-pressed={mood === m} onClick={() => setMood(m)} data-testid={`${testid}-mood-${m}`}>
            {words(MINI_BAG_MOOD_NAMES[m])}
          </button>
        ))}
      </div>

      <ul className="grid max-h-[40rem] grid-cols-2 gap-3 overflow-auto pe-1 sm:grid-cols-3 xl:grid-cols-4" role="listbox" aria-label={say("تصاميم السلة المصغّرة|Small bag designs|עיצובי הסל הקטן")} data-testid={`${testid}-list`}>
        {found.map((x) => (
          <Tile key={x.id} design={x} on={x.id === value} fits={!!industry && x.fits.includes(industry)} lines={lines} total={total} vars={look?.vars} dir={dir} onPick={() => onChange(x.id)} testid={`${testid}-${x.id}`} />
        ))}
      </ul>
      {!found.length ? <p className="text-sm text-white/60">{say("ما في تصميم بهالاسم.|No design by that name.|אין עיצוב בשם הזה.")}</p> : null}
    </div>
  );
}

function Tile({ design: x, on, fits, lines, total, vars, dir, onPick, testid }: {
  design: MiniBagDesign; on: boolean; fits: boolean; lines: SampleLine[]; total: string; vars?: CSSProperties; dir: "rtl" | "ltr"; onPick: () => void; testid: string;
}) {
  return (
    // Off screen, a tile is not drawn until it scrolls near (100 small pictures of a whole screen each).
    <li style={{ contentVisibility: "auto", containIntrinsicSize: "auto 220px" }}>
      <button
        type="button"
        role="option"
        aria-selected={on}
        onClick={onPick}
        className={`block w-full overflow-hidden rounded-xl border p-1.5 text-start transition ${on ? "border-accent-400 bg-accent-500/15 ring-2 ring-accent-400/40" : "border-white/10 hover:bg-white/5"}`}
        data-testid={testid}
        data-fits={fits}
      >
        <MiniBagPreview design={x} width={236} lines={lines} total={total} vars={vars} dir={dir} />
        <span className="mt-1.5 flex items-center justify-between gap-2 px-1">
          <span className="min-w-0 truncate text-sm font-medium"><bdi>{words(x.name)}</bdi></span>
          <span className="shrink-0 text-[10px] text-white/50">{words(MINI_BAG_FAMILY_NAMES[x.family])}</span>
        </span>
        <span className="flex items-center justify-between gap-2 px-1 pb-0.5 text-[10px] text-white/50">
          <span className="truncate">{words(MINI_BAG_TONE_NAMES[x.tone])} · {words(MINI_BAG_MOOD_NAMES[x.mood])}</span>
          {fits ? <span className="shrink-0 text-emerald-300">{say("بيناسب متجرك|Fits your store|מתאים לחנות שלך")}</span> : null}
        </span>
      </button>
    </li>
  );
}
