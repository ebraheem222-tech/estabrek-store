import { shopOrigin, type Words } from "../studio/storeThemes";
import type { PageTree, PageTreeNode } from "./pages.api";
import { motionProfileQuery, type MotionProfile } from "../studio/motionProfiles";

export type StoreTemplate = {
  source?: { number: number; title: string; folder: string }; preview?: string;
  edition?: { sourceId: string; sourceNumber: number; sourceTitle: string; recipeId: string };
  id: string; category: string; name: Words; blurb: Words; tags: string[];
  theme: string; mode: "light" | "dark"; swatch: string[];
};
export type TemplateCategory = { id: string; name: Words; family: string; kinds: string[]; count: number };
export type StoreTemplateCatalog = { categories: TemplateCategory[]; templates: StoreTemplate[] };
export type ImportedDesign = {
  templateId: string | null;
  theme: { id: string; name: Words; blurb: Words; family: string; mode: "light" | "dark"; palettes: Record<string, Record<string, string>>; fonts: { display: string[]; text: string[] }; [key: string]: unknown };
  header: PageTree; footer: PageTree;
};

async function read<T>(path: string): Promise<T> {
  const response = await fetch(`${shopOrigin()}/api/templates${path}`, { credentials: "omit" });
  if (!response.ok) throw new Error(`Templates: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
export const getStoreTemplates = () => read<StoreTemplateCatalog>("");
export const getStoreTemplatePreview = (id: string) => read<{ sections: PageTreeNode[] }>(`/${encodeURIComponent(id)}?view=thumbnail`);
export async function getStoreTemplateImport(id: string, options?: MotionProfile): Promise<{ tree: PageTree; design: ImportedDesign }> {
  const query = motionProfileQuery(options);
  const data = await read<{ sections: PageTreeNode[]; design: ImportedDesign }>(`/${encodeURIComponent(id)}${query ? `?${query}` : ""}`);
  if (!data.design) throw new Error("The storefront needs the editable-design update");
  return { tree: { version: 1, root: { id: "page", type: "page", props: {}, children: data.sections } }, design: data.design };
}
export async function getStoreTemplateTree(id: string): Promise<PageTree> {
  const data = await read<{ sections: PageTreeNode[] }>(`/${encodeURIComponent(id)}`);
  return { version: 1, root: { id: "page", type: "page", props: {}, children: data.sections } };
}
