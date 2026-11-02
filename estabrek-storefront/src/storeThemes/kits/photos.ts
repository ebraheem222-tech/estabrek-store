/**
 * Each kit's pictures by the name its pages use them under, with who took them and where
 * from (Unsplash and Pexels, both free for shop use). A kit's set goes in only after the
 * store's owner says yes to it; until then its pages show the shop's ready placeholders.
 */
export type KitPhoto = { url: string; by: string; from: string };
export const KIT_PHOTOS: Record<string, Record<string, KitPhoto>> = {};

export const photosOf = (kind: string): Record<string, string> => Object.fromEntries(Object.entries(KIT_PHOTOS[kind] ?? {}).map(([name, ph]) => [name, ph.url]));
