/**
 * GET /api/design-kits/<kind>?page=home: a design kit's page for the admin's editor
 * (storeThemes/kits), as the sections it puts on a page in the tree the backend checks
 * when the page is saved. Public data like the themes, readable from the admin's address.
 */
import { NextRequest, NextResponse } from "next/server";
import { studioOrigins } from "@/lib/studioOrigins";
import { KIT_PAGES, kitPage, type KitPage } from "@/storeThemes/kits";

export const dynamic = "force-dynamic";

const cors = (req: NextRequest): Record<string, string> => {
  const origin = req.headers.get("origin") ?? "";
  return studioOrigins().includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
};

export function GET(req: NextRequest, { params }: { params: { kind: string } }) {
  const page = (req.nextUrl.searchParams.get("page") ?? "home") as KitPage;
  const sections = (KIT_PAGES as readonly string[]).includes(page) ? kitPage(params.kind, page) : null;
  if (!sections) return NextResponse.json({ error: "No such page for this design yet" }, { status: 404, headers: cors(req) });
  return NextResponse.json({ kind: params.kind, page, sections }, { headers: { ...cors(req), "Cache-Control": "public, max-age=300" } });
}
