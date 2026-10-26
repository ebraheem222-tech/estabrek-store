// Smart selling: sale rules (they suggest, you approve) and seasons (admin → البيع الذكي).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type RuleName = "unseen" | "lookedNotBought" | "hotLowStock";

export type RuleSettings = {
  unseen: { on: boolean; percent: number; saleDays: number };
  lookedNotBought: { on: boolean; percent: number; saleDays: number };
  hotLowStock: { on: boolean; maxLeft: number };
};

export type SaleAction = { kind: "discount"; percent: number; saleDays: number } | { kind: "endDiscount" };

export type Suggestion = {
  rule: RuleName;
  productId: string;
  title: string;
  slug: string;
  thumbUrl: string | null;
  action: SaleAction;
  why: Record<string, number | string | null>;
};

export type SuggestionsPage = {
  now: number;
  rules: RuleSettings;
  defaults: RuleSettings;
  limits: { percent: { min: number; max: number }; saleDays: { min: number; max: number }; maxLeft: { min: number; max: number } };
  unseenDays: number;
  viewsDays: number;
  suggestions: Suggestion[];
};

export type PriceFields = { price: number; originalPrice: number | null; salePrice: number | null; saleStartsAt: string | null; saleEndsAt: string | null };

export type PriceAction = {
  id: string;
  kind: "discount" | "endDiscount" | "campaign";
  rule: RuleName | null;
  campaignId: string | null;
  productId: string;
  title: string;
  changes: Array<{ variantId: string; before: PriceFields; after: PriceFields }>;
  status: "applied" | "undone" | "ended";
  createdAt: string;
  undoneAt: string | null;
};

export type CampaignStatus = "scheduled" | "running" | "ended" | "canceled";

export type Campaign = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  themePresetId: string | null;
  themeBefore: string | null;
  percentOff: number | null;
  categoryIds: string[];
  productIds: string[];
  status: CampaignStatus;
  startedAt: string | null;
  endedAt: string | null;
  log: {
    missed?: boolean;
    start?: { at: string; products: number; sizes: number; leftAlone: number; theme: boolean };
    end?: { at: string; restored: number; changedSince: number; themeBack: boolean; early: boolean };
  } | null;
};

export type CampaignInput = {
  name: string;
  startsAt: string;
  endsAt: string;
  themePresetId: string | null;
  percentOff: number | null;
  categoryIds: string[];
  productIds: string[];
};

const S = ENDPOINTS.admin.selling;

export async function getSuggestions() {
  return (await api.get(S.suggestions)).data as SuggestionsPage;
}

export async function saveRules(patch: Partial<{ [K in keyof RuleSettings]: Partial<RuleSettings[K]> }>) {
  return (await api.patch(S.rules, patch)).data as { rules: RuleSettings };
}

export async function approveSuggestions(items: Array<{ rule: RuleName; productId: string; percent?: number; saleDays?: number }>) {
  return (await api.post(S.approve, { items })).data as {
    results: Array<{ productId: string; rule: RuleName; ok: boolean; actionId?: string | null; changed?: number; leftAlone?: number; error?: string }>;
  };
}

export async function skipSuggestion(rule: RuleName, productId: string, days = 30) {
  return (await api.post(S.skip, { rule, productId, days })).data as { until: string };
}

export async function getPriceActions() {
  return (await api.get(S.actions)).data as { actions: PriceAction[] };
}

export async function undoPriceAction(id: string) {
  return (await api.post(S.undo(id), {})).data as { restored: number; changedSince: number };
}

export async function getCampaigns() {
  return (await api.get(S.campaigns)).data as { campaigns: Campaign[]; maxDays: number; now: number };
}

export async function previewCampaign(body: Pick<CampaignInput, "percentOff" | "categoryIds" | "productIds">) {
  return (await api.post(S.campaignPreview, body)).data as { products: number; sizes: number; onSaleAlready: number };
}

export async function createCampaign(body: CampaignInput) {
  return (await api.post(S.campaigns, body)).data as { campaign: Campaign };
}

export async function updateCampaign(id: string, body: CampaignInput) {
  return (await api.patch(S.campaign(id), body)).data as { campaign: Campaign };
}

export async function endCampaign(id: string) {
  return (await api.post(S.campaignEnd(id), {})).data as { campaign: Campaign };
}
