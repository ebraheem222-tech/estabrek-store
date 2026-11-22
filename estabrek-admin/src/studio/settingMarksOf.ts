/** A whole site's element's marks (sites wave 1; backend lib/siteSettings.ts): shown by one of its site's settings, words from one. */
import type { PageTreeNode } from "../api/pages.api";

export type ShowIf = { setting: string; is?: boolean | string | number };

/** The element's marks as they are kept, or none. */
export function marksOf(node: PageTreeNode): { showIf: ShowIf | null; fromSetting: Record<string, string> } {
  const p = (node.props ?? {}) as Record<string, unknown>;
  const s = p.showIf as ShowIf | undefined;
  const f = p.fromSetting as Record<string, unknown> | undefined;
  return {
    showIf: s && typeof s === "object" && typeof s.setting === "string" ? s : null,
    fromSetting: f && typeof f === "object" ? (Object.fromEntries(Object.entries(f).filter(([, v]) => typeof v === "string")) as Record<string, string>) : {},
  };
}
