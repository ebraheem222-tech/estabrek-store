/**
 * The store's design variables in the editor (backend lib/designTokens.ts, shop
 * pageTree/designTokens.ts): the draft being changed or the published ones, shared with every
 * picker through a context, and a small picker that writes "$id" into a style. Pure helpers are
 * tested in designTokens.test.tsx.
 */
import { createContext, useContext, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../lib/toast";
import { getApiErrorMessage } from "../api/http";
import { dropDesignTokensDraft, getDesignTokens, publishDesignTokens, saveDesignTokensDraft, type DesignTokens, type DesignTokensState } from "../api/designTokens.api";
import type { TokenGroup } from "../../../estabrek-storefront/src/pageTree/designTokens";
import { adminLang } from "../lib/lang";
import { say } from "./say";

export type { DesignTokens, TokenGroup };
export const EMPTY_TOKENS: DesignTokens = { version: 1, colors: [], fonts: [], spaces: [], radii: [], shadows: [] };
export const TOKEN_GROUP_NAMES: Record<TokenGroup, string> = {
  colors: "الألوان|Colours|צבעים",
  fonts: "الخطوط|Fonts|גופנים",
  spaces: "المسافات|Spaces|מרווחים",
  radii: "الزوايا|Corners|פינות",
  shadows: "الظلال|Shadows|צללים",
};

/** What every picker sees: the variables being changed (the draft), else the published ones. */
export const TokensContext = createContext<DesignTokens | null>(null);
export const useTokens = () => useContext(TokensContext);

type Item = DesignTokens[TokenGroup][number];
/** A variable's name in the editor's language (its id when it has none). */
export const tokenName = (t: Item) => (t.name?.[adminLang()] || t.name?.en || t.name?.ar || t.id);
/** The variable a style value names ("$brand"), in its group. */
export function tokenOf(tokens: DesignTokens | null, group: TokenGroup, value: unknown): Item | undefined {
  if (!tokens || typeof value !== "string" || !value.startsWith("$")) return undefined;
  return (tokens[group] as Item[]).find((t) => t.id === value.slice(1));
}
/** A new variable's id: the name's latin letters, else the group's word and a number, never taken. */
export function newTokenId(tokens: DesignTokens, group: TokenGroup, name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 24) || { colors: "colour", fonts: "font", spaces: "space", radii: "corner", shadows: "shadow" }[group];
  const taken = new Set((tokens[group] as Item[]).map((t) => t.id));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}
/** The tokens with one group's list changed. */
export const withGroup = <G extends TokenGroup>(tokens: DesignTokens, group: G, list: DesignTokens[G]): DesignTokens => ({ ...tokens, [group]: list });

/** The variables, their draft and publishing; `onSaved` refreshes the preview. */
export function useDesignTokens(onSaved: () => void | Promise<void>) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["design-tokens"], queryFn: getDesignTokens, staleTime: 30_000, retry: false });
  const [busy, setBusy] = useState(false);
  const tokens = q.data?.draft ?? q.data?.tokens ?? EMPTY_TOKENS;
  const run = async (fn: () => Promise<DesignTokensState>, failed: string) => {
    setBusy(true);
    try {
      qc.setQueryData(["design-tokens"], await fn());
      await onSaved();
      return true;
    } catch (e) {
      toast.error(failed, { description: getApiErrorMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return {
    loaded: q.isSuccess,
    tokens,
    hasDraft: Boolean(q.data?.draft),
    busy,
    save: (next: DesignTokens) => run(() => saveDesignTokensDraft(next), say("ما انحفظت المتغيرات|The variables weren't saved|המשתנים לא נשמרו")),
    publish: () => run(publishDesignTokens, say("ما انتشرت المتغيرات|The variables weren't published|המשתנים לא פורסמו")),
    drop: () => run(dropDesignTokensDraft, say("ما انلغت التغييرات|The changes weren't dropped|השינויים לא בוטלו")),
  };
}

const control = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
/** Picks one of a group's variables for a style (null: none); nothing when the group is empty. */
export function TokenSelect({ group, value, busy, label, onPick, testId }: { group: TokenGroup; value: unknown; busy: boolean; label?: string; onPick: (v: string | null) => void; testId?: string }) {
  const tokens = useTokens();
  const list = (tokens?.[group] ?? []) as Item[];
  if (!list.length) return null;
  const on = typeof value === "string" && value.startsWith("$") ? value : "";
  return (
    <label className="block text-[11px] text-white/55">
      {label ?? say("من المتغيرات|From the variables|מהמשתנים")}
      <select className={control} disabled={busy} value={on} onChange={(e) => onPick(e.target.value || null)} data-testid={testId ?? `token-select-${group}`}>
        <option value="">{say("— بدون —|— none —|— ללא —")}</option>
        {list.map((t) => <option key={t.id} value={`$${t.id}`}>◆ {tokenName(t)}</option>)}
      </select>
    </label>
  );
}
