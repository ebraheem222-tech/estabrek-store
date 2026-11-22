// A whole site's own pages in the admin's menu (sites wave 1.2; backend modules/admin/sitePanels.controller.ts,
// lib/sitePanel.ts): its numbers, its queues, its saved tables, its settings and quick actions. Each member is
// sent only the parts they may read.
import { api } from "./http";
import type { SiteSettingDecl } from "./myFeatures.api";

type Local = Partial<Record<"ar" | "en" | "he", string>>;
export type PanelIcon = "today" | "lists" | "settings" | "calendar" | "people" | "chart";
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
export type PanelOption = { id: string; name: Local | null };
export type PanelChart = { kind: "chart"; key: string; title: Local; table: PanelTable; days: Array<{ day: string; total: number; parts?: Record<string, number> }>; options?: PanelOption[]; problem?: string };
export type PanelKanban = { kind: "kanban"; key: string; title: Local; table: PanelTable; field: string; columns: Array<{ id: string; name: Local | null; rows: PanelRow[]; total: number }>; show: PanelColumn[]; canMove: boolean };
export type PanelCalendar = { kind: "calendar"; key: string; title: Local; table: PanelTable; month: string; date: string; color?: string; options?: PanelOption[]; show: PanelColumn[]; rows: PanelRow[]; total: number; canMove: boolean };
export type PanelPeople = { kind: "people"; key: string; title: Local; by: string };
export type PanelReport = { kind: "report"; key: string; title: Local; table: PanelTable; period: ReportPeriod; from: string; to: string; groups: Array<{ id: string; name: Local | null; n: number }>; total: number; problem?: string };
export type PanelMap = { kind: "map"; key: string; title: Local; table: PanelTable; label: string; address: string; columns: PanelColumn[]; rows: PanelRow[] };
export type PanelScanner = { kind: "scanner"; key: string; title: Local; table: PanelTable; columns: PanelColumn[]; decisions: Array<{ key: string; label: Local; tone?: "good" | "bad" }>; canDecide: boolean };
export type ReportPeriod = "week" | "month" | "lastMonth" | "quarter";
/** A game server site's status (backend lib/gameSites.ts GameView). */
export type GameView = { featureId: string; game: "fivem" | "minecraft" | "bedrock" | "steam"; online: boolean | null; players: number | null; max: number | null; name: string | null; map: string | null; version: string | null; at: string | null; join: { href: string | null; address: string }; history: Array<{ hour: string; players: number | null; online: boolean | null }> };
export type PanelGame = { kind: "game"; key: string; title: Local; status: GameView | null; canCheck: boolean };
export type PanelPartView = PanelNumbers | PanelQueue | PanelView | PanelSettings | PanelActions | PanelChart | PanelKanban | PanelCalendar | PanelPeople | PanelReport | PanelMap | PanelScanner | PanelGame;
/** One person (by their phone or email) with their rows in each of the part's tables. */
export type PanelPerson = { key: string; by: string; name: string; last: string; tables: Array<{ table: PanelTable; title: Local; columns: PanelColumn[]; rows: PanelRow[] }> };
/** What a page asks besides its language: a calendar's month ("2026-11"), a report's period. */
export type PanelAsk = { month?: string; period?: string };
/** A part as the owner's own (sites wave 1.4): what the server keeps, as the site's file writes a part. */
export type OwnPart = Record<string, unknown> & { kind: "numbers" | "view" | "chart"; key: string };
/** What arranging a page needs: every part (hidden ones too, the owner's own with what they are) and the site's tables. */
export type PanelArrange = {
  parts: Array<{ key: string; kind: string; label: Local | null; hidden: boolean; own: boolean; part?: OwnPart }>;
  tables: Array<{ key: string; ref: string; slug: string; name: Local | null; fields: Array<{ id: string; type: string; name: Local | null; options?: Array<{ id: string; name?: Local }> }> }>;
};
export type PanelLayoutBody = { order: string[]; hidden: string[]; own: OwnPart[] };
export type PanelPageView = { featureId: string; name: string; enabled: boolean; page: PanelPageLite; pages: PanelPageLite[]; parts: PanelPartView[]; /** Only for whoever may change the site's settings. */ arrange?: PanelArrange };

const BASE = "/admin/site-panels";
const enc = encodeURIComponent;

/** The sites here with a panel, each with the pages this member sees (none: no group in the menu). */
export async function listSitePanels() {
  return (await api.get(BASE)).data as { sites: SitePanelLite[] };
}
export async function getSitePanelPage(featureId: string, page: string, lang: string, ask: PanelAsk = {}) {
  return (await api.get(`${BASE}/${enc(featureId)}/${enc(page)}`, { params: { lang, ...ask } })).data as PanelPageView;
}
const at = (featureId: string, page: string, part: string) => `${BASE}/${enc(featureId)}/${enc(page)}/${enc(part)}`;
/** A kanban's card to another column, a calendar's row to another day: the page as it is after. */
export async function move(featureId: string, page: string, part: string, row: string, to: string, lang: string, ask: PanelAsk = {}) {
  return (await api.post(`${at(featureId, page, part)}/move`, { row, to, lang }, { params: ask })).data as PanelPageView;
}
/** A person's page: their rows across the part's tables (`q`: some of their phone, email or name). */
export async function searchPeople(featureId: string, page: string, part: string, q: string, lang: string) {
  return (await api.get(`${at(featureId, page, part)}/people`, { params: { q, lang } })).data as { people: PanelPerson[] };
}
/** A scanner's code: the row it names (404: none). */
export async function findCode(featureId: string, page: string, part: string, code: string) {
  return (await api.get(`${at(featureId, page, part)}/find`, { params: { code } })).data as { row: PanelRow };
}
/** A report's period as a CSV file. */
export async function exportReport(featureId: string, page: string, part: string, period: string, lang: string) {
  const res = await api.get(`${at(featureId, page, part)}/export`, { params: { period, lang }, responseType: "blob" });
  const name = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? "report.csv";
  return { blob: res.data as Blob, name };
}
/** The page as its owner arranges it (400: `details.problems`): the page as it is after. */
export async function saveLayout(featureId: string, page: string, body: PanelLayoutBody, lang: string, ask: PanelAsk = {}) {
  return (await api.put(`${BASE}/${enc(featureId)}/${enc(page)}/layout`, body, { params: { lang, ...ask } })).data as PanelPageView;
}
/** A game server asked now (429: asked a moment ago): the page as it is after. */
export async function checkGame(featureId: string, page: string, part: string, lang: string) {
  return (await api.post(`${BASE}/${enc(featureId)}/${enc(page)}/${enc(part)}/check`, {}, { params: { lang } })).data as PanelPageView;
}
/** A queue's button pressed on one row: the page as it is after. */
export async function decide(featureId: string, page: string, part: string, row: string, decision: string, lang: string) {
  return (await api.post(`${BASE}/${enc(featureId)}/${enc(page)}/${enc(part)}/decide`, { row, decision, lang })).data as PanelPageView;
}
/** A quick action: the setting it names set; the page as it is after. */
export async function act(featureId: string, page: string, part: string, action: string, lang: string) {
  return (await api.post(`${BASE}/${enc(featureId)}/${enc(page)}/${enc(part)}/act`, { action, lang })).data as PanelPageView;
}
