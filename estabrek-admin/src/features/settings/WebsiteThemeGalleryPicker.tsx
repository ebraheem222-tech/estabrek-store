import React, { useMemo, useState } from "react";
import {
  WEBSITE_THEME_GALLERY,
  WEBSITE_THEME_GALLERY_CATEGORIES,
  WEBSITE_THEME_GALLERY_CATEGORY_LABELS_AR,
  type WebsiteThemeGalleryItem,
} from "../../cms/themes/galleryThemes";
import { getWebsiteThemeById } from "../../cms/themes/websiteThemes";
// @ts-expect-error - JS visual gallery module without TS declarations.
import { CMS_THEME_GALLERY_THEMES } from "../../cms/themes/cms-themes-gallery.jsx";

type GalleryVisualTheme = {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  render?: () => React.ReactNode;
};

const GALLERY_VISUALS_BY_THEME_ID = new Map(
  (Array.isArray(CMS_THEME_GALLERY_THEMES) ? CMS_THEME_GALLERY_THEMES : [])
    .map((theme) => {
      const raw = theme as GalleryVisualTheme;
      const id = Number.parseInt(String(raw.id ?? ""), 10);
      if (!Number.isFinite(id) || id <= 0 || typeof raw.render !== "function") return null;
      return [`theme-gallery-${String(id).padStart(2, "0")}`, raw] as const;
    })
    .filter((entry): entry is readonly [string, GalleryVisualTheme] => Boolean(entry))
);

function radiusFromToken(token?: string) {
  switch (token) {
    case "rounded-none":
      return "0px";
    case "rounded-lg":
      return "10px";
    case "rounded-xl":
      return "14px";
    case "rounded-2xl":
      return "18px";
    case "rounded-3xl":
      return "22px";
    default:
      return "14px";
  }
}

function hexToRgb(hex?: string | null) {
  const raw = String(hex ?? "").trim().replace("#", "");
  if (!raw) return null;
  const value =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.length >= 6
      ? raw.slice(0, 6)
      : "";
  if (!value || value.length !== 6) return null;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function contrastText(hex?: string | null) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#f8fafc";
  const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return lum > 0.62 ? "#0f172a" : "#f8fafc";
}

function ThemeCard({
  item,
  active,
  onSelect,
}: {
  item: WebsiteThemeGalleryItem;
  active: boolean;
  onSelect: (themeId: string) => void;
}) {
  const theme = getWebsiteThemeById(item.websiteThemeId);
  if (!theme) return null;
  const hasLiveVisual = GALLERY_VISUALS_BY_THEME_ID.has(item.websiteThemeId);

  const c = theme.colors;
  const r = radiusFromToken(theme.borderRadius);
  const primaryText = contrastText(c.primary);
  const secondaryText = contrastText(c.surface);

  return (
    <button
      type="button"
      onClick={() => onSelect(item.websiteThemeId)}
      className={
        "group w-full rounded-2xl border p-3 text-right transition " +
        (active
          ? "border-accent-500/60 bg-white/10 shadow-[0_0_0_1px_rgba(139,92,246,0.3)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/20")
      }
      aria-pressed={active}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white/95">{item.name}</div>
          <div className="text-[11px] text-white/55">{item.category}</div>
        </div>
        <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/70">
          #{String(item.id).padStart(2, "0")}
        </span>
      </div>

      <div
        className="overflow-hidden border"
        style={{
          borderRadius: r,
          borderColor: c.border,
          background: `linear-gradient(135deg, ${c.background} 0%, ${c.surface} 100%)`,
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: `1px solid ${c.border}` }}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.primary }} />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.secondary }} />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.accent }} />
          </div>
          <span className="text-[10px]" style={{ color: c.textMuted }}>
            Theme Preview
          </span>
        </div>

        <div className="space-y-3 px-3 py-3">
          <div className="space-y-1 text-right">
            <div className="text-sm font-bold" style={{ color: c.text }}>
              عنوان
            </div>
            <div className="text-xs" style={{ color: c.textMuted }}>
              نص وصفي للمكوّنات
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold"
              style={{ borderRadius: r, backgroundColor: c.primary, color: primaryText }}
            >
              Button
            </span>
            <span
              className="inline-flex items-center border px-2.5 py-1 text-xs"
              style={{
                borderRadius: r,
                borderColor: c.border,
                backgroundColor: c.surface,
                color: secondaryText,
              }}
            >
              Card
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-white/50">
          {theme.nameAr}
          {hasLiveVisual ? " • SVG" : ""}
        </span>
        {active ? <span className="text-[11px] text-accent-300">مفعّل</span> : null}
      </div>
    </button>
  );
}

function ThemeLivePreview({ themeId }: { themeId: string }) {
  const visual = GALLERY_VISUALS_BY_THEME_ID.get(themeId);
  if (!visual || typeof visual.render !== "function") return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12">
      <div className="h-56 overflow-hidden bg-black/20">
        <div className="origin-top-left scale-[0.56]" style={{ width: "178.57%", height: "178.57%" }}>
          {visual.render()}
        </div>
      </div>
    </div>
  );
}

export function WebsiteThemeGalleryPicker({
  selectedThemeId,
  onSelect,
}: {
  selectedThemeId: string;
  onSelect: (themeId: string) => void;
}) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const totalThemes = WEBSITE_THEME_GALLERY.length;
  const selectedTheme = useMemo(() => getWebsiteThemeById(selectedThemeId), [selectedThemeId]);
  const hasSelectedLivePreview = GALLERY_VISUALS_BY_THEME_ID.has(selectedThemeId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WEBSITE_THEME_GALLERY.filter((item) => {
      const categoryOk = category === "All" || item.category === category;
      const searchOk =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.websiteThemeId.toLowerCase().includes(q);
      return categoryOk && searchOk;
    });
  }, [category, query]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white/95">معرض ثيمات الموقع</div>
          <div className="text-xs text-white/60">
            {`المعروض ${filtered.length} من ${totalThemes} ثيم`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCategory("All");
              setQuery("");
            }}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition hover:border-white/30"
          >
            إظهار الكل
          </button>
          <button
            type="button"
            onClick={() => onSelect("default")}
            className={
              "rounded-xl border px-3 py-1.5 text-xs transition " +
              (selectedThemeId === "default"
                ? "border-accent-500/60 bg-accent-500/20 text-accent-200"
                : "border-white/15 bg-white/5 text-white/75 hover:border-white/30")
            }
          >
            استخدام الافتراضي
          </button>
        </div>
      </div>

      {hasSelectedLivePreview ? (
        <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.02] p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <div className="text-xs text-white/75">
              معاينة مباشرة من ملف <span className="font-mono text-white/90">cms-themes-gallery.jsx</span>
            </div>
            <div className="text-[11px] text-white/55">{selectedTheme?.nameAr ?? selectedTheme?.name ?? ""}</div>
          </div>
          <ThemeLivePreview themeId={selectedThemeId} />
        </div>
      ) : null}

      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في الثيمات..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-accent-500/40"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {WEBSITE_THEME_GALLERY_CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] transition " +
                  (active
                    ? "border-accent-500/60 bg-accent-500/20 text-accent-200"
                    : "border-white/12 bg-white/[0.03] text-white/60 hover:border-white/20")
                }
              >
                {WEBSITE_THEME_GALLERY_CATEGORY_LABELS_AR[c] ?? c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <ThemeCard
            key={item.id}
            item={item}
            active={selectedThemeId === item.websiteThemeId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
