import { ImageResponse } from "next/og";
import { getPublicSettings } from "@/lib/api";
import { appOf, iconColour, iconLetter, iconPicture } from "@/lib/pwa";

/**
 * GET /api/app-icon?size=192&purpose=any&c=a43b64 — the app's icon as a square PNG (sizes 180, 192, 512), drawn
 * from the picture the owner gave the app (else the store's logo or favicon) on the app's colour (`c`, put in the
 * address by the manifest and the layout: lib/pwa.ts iconHref); a store without a picture gets its first letter.
 * "maskable" keeps the picture inside the middle the phone never cuts. "badge" (96) is the small mark a phone shows
 * in its top bar beside a notification: the store's letter in white, on nothing (a phone only reads its shape).
 * Drawn at the edge, like the sharing pictures (api/og).
 */
export const runtime = "edge";

const SIZES = new Set([180, 192, 512]);
/** Picture kinds the drawing can read; anything else (or none) draws the letter. */
const KINDS = /^image\/(png|jpe?g|gif|svg\+xml)\b/i;
const MAX_BYTES = 2_000_000;

/** The picture as a data address the drawing reads, or null when it can't be had (gone, too big, an odd kind). */
async function pictureData(src: string, origin: string): Promise<string | null> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 4000);
  try {
    const res = await fetch(new URL(src, origin), { signal: stop.signal });
    const kind = res.headers.get("content-type") ?? "";
    if (!res.ok || !KINDS.test(kind)) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return null;
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${kind.split(";")[0]};base64,${btoa(binary)}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Light or dark words on a colour (its brightness). */
function inkOn(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#1f1a1d" : "#ffffff";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const size = Number(url.searchParams.get("size"));
  const purpose = url.searchParams.get("purpose");
  const { site } = await getPublicSettings().catch(() => ({ site: {} as Record<string, unknown> }));
  if (purpose === "badge") {
    return new ImageResponse(
      (
        <div style={{ width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: 70, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>{iconLetter(site as never)}</div>
        </div>
      ),
      { width: 96, height: 96, headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
    );
  }
  if (!SIZES.has(size)) return new Response("size: 180, 192 or 512", { status: 400 });
  const maskable = purpose === "maskable";
  const colour = iconColour(url.searchParams.get("c"));
  const app = appOf((site as { header?: unknown }).header);
  const picture = iconPicture(app, site as never);
  const data = picture ? await pictureData(picture, url.origin) : null;
  // The middle the phone's own shape never cuts for "maskable"; a little air otherwise.
  const inner = Math.round(size * (maskable ? 0.62 : 0.78));
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: colour }}>
        {data ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data} width={inner} height={inner} style={{ objectFit: "contain", borderRadius: Math.round(inner * 0.12) }} alt="" />
        ) : (
          <div style={{ display: "flex", fontSize: Math.round(inner * 0.72), fontWeight: 800, color: inkOn(colour), lineHeight: 1 }}>{iconLetter(site as never)}</div>
        )}
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
