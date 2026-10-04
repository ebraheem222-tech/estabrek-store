import React, { useMemo } from "react";
// @ts-expect-error - JS visual gallery module without TS declarations.
import { CMS_THEME_GALLERY_THEMES } from "./cms-themes-gallery.jsx";

type GalleryThemeVisual = {
  id?: unknown;
  render?: () => React.ReactNode;
};

const GALLERY_ID_RE = /^theme-gallery-(\d+)$/i;

function normalizeThemeId(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(GALLERY_ID_RE);
  if (!match) return null;
  const index = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(index) || index <= 0) return null;
  return `theme-gallery-${String(index).padStart(2, "0")}`;
}

const VISUAL_BY_THEME_ID = (() => {
  const map = new Map<string, GalleryThemeVisual>();
  const list = Array.isArray(CMS_THEME_GALLERY_THEMES) ? CMS_THEME_GALLERY_THEMES : [];
  for (const item of list) {
    const visual = item as GalleryThemeVisual;
    const index = Number.parseInt(String(visual.id ?? ""), 10);
    if (!Number.isFinite(index) || index <= 0) continue;
    map.set(`theme-gallery-${String(index).padStart(2, "0")}`, visual);
  }
  return map;
})();

function cloneAsFullSize(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement(node)) return node;
  const element = node as React.ReactElement<any>;
  const style = {
    ...(element.props?.style ?? {}),
    width: "100%",
    height: "100%",
  };
  const className = [element.props?.className, "h-full w-full"].filter(Boolean).join(" ");
  return React.cloneElement(element, { className, style });
}

export function GalleryThemeMotionBackdrop({
  websiteThemeId,
}: {
  websiteThemeId?: string | null;
}) {
  const normalizedId = normalizeThemeId(websiteThemeId);

  const renderedVisual = useMemo(() => {
    if (!normalizedId) return null;
    const visual = VISUAL_BY_THEME_ID.get(normalizedId);
    if (!visual || typeof visual.render !== "function") return null;
    return cloneAsFullSize(visual.render());
  }, [normalizedId]);

  if (!renderedVisual) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 scale-110 opacity-40 blur-[1px] transform-gpu">
        <div
          className={[
            "h-full w-full text-transparent",
            "[&_svg_text]:hidden",
            "[&_h1]:hidden [&_h2]:hidden [&_h3]:hidden [&_h4]:hidden [&_h5]:hidden [&_h6]:hidden",
            "[&_p]:hidden [&_button]:hidden [&_input]:hidden [&_textarea]:hidden [&_label]:hidden [&_a]:hidden",
            "[&_span]:hidden",
          ].join(" ")}
        >
          {renderedVisual}
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.22),transparent_52%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_100%,rgba(255,255,255,0.16),transparent_48%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.18),rgba(255,255,255,0.06)_30%,rgba(255,255,255,0.2))]" />
    </div>
  );
}
