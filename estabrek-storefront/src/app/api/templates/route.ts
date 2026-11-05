/**
 * GET /api/templates: the ready templates for the admin's gallery (storeThemes/kits), by
 * category, with what a card shows (name, line, tags, colours, fonts) and the theme each
 * wears. Public data like the themes, readable from the admin's address.
 */
import { NextRequest, NextResponse } from "next/server";
import { studioOrigins } from "@/lib/studioOrigins";
import { themePalette } from "@/storeThemes";
import { CATEGORIES, TEMPLATES, templateThemeId } from "@/storeThemes/kits";
import { TEMPLATE_THEMES } from "@/storeThemes/kits/themes";

export const dynamic = "force-dynamic";

const list = TEMPLATES.map((tpl) => {
  const theme = TEMPLATE_THEMES.find((x) => x.id === templateThemeId(tpl.id))!;
  const { palette } = themePalette(theme);
  return {
    id: tpl.id,
    category: tpl.category,
    name: tpl.name,
    blurb: tpl.blurb,
    tags: tpl.tags,
    ...(tpl.source ? { source: tpl.source, preview: tpl.preview } : {}),
    style: { id: tpl.style.id, name: tpl.style.name },
    theme: theme.id,
    mode: theme.mode,
    swatch: [palette.bg, palette.surface, palette.accent, palette.strong, palette.ink],
    fonts: { display: tpl.style.fonts.display[0], text: tpl.style.fonts.text[0] },
  };
});

const cors = (req: NextRequest): Record<string, string> => {
  const origin = req.headers.get("origin") ?? "";
  return studioOrigins().includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
};

export function GET(req: NextRequest) {
  const categories = CATEGORIES.map((c) => ({ ...c, count: list.filter((x) => x.category === c.id).length }));
  return NextResponse.json({ categories, templates: list }, { headers: { ...cors(req), "Cache-Control": "public, max-age=300" } });
}
