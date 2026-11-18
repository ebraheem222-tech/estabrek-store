/**
 * The gallery (stage 4; admin → ميزاتي → المعرض): ready functions, APIs and features, each a template
 * file installed as a draft (lib/featureInstall.ts). The list the admin shows is read once and kept;
 * an example that doesn't read as a template is left out of it (and said in the server's log), so a
 * mistake in one never takes the gallery down. templateGallery.unit.spec.ts keeps that from happening.
 */
import { readTemplate, type Template } from "../featureTemplate.js";
import { CATEGORIES, GALLERY_KINDS, type GalleryEntry } from "./kit.js";
import { FN_ORDERS } from "./fnOrders.js";
import { FN_FORMS } from "./fnForms.js";
import { FN_SCHEDULES } from "./fnSchedules.js";
import { FN_ROWS } from "./fnRows.js";
import { FN_CODE } from "./fnCode.js";
import { API_CRUD } from "./apiCrud.js";
import { API_SINGLES } from "./apiSingles.js";
import { FEAT_SELLING } from "./featSelling.js";
import { FEAT_SERVICES } from "./featServices.js";
import { FEAT_COMMUNITY } from "./featCommunity.js";
import { FEAT_OPERATIONS } from "./featOperations.js";

/** Every example, in the order the gallery shows them. */
export const GALLERY: GalleryEntry[] = [...FN_ORDERS, ...FN_FORMS, ...FN_SCHEDULES, ...FN_ROWS, ...FN_CODE, ...API_CRUD, ...API_SINGLES, ...FEAT_SELLING, ...FEAT_SERVICES, ...FEAT_COMMUNITY, ...FEAT_OPERATIONS];

export type GalleryItem = {
  key: string;
  version: string;
  kind: GalleryEntry["kind"];
  category: GalleryEntry["category"];
  name: Template["name"];
  note: Template["note"] | null;
  counts: { tables: number; functions: number; pages: number };
  /** What starts its functions: "event", "row", "schedule", "call", "webhook", "route". */
  triggers: string[];
  /** Its own addresses, "GET orders/:id": an API's. */
  routes: string[];
  needs: { secrets: string[]; sites: string[]; connections: number };
};

let cache: { items: GalleryItem[]; files: Map<string, Template> } | null = null;

function read() {
  if (cache) return cache;
  const items: GalleryItem[] = [];
  const files = new Map<string, Template>();
  for (const e of GALLERY) {
    const r = readTemplate(e.template);
    if (!r.ok) {
      console.error(`[gallery] "${e.template.key}" isn't a template:`, r.problems.slice(0, 3));
      continue;
    }
    const t = r.template;
    if (files.has(t.key)) continue;
    files.set(t.key, t);
    const triggers = t.functions.flatMap((fn) => (fn.triggers ?? []).map((tr) => tr.kind));
    const routes = t.functions.flatMap((fn) => (fn.triggers ?? []).filter((tr) => tr.kind === "route").map((tr) => `${String((tr.config as { method?: unknown }).method)} ${String((tr.config as { path?: unknown }).path)}`));
    const connections = t.functions.reduce((n, fn) => n + JSON.stringify(fn.def).split('"act":"ready"').length - 1, 0);
    items.push({
      key: t.key,
      version: t.version,
      kind: e.kind,
      category: e.category,
      name: t.name,
      note: t.note ?? null,
      counts: { tables: t.tables.length, functions: t.functions.length, pages: t.pages.length },
      triggers: [...new Set(triggers)],
      routes,
      needs: { secrets: t.needs?.secrets ?? [], sites: t.needs?.sites ?? [], connections },
    });
  }
  cache = { items, files };
  return cache;
}

/** The gallery as the admin lists it, with its kinds and categories. */
export function galleryList() {
  return { items: read().items, kinds: GALLERY_KINDS, categories: CATEGORIES };
}

/** One example's file, to be shown and installed like any template file; null when there is none. */
export function galleryFile(key: string): Template | null {
  return read().files.get(key) ?? null;
}
