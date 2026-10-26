// The product's texts to translate (الترجمة), in the order of the shop's page.
import type { ProductType } from "../../../api/productTypes.api";
import type { TranslationRow } from "../../../lib/translations";
import type { ComposerDraft } from "./composerModel";
import { tr } from "@/lib/words";

/** The texts of a product the shop shows, in the order of the page. */
export function productRows(draft: ComposerDraft, type: ProductType | null): TranslationRow[] {
  const rows: TranslationRow[] = [
    { path: ["title"], label: tr("اسم المنتج", "Product name"), base: draft.title, max: 160 },
    { path: ["description"], label: tr("الوصف", "Description"), base: draft.description, max: 5000, multiline: true },
    { path: ["seoTitle"], label: tr("العنوان في Google", "Title on Google"), base: draft.seoTitle, max: 120 },
    { path: ["seoDescription"], label: tr("الوصف في Google", "Description on Google"), base: draft.seoDescription, max: 320, multiline: true },
  ];
  // Written values only: choices and Yes/No are translated once, in the type (أنواع المنتجات).
  for (const f of type?.fields ?? []) {
    if (f.kind !== "text" && f.kind !== "longtext") continue;
    const v = draft.attributes[f.key];
    if (typeof v === "string") rows.push({ path: ["attributes", f.key], label: f.label, base: v, max: 200, multiline: f.kind === "longtext", group: tr("تفاصيل القطعة", "Item details") });
  }
  for (const g of draft.groups) {
    const name = g.name.trim();
    if (!name || name === "لون واحد" || name === "Default") continue;
    rows.push({ path: ["colors", name], label: name, base: name, max: 40, group: tr("أسماء الألوان", "Colour names") });
  }
  return rows;
}
