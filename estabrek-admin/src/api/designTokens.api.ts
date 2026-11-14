// The store's design variables (backend lib/designTokens.ts): published, and the editor's unpublished draft.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { DesignTokens } from "../../../estabrek-storefront/src/pageTree/designTokens";

export type { DesignTokens };
export type DesignTokensState = { tokens: DesignTokens; draft: DesignTokens | null };

const pages = ENDPOINTS.admin.pages;

/**
 * An API from before font sizes answers without them, and refuses a word it doesn't know. So the editor reads
 * every group as a list, and sends the sizes only when there are some (the API takes none as an empty list).
 */
export const wholeTokens = (t: DesignTokens): DesignTokens => (Array.isArray(t.sizes) ? t : { ...t, sizes: [] });
export function tokensToSend(t: DesignTokens): Partial<DesignTokens> {
  if (t.sizes.length) return t;
  const rest: Partial<DesignTokens> = { ...t };
  delete rest.sizes;
  return rest;
}
const whole = (s: DesignTokensState): DesignTokensState => ({ tokens: wholeTokens(s.tokens), draft: s.draft ? wholeTokens(s.draft) : null });

export async function getDesignTokens() {
  return whole((await api.get(pages.designTokens)).data as DesignTokensState);
}
export async function saveDesignTokensDraft(tokens: DesignTokens) {
  return whole((await api.put(pages.designTokensDraft, { tokens: tokensToSend(tokens) })).data as DesignTokensState);
}
export async function dropDesignTokensDraft() {
  return whole((await api.delete(pages.designTokensDraft)).data as DesignTokensState);
}
export async function publishDesignTokens() {
  return whole((await api.post(pages.designTokensPublish)).data as DesignTokensState);
}
