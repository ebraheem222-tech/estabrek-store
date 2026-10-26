/**
 * A product's 360° views for the shop's product page: the scans (media of kind SCAN, see
 * modules/admin/scans.controller.ts) whose manifest says they show this product, newest
 * first, each with its sprite sheet's grid, the colour it shows (none = every colour)
 * and its 3D model when there is one.
 */
import { prisma } from "./prisma.js";
import { ScanManifest } from "./scanManifest.js";

export type ProductSpin = {
  id: string;
  url: string;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  count: number;
  itemId: string | null;
  modelUrl: string | null;
};

type Asset = { id: string; url: string | null; filename: string; videoMeta: unknown };

/** One scan as the shop draws it; null when its manifest isn't valid. `publicUrl` makes a local file's address. */
export function spinOf(asset: Asset, publicUrl: (rel: string) => string): ProductSpin | null {
  const m = ScanManifest.safeParse(asset.videoMeta);
  if (!m.success) return null;
  return {
    id: asset.id,
    url: asset.url ?? publicUrl(`/uploads/${asset.filename}`),
    cols: m.data.cols,
    rows: m.data.rows,
    cellW: m.data.cellW,
    cellH: m.data.cellH,
    count: m.data.frames.length,
    itemId: m.data.product?.itemId ?? null,
    modelUrl: m.data.model?.url ?? null,
  };
}

export async function spinsForProduct(productId: string, publicUrl: (rel: string) => string): Promise<ProductSpin[]> {
  const assets = await prisma.mediaAsset.findMany({
    where: { kind: "SCAN", videoMeta: { path: ["product", "id"], equals: productId } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, url: true, filename: true, videoMeta: true },
  });
  return assets.map((a) => spinOf(a, publicUrl)).filter((s): s is ProductSpin => Boolean(s));
}
