/**
 * Setting up a new store (admin → إعداد المتجر): what the store sells, its theme, and the
 * starter content that fits it: categories, product types, the home page and a few pages
 * (each in Arabic, English and Hebrew), and the main menu. The admin sends the content
 * (its industry packs live there); this checks it and turns it into rows. Everything it
 * makes is ordinary content the owner edits afterwards like anything else.
 */
import { z } from "zod";
import { AUDIENCES, INDUSTRIES } from "../identity/identity.js";
import { PageSectionTypeZ, getPublishIssuesForSection, validateSectionData } from "../admin/pageSectionData.schemas.js";
import { TypeBody } from "../productTypes/productTypes.js";
import { CONTENT_LANGS, type ContentLang } from "../../lib/translations.js";
import { checkTree, type TreeNode } from "../../lib/pageTree.js";
import { ThemeSnapshotSchema } from "../../lib/designTheme.js";

const words = (max: number) =>
  z.object({ ar: z.string().trim().max(max).optional(), en: z.string().trim().max(max).optional(), he: z.string().trim().max(max).optional() });
export type Words = z.infer<ReturnType<typeof words>>;

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{0,59}$/);
const pageSlug = z.string().trim().regex(/^\/([a-z0-9][a-z0-9-/]{0,59})?$/);
const href = z.string().trim().max(300).refine((v) => /^\/(?!\/)/.test(v) || /^https:\/\//.test(v), "A link inside the shop (/…) or https://");

const CategorySpec = z.object({
  slug,
  name: words(120),
  children: z.array(z.object({ slug, name: words(120) })).max(12).default([]),
});
export type CategorySpec = z.infer<typeof CategorySpec>;

const TypeSpec = TypeBody.extend({ slug, names: words(60).optional() });

const SectionSpec = z.object({
  type: PageSectionTypeZ,
  /** The section's data in each language (the store's main language becomes the section, the others its translations). */
  data: z.object({ ar: z.record(z.string(), z.any()).optional(), en: z.record(z.string(), z.any()).optional(), he: z.record(z.string(), z.any()).optional() }),
});
export type SectionSpec = z.infer<typeof SectionSpec>;

const setupTree = z.unknown().transform((input, ctx) => {
  const result = checkTree(input);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.issues.slice(0, 3).map((i) => `${i.path}: ${i.message}`).join("; ") });
    return z.NEVER;
  }
  const references = (node: TreeNode): boolean => node.type === "legacy" || Boolean(node.children?.some(references));
  if (!result.tree.root.children?.length || references(result.tree.root)) {
    ctx.addIssue({ code: "custom", message: "A setup tree needs its own sections, without legacy references" });
    return z.NEVER;
  }
  return result.tree;
});

const PageSpec = z.object({
  slug: pageSlug,
  name: words(120),
  seoTitle: words(120).optional(),
  seoDescription: words(320).optional(),
  sections: z.array(SectionSpec).max(20).default([]),
  tree: setupTree.optional(),
}).refine((p) => p.tree ? p.sections.length === 0 : p.sections.length > 0, "Supply an editable tree or legacy sections, not both");
export type PageSpec = z.infer<typeof PageSpec>;

const MenuItem = z.object({ label: words(60), href });

export const SetupBody = z.object({
  industry: z.enum(INDUSTRIES),
  audience: z.enum(AUDIENCES).optional(),
  /** The store's name and line, when the wizard asked for them. */
  name: words(60).optional(),
  tagline: words(80).optional(),
  logoUrl: z.string().trim().max(2048).url().refine((url) => /^https?:\/\//i.test(url), "Logo must use HTTP or HTTPS").nullable().optional(),
  /** null = the rose design. */
  theme: z.object({ id: z.string().trim().max(60).nullable(), mode: z.enum(["light", "dark"]).nullable().default(null) }),
  design: z.object({ templateId: z.string().trim().max(60).nullable(), theme: ThemeSnapshotSchema, header: setupTree, footer: setupTree }).optional(),
  categories: z.array(CategorySpec).max(30).default([]),
  types: z.array(TypeSpec).max(20).default([]),
  pages: z.array(PageSpec).max(12).default([]),
  menu: z.array(MenuItem).max(16).default([]),
  /** Put the new home page in place of an existing one (kept as a revision first). */
  replaceHome: z.boolean().default(false),
}).refine((body) => !body.design || body.pages.some((page) => page.slug === "/" && page.tree), {
  path: ["pages"], message: "A complete design requires its own editable home page",
});
export type SetupBody = z.infer<typeof SetupBody>;

/** One text in a language: that language's own, else the main language's, else any. */
export function wordIn(w: Words | undefined, lang: ContentLang, main: ContentLang): string {
  if (!w) return "";
  return (w[lang] || w[main] || w.ar || w.en || w.he || "").trim();
}

/** The other languages' texts, for a `translations` column ({ en: { name }, he: { name } }). */
export function otherLangs<K extends string>(key: K, w: Words | undefined, main: ContentLang): Partial<Record<ContentLang, Record<K, string>>> {
  const out: Partial<Record<ContentLang, Record<K, string>>> = {};
  for (const l of CONTENT_LANGS) {
    if (l === main) continue;
    const v = w?.[l]?.trim();
    if (v) out[l] = { [key]: v } as Record<K, string>;
  }
  return out;
}

export class SetupError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

/**
 * A section as rows: its data in the main language and a translation per other language,
 * each checked like the page editor checks it. A language without its own data uses the
 * main language's (no translation row).
 */
export function sectionRows(spec: SectionSpec, main: ContentLang) {
  const mainData = spec.data[main] ?? spec.data.ar ?? spec.data.en ?? spec.data.he;
  if (!mainData) throw new SetupError(`section.${spec.type}`, "A section needs its words in at least one language");
  const check = (d: unknown, where: string) => {
    let data: Record<string, unknown>;
    try {
      data = validateSectionData(spec.type, d) as Record<string, unknown>;
    } catch (e) {
      throw new SetupError(where, `${spec.type}: ${e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ") : String(e)}`);
    }
    // Published right away, so it must be publishable.
    const issue = getPublishIssuesForSection(spec.type, data)[0];
    if (issue) throw new SetupError(where, issue.message);
    return data;
  };
  const data = check(mainData, `section.${spec.type}.${main}`);
  const translations = CONTENT_LANGS.filter((l) => l !== main && spec.data[l]).map((l) => ({ locale: l, data: check(spec.data[l], `section.${spec.type}.${l}`) }));
  return { type: spec.type, data, translations };
}
