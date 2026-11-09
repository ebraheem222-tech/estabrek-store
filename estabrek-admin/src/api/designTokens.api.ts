// The store's design variables (backend lib/designTokens.ts): published, and the editor's unpublished draft.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { DesignTokens } from "../../../estabrek-storefront/src/pageTree/designTokens";

export type { DesignTokens };
export type DesignTokensState = { tokens: DesignTokens; draft: DesignTokens | null };

const pages = ENDPOINTS.admin.pages;

export async function getDesignTokens() {
  return (await api.get(pages.designTokens)).data as DesignTokensState;
}
export async function saveDesignTokensDraft(tokens: DesignTokens) {
  return (await api.put(pages.designTokensDraft, { tokens })).data as DesignTokensState;
}
export async function dropDesignTokensDraft() {
  return (await api.delete(pages.designTokensDraft)).data as DesignTokensState;
}
export async function publishDesignTokens() {
  return (await api.post(pages.designTokensPublish)).data as DesignTokensState;
}
