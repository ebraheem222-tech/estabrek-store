// Where a product's cut-out goes: right after the photo it was made from, or in its place
// (the original stays in the media library either way).
import type { LocalImage } from "../catalog/ItemImagesManager";
import type { ComposerDraft } from "../../features/catalog/composer/composerModel";

/** A product's photo list (ItemImagesManager): the new list, and the saved photo to delete when replaced. */
export function placeCutout(list: LocalImage[], sourceLocalId: string, url: string, replace: boolean, localId: string): { next: LocalImage[]; removedId?: string } {
  const at = list.findIndex((x) => x.localId === sourceLocalId);
  if (at < 0) return { next: list };
  const src = list[at];
  const fresh: LocalImage = { localId, url, alt: src.alt ?? null, position: 0, isPrimary: replace && src.isPrimary, view: replace ? src.view ?? null : null };
  const arr = replace ? list.map((x, i) => (i === at ? fresh : x)) : [...list.slice(0, at + 1), fresh, ...list.slice(at + 1)];
  return { next: arr.map((x, i) => ({ ...x, position: i + 1 })), removedId: replace ? src.id : undefined };
}

/** The product composer: the cut-out joins the same colour, after its photo or instead of it. */
export function placeCutoutPhoto(d: ComposerDraft, photoKey: string, url: string, replace: boolean, key: string): ComposerDraft {
  const g = d.groups.find((x) => x.photoKeys.includes(photoKey));
  if (!g) return d;
  const photos = { ...d.photos, [key]: { key, url, preview: url, status: "done" as const, color: d.photos[photoKey]?.color ?? null } };
  if (replace) delete photos[photoKey];
  const keys = g.photoKeys.flatMap((k) => (k === photoKey ? (replace ? [key] : [k, key]) : [k]));
  return { ...d, photos, groups: d.groups.map((x) => (x.key === g.key ? { ...x, photoKeys: keys } : x)) };
}
