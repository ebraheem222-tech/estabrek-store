import { NextResponse } from "next/server";

function baseUrl() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000/v1"
  ).replace(/\/$/, "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ products: [], categories: [] });

  const limit = searchParams.get("limit") || "6";
  const url = `${baseUrl()}/storefront/search/suggest?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) {
      return NextResponse.json({ products: [], categories: [] }, { status: 200 });
    }
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ products: [], categories: [] }, { status: 200 });
  }
}
