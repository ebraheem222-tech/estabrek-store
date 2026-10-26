import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/api";
import { formatMoney, getProductMinPrice } from "@/lib/catalog";
import { getPublicSettings } from "@/lib/api";
import { identityOf, nameOf } from "@/lib/storeIdentity";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const settings = await getPublicSettings().catch(() => null);
  const storeLabel = nameOf(identityOf((settings as any)?.site), "en");
  const host = (() => { try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "").host; } catch { return ""; } })();
  const slug = searchParams.get("slug");
  if (!slug) return new Response("Missing slug", { status: 400 });

  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return new Response("Not found", { status: 404 });

  const title = String((product as any).title || "Product");
  const price = getProductMinPrice(product as any);
  const currency = String((product as any).currency || "ILS");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "linear-gradient(135deg, #0a0a0a 0%, #111827 100%)",
          color: "white",
          fontSize: 48,
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.8 }}>{storeLabel}</div>
        <div style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 800 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 36, opacity: 0.9 }}>{formatMoney(Number(price), currency)}</div>
          <div style={{ fontSize: 24, opacity: 0.6 }}>{host}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
