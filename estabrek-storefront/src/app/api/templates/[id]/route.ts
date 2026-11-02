/**
 * GET /api/templates/<id>?page=home: a ready template's page for the admin's editor
 * (storeThemes/kits), the sections it puts on a page, and the theme it wears.
 */
import { NextRequest, NextResponse } from "next/server";
import { studioOrigins } from "@/lib/studioOrigins";
import { KIT_PAGES, templatePage, templateThemeId, type KitPage } from "@/storeThemes/kits";

export const dynamic = "force-dynamic";

const cors = (req: NextRequest): Record<string, string> => {
  const origin = req.headers.get("origin") ?? "";
  return studioOrigins().includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
};

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const page = (req.nextUrl.searchParams.get("page") ?? "home") as KitPage;
  const sections = (KIT_PAGES as readonly string[]).includes(page) ? templatePage(params.id, page) : null;
  if (!sections) return NextResponse.json({ error: "No such template page" }, { status: 404, headers: cors(req) });
  return NextResponse.json({ id: params.id, page, theme: templateThemeId(params.id), sections }, { headers: { ...cors(req), "Cache-Control": "public, max-age=300" } });
}
