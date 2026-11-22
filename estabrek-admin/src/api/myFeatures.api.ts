// ميزاتي from the admin's side (backend modules/admin/myFeatures.controller.ts,
// lib/featureGate.ts): a feature the owner built is a name over tables, functions and pages
// made elsewhere in the studio, found together and switched off together.
import { api } from "./http";
import type { SiteChoices } from "../studio/templates/sites";

type Local = Partial<Record<"ar" | "en" | "he", string>>;
export type FeatureKind = "table" | "function" | "page";
export type Who = "off" | "key" | "customer" | "public";
export type TableAccess = { read: Who; create: Who; update: Who; delete: Who };

export type FeatureLite = { id: string; name: string; note: string | null; enabled: boolean; updatedAt: string; counts: Record<FeatureKind, number> };
export type FeatureTable = { id: string; slug: string; name: Local | null; fields: number; rows: number; api: TableAccess };
export type FeatureFn = { id: string; name: string; note: string | null; enabled: boolean; published: boolean; changed: boolean; triggers: number; runs: number; lastRunAt: string | null };
export type FeaturePage = { id: string; /** Its key in the template the feature was installed from (none: added by hand). */ key?: string | null; name: string; slug: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; hasDraft: boolean; /** The feature is off: the shop answers this page as one that isn't there. */ hidden?: boolean };
export type Feature = {
  id: string;
  name: string;
  note: string | null;
  /** Off: its functions aren't started, its tables' API answers as closed, and its pages are hidden from the shop. */
  enabled: boolean;
  /** Made by installing a template: which one and its version. */
  template?: { key: string; version: string; name: Local; installedAt: string; /** Upgraded since: when, and from which version. */ upgradedAt?: string; from?: string | null; /** A whole site's install wizard choices (studio/templates/sites/choices.ts). */ site?: SiteChoices } | null;
  createdAt: string;
  updatedAt: string;
  tables: FeatureTable[];
  functions: FeatureFn[];
  pages: FeaturePage[];
  /** A whole site's first page (`homeId`, null for anything else), and whether it is the store's home now, or which other site is. */
  siteHome?: { homeId: string | null; on: boolean; other: { id: string; name: string } | null };
  /** What isn't in any feature yet. */
  free: { tables: Array<{ id: string; slug: string; name: Local | null }>; functions: Array<{ id: string; name: string }>; pages: Array<{ id: string; name: string; slug: string }> };
  limits: { features: number; items: number };
};

const BASE = "/admin/my-features";
const at = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

export async function listFeatures() {
  return (await api.get(BASE)).data as { features: FeatureLite[]; limits: { features: number; items: number } };
}
export async function getFeature(id: string) {
  return (await api.get(at(id))).data as Feature;
}
export async function createFeature(body: { name: string; note?: string }) {
  return (await api.post(BASE, body)).data as Feature;
}
export async function saveFeature(id: string, body: { name?: string; note?: string | null; enabled?: boolean }) {
  return (await api.put(at(id), body)).data as Feature;
}
/** Only the name goes: its tables, functions and pages stay where they were made. */
export async function deleteFeature(id: string) {
  return (await api.delete(at(id))).data as { ok: true };
}
/** A table, a function or a page joins the feature (409 ITEM_TAKEN when it is another feature's). */
export async function addFeatureItem(id: string, kind: FeatureKind, refId: string) {
  return (await api.post(`${at(id)}/items`, { kind, refId })).data as Feature;
}
export async function removeFeatureItem(id: string, kind: FeatureKind, refId: string) {
  return (await api.delete(`${at(id)}/items/${kind}/${encodeURIComponent(refId)}`)).data as Feature;
}

/* ---------------- A whole site as the store's home (backend modules/admin/siteHome.ts) ---------------- */

export type SiteLink = { page: string; label: Local };
/** Its first page at "/", the store's menus made of its pages (published ones only: `left` names the others). */
export async function makeSiteHome(id: string, body: { header: SiteLink[]; footer: SiteLink[] }) {
  return (await api.post(`${at(id)}/site-home`, body)).data as { home: string; menus: { header: number; footer: number }; left: string[]; already: boolean; feature: Feature };
}
/** The store's own home and menus back. */
export async function undoSiteHome() {
  return (await api.delete(`${BASE}/site-home`)).data as { ok: true; was: string | null };
}

/* ---------------- Templates (stage 4: lib/featureTemplate.ts, lib/featureInstall.ts on the server) ---------------- */

/** What couldn't go into an exported file, said by `what` (featuresText.ts noteText). */
export type TemplateNote =
  | { what: "relationOut"; table: string; field: string }
  | { what: "stepTableOut" | "stepFnOut" | "readyOut"; fn: string; at: string }
  | { what: "triggerTableOut" | "webhookNew"; fn: string }
  | { what: "listOut" | "oldSections" | "blockOut" | "componentOut" | "oldPage"; page: string };
/** A template file as the server writes it: kept and sent back as it is. */
export type TemplateFile = { format: "estabrek.feature"; formatVersion: number; key: string; version: string; name: Local; note?: Local; tables: unknown[]; functions: unknown[]; pages: unknown[]; needs?: { secrets: string[]; sites: string[] } } & Record<string, unknown>;
export type TemplateProblem = { at: string; message: string };
export type TemplatePreview =
  | { ok: false; problems: TemplateProblem[]; template?: undefined }
  | {
      ok: boolean;
      template: { key: string; version: string; name: Local; note: Local | null };
      tables: Array<{ key: string; name: Local; slug: string; was: string | null; fields: number; api: TableAccess; itemPage: boolean; /** Ready rows it comes with (a whole site's menu, team…). */ rows?: number }>;
      functions: Array<{ key: string; name: string; steps: number; triggers: Array<{ kind: string; slug: string | null; was: string | null }> }>;
      pages: Array<{ key: string; name: string; slug: string; was: string | null }>;
      needs: { secrets: Array<{ name: string; kept: boolean }>; sites: Array<{ host: string; allowed: boolean }> };
      installed: Array<{ id: string; name: string; version: string | null }>;
      problems: TemplateProblem[];
    };
export type Removal = {
  tables: Array<{ id: string; name: string; slug: string; rows: number }>;
  functions: Array<{ id: string; name: string; runs: number }>;
  pages: Array<{ id: string; name: string; slug: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }>;
  blockers: { linked: Array<{ table: string; by: string; field: string }>; called: Array<{ fn: string; by: string }> };
  uses: { functions: string[]; pages: string[] };
};
export type Removed = { tables: number; keptTables: number; functions: number; pages: number; rows: number };

/** The feature as a template file, with what couldn't go into it. */
export async function exportFeature(id: string, opts: { key?: string; version?: string; lang: "ar" | "en" | "he" }) {
  return (await api.get(`${at(id)}/export`, { params: { ...(opts.key ? { key: opts.key } : {}), ...(opts.version ? { version: opts.version } : {}), lang: opts.lang } })).data as { template: TemplateFile; notes: TemplateNote[] };
}
/** What installing a file would make here; nothing is written. */
export async function previewTemplate(template: unknown) {
  return (await api.post(`${BASE}/templates/preview`, { template })).data as TemplatePreview;
}
/** Installed as a draft, under a new feature that is switched off. */
export async function installTemplate(template: unknown, lang: "ar" | "en" | "he") {
  return (await api.post(`${BASE}/templates/install`, { template, lang })).data as Feature;
}
/** What removing the feature with everything in it would take away, and what stops it. */
export async function removalOf(id: string, lang: "ar" | "en" | "he") {
  return (await api.get(`${at(id)}/removal`, { params: { lang } })).data as Removal;
}
/** The feature with everything in it; its tables' rows kept (the tables stay, in no feature) or deleted. */
export async function removeFeature(id: string, rows: "keep" | "delete", lang: "ar" | "en" | "he") {
  return (await api.post(`${at(id)}/remove`, { rows, lang })).data as { ok: true; removed: Removed };
}

/* ---------------- The gallery: ready functions, APIs and features ---------------- */

export type GalleryKind = "function" | "api" | "feature";
export type GalleryItem = {
  key: string;
  version: string;
  kind: GalleryKind;
  category: string;
  name: Local;
  note: Local | null;
  counts: { tables: number; functions: number; pages: number };
  /** What starts its functions: "event", "row", "schedule", "call", "webhook", "route". */
  triggers: string[];
  /** Its own addresses: "GET vat". */
  routes: string[];
  needs: { secrets: string[]; sites: string[]; connections: number };
};
export async function listGallery() {
  return (await api.get(`${BASE}/templates/gallery`)).data as { items: GalleryItem[]; kinds: GalleryKind[]; categories: Record<string, Local> };
}
/** One example's file, shown and installed like any file. */
export async function galleryFile(key: string) {
  return (await api.get(`${BASE}/templates/gallery/${encodeURIComponent(key)}`)).data as { template: TemplateFile };
}

/* ---------------- Upgrading a feature made from a template ---------------- */

export type UpgradeAction = "add" | "update" | "conflict" | "taken" | "dropped" | "gone" | "waits";
/** One piece of an upgrade; `id` names it when the owner asks for the template's version. */
export type UpgradeItem = { id: string; kind: "table" | "field" | "function" | "triggers" | "page"; key: string; field?: string; name: string; action: UpgradeAction };
export type UpgradePreview =
  | { ok: false; problems: TemplateProblem[]; from?: undefined }
  | { ok: boolean; from: string; to: string; key: string; name: Local; items: UpgradeItem[]; counts: Record<UpgradeAction, number>; problems: TemplateProblem[] };
/** What a newer file of the feature's template would change; nothing is written. */
export async function previewUpgrade(id: string, template: unknown, lang: "ar" | "en" | "he") {
  return (await api.post(`${at(id)}/upgrade/preview`, { template, lang })).data as UpgradePreview;
}
/** The upgrade made: what the owner changed stays theirs, unless named in `take`. */
export async function upgradeFeature(id: string, template: unknown, take: string[], lang: "ar" | "en" | "he") {
  return (await api.post(`${at(id)}/upgrade`, { template, take, lang })).data as { from: string; to: string; items: UpgradeItem[]; counts: Record<UpgradeAction, number>; feature: Feature };
}
