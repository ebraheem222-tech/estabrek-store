import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const token = req.headers.get("x-revalidate-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";

  if (secret && token !== secret) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "MISSING_SECRET" }, { status: 401 });
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const tags = asList(payload.tags ?? req.nextUrl.searchParams.getAll("tag"));
  const paths = asList(payload.paths ?? req.nextUrl.searchParams.getAll("path"));

  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({ ok: true, tags, paths, hasSecret: !!secret });
}
