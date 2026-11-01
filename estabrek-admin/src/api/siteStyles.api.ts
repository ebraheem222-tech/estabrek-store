// The page editor's shared styles (backend lib/siteStyles.ts): published, and the editor's unpublished draft.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { TreeScreen } from "./pages.api";

export type SiteStyleKind = "text" | "button" | "box";
export type SiteStyle = { id: string; kind: SiteStyleKind; name?: string; style: Partial<Record<TreeScreen, Record<string, unknown>>> };
export type SiteStylesState = { styles: SiteStyle[]; draft: SiteStyle[] | null };

const pages = ENDPOINTS.admin.pages;

export async function getSiteStyles() {
  return (await api.get(pages.siteStyles)).data as SiteStylesState;
}
export async function saveSiteStylesDraft(styles: SiteStyle[]) {
  return (await api.put(pages.siteStylesDraft, { styles })).data as SiteStylesState;
}
export async function dropSiteStylesDraft() {
  return (await api.delete(pages.siteStylesDraft)).data as SiteStylesState;
}
export async function publishSiteStyles() {
  return (await api.post(pages.siteStylesPublish)).data as SiteStylesState;
}
