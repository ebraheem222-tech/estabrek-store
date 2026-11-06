import { catalogOpening, catalogSection, type SectionRecipe } from "./catalogSections";
import { INDUSTRIES, industry, type Industry } from "./industries";
import { SHOE_CATALOG_CONTENT } from "./catalogContent";
import { REFERENCE_ASSETS } from "./referenceAssets";
import { sourceHeader, sourceFooter, type RefLink } from "./referenceShared";
import { el, t, type Node } from "../tree";
import type { TK } from "../lib";
import type { Template } from "./types";

export type ReferenceEditionRecipe = {
  id: string; source: string; opening: string; spotlight: number;
  sections: SectionRecipe[];
};
const links: RefLink[] = [
  { label: t("المتجر|Shop|חנות"), href: "/shop" },
  { label: t("من نحن|About|עלינו"), href: "/about" },
  { label: t("تواصل|Contact|יצירת קשר"), href: "/contact" },
];
const shoeProfile = industry(SHOE_CATALOG_CONTENT);
export const editionIndustry = (source: Template): Industry => INDUSTRIES.find(d => d.id === source.category) ?? shoeProfile;

/** Reuse the selected reference's pictures, rather than silently borrowing a different reference. */
function withSourcePictures(k: TK, source: Template): TK {
  const pictures = Object.entries(REFERENCE_ASSETS[source.source!.number] ?? {})
    .filter(([name]) => /\.(avif|webp|jpe?g|png)$/i.test(name) && !/logo|icon|favicon|avatar|author/i.test(name))
    .map(([, value]) => value);
  if (!pictures.length) return k;
  return { ...k, pic: name => {
    if (name === "hero") return pictures[0];
    const index = Number(name.match(/\d+/)?.[0] ?? 1) - 1;
    return pictures[Math.max(0, index) % pictures.length];
  } };
}

/** Every decision is in a recipe; rendering never searches, mutates the source, or uses randomness. */
export function referenceEditionHome(source: Template, recipe: ReferenceEditionRecipe, input: TK): Node[] {
  const k = withSourcePictures(input, source);
  const profile = editionIndustry(source);
  const originals = source.home(k);
  // Keep a native source-specific interaction/section. The opening and the rest of
  // the editorial journey are composed independently instead of shuffling a site.
  const spotlight = originals[1 + recipe.spotlight % Math.max(1, originals.length - 1)];
  const sections = [
    catalogOpening(k, profile, recipe.opening),
    ...recipe.sections.slice(0, 2).map(section => catalogSection(k, profile, section)),
    ...(spotlight ? [spotlight] : []),
    ...recipe.sections.slice(2).map(section => catalogSection(k, profile, section)),
  ];
  const anchors = new Set<string>();
  const collect = (nodes: Node[]) => nodes.forEach(node => { if (typeof node.props.anchor === "string") anchors.add(node.props.anchor); collect(node.children ?? []); });
  collect(sections);
  // A retained source section can link to one of its original siblings. Only
  // destinations that still exist belong to this composition; retain all valid
  // local links and route omitted targets to the appropriate merchant page.
  const destination = (href: string) => {
    if (!href.startsWith("#") || href === "#" || anchors.has(href.slice(1))) return href;
    if (/about|story|vision|approach|team|artist/i.test(href)) return "/about";
    if (/contact|newsletter|booking|schedule|programme|pricing|plan/i.test(href)) return "/contact";
    return "/shop";
  };
  const props = (value: unknown): unknown => Array.isArray(value) ? value.map(props) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).map(([key,v]) => [key, key === "href" && typeof v === "string" ? destination(v) : props(v)])) : value;
  const copy = (node: Node): Node => ({ ...node, props: props(node.props) as Node["props"], ...(node.children ? { children: node.children.map(copy) } : {}) });
  return sections.map(copy);
}

export function referenceEdition(source: Template, recipe: ReferenceEditionRecipe): Template {
  const provenance = source.source!;
  const profile = editionIndustry(source);
  const edition = recipe.id.split("-").at(-1)!;
  return {
    id: recipe.id, category: source.category,
    name: t(`${provenance.title} · تكوين ${edition}|${provenance.title} · Composition ${edition}|${provenance.title} · עיצוב ${edition}`),
    blurb: t(`توليفة قابلة للتحرير مستوحاة من ${provenance.title}، بافتتاحية ومسار أقسام مستقلين.|An editable edition inspired by ${provenance.title}, with its own opening and section composition.|גרסה לעריכה בהשראת ${provenance.title}, עם פתיחה והרכב מקטעים עצמאיים.`),
    brand: profile.brand,
    style: { ...source.style, id: recipe.id },
    edition: { sourceId: source.id, sourceNumber: provenance.number, sourceTitle: provenance.title, recipeId: recipe.id },
    tags: ["generated", "reference-inspired", provenance.title, source.category, recipe.opening, ...source.tags.filter(tag => tag !== "reference")],
    header: { kind: "minimal" }, footer: { kind: "line", line: profile.intro },
    regions: {
      header: (k, brand) => sourceHeader(k, brand, links, { center: recipe.opening === "folio", compact: true, bg: source.style.seed.bg, color: source.style.seed.ink }),
      footer: (k, brand) => {
        const footer = sourceFooter(k, brand, links, { columns: true, line: profile.intro });
        const slug = provenance.folder.replace(/^templatemo_\d+_/, "").replaceAll("_", "-");
        footer.children = [...footer.children ?? [], el(k, "button", { label: t("إلهام التصميم: TemplateMo|Design inspiration: TemplateMo|השראת העיצוב: TemplateMo"), href: `https://templatemo.com/tm-${provenance.number}-${slug}`, variant: "link" }, { style: { size: 11, opacity: .7, pad: [12, 0, 0, 0] } })];
        return footer;
      },
    },
    home: k => referenceEditionHome(source, recipe, k),
  };
}
