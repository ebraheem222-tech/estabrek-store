// A whole site's own pages in the admin's menu (sites wave 1.2; backend modules/admin/sitePanels.controller.ts,
// lib/sitePanel.ts): its numbers, its queues, its saved tables, its settings and quick actions. Each member is
// sent only the parts they may read.
import { api } from "./http";
import type { SiteSettingDecl } from "./myFeatures.api";

type Local = Partial<Record<"ar" | "en" | "he", string>>;
export type PanelIcon = "today" | "lists" | "settings";
export type PanelPageLite = { key: string; name: Local; icon: PanelIcon };
export type SitePanelLite = { featureId: string; name: string; enabled: boolean; pages: PanelPageLite[] };
export type PanelTable = { id: string; slug: string; name: Local | null };
export type PanelColumn = { id: string; type: string; name: Local | null; options?: Array<{ id: string; name?: Local }>; currency?: string };
export type PanelRow = { id: string; cells: Record<string, unknown> };

export type PanelNumbers = { kind: "numbers"; key: string; items: Array<{ key: string; label: Local; value: number | null; window?: "today" | "week" | "month"; before?: number | null; table: PanelTable }> };
export type PanelQueue = { kind: "queue"; key: string; title: Local; table: PanelTable; columns: PanelColumn[]; rows: PanelRow[]; total: number; problem?: string; decisions: Array<{ key: string; label: Local; tone?: "good" | "bad" }>; canDecide: boolean; empty: Local | null };
export type PanelView = { kind: "view"; key: string; title: Local; table: PanelTable; columns: PanelColumn[]; rows: PanelRow[]; total: number; problem?: string };
export type PanelSettings = { kind: "settings"; key: string; title: Local | null; declared: SiteSettingDecl[]; values: Record<string, unknown>; canWrite: boolean };
export type PanelActions = { kind: "actions"; key: string; title: Local | null; items: Array<{ key: string; label: Local; note: Local | null; setting: string; value: unknown; done: boolean }> };
export type PanelPartView = PanelNumbers | PanelQueue | PanelView | PanelSettings | PanelActions;
export type PanelPageView = { featureId: string; name: string; enabled: boolean; page: PanelPageLite; pages: PanelPageLite[]; parts: PanelPartView[] };

const BASE = "/admin/site-panels";
const enc = encodeURIComponent;

/** The sites here with a panel, each with the pages this member sees (none: no group in the menu). */
export async function listSitePanels() {
  return (await api.get(BASE)).data as { sites: SitePanelLite[] };
}
export async function getSitePanelPage(featureId: string, page: string, lang: string) {
  return (await api.get(`${BASE}/${enc(featureId)}/${enc(page)}`, { params: { lang } })).data as PanelPageView;
}
/** A queue's button pressed on one row: the page as it is after. */
export async function decide(featureId: string, page: string, part: string, row: string, decision: string, lang: string) {
  return (await api.post(`${BASE}/${enc(featureId)}/${enc(page)}/${enc(part)}/decide`, { row, decision, lang })).data as PanelPageView;
}
/** A quick action: the setting it names set; the page as it is after. */
export async function act(featureId: string, page: string, part: string, action: string, lang: string) {
  return (await api.post(`${BASE}/${enc(featureId)}/${enc(page)}/${enc(part)}/act`, { action, lang })).data as PanelPageView;
}
