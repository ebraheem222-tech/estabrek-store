// The product in the shop's other languages: name, description, Google texts, the type's
// written fields and the colours' names. Saved with the product (translations).
import React, { useMemo } from "react";
import { TranslationsPanel } from "../../../components/TranslationsPanel";
import { useSettings } from "../../../hooks/useSettings";
import { LANG_LABEL } from "../../../lib/storeIdentity";
import { translationLangs, translationsOf } from "../../../lib/translations";
import type { ProductType } from "../../../api/productTypes.api";
import type { ComposerDraft } from "./composerModel";
import { productRows } from "./translationRows";
import { tr } from "@/lib/words";

export function TranslationsBlock({ draft, update, type }: { draft: ComposerDraft; update: (fn: (d: ComposerDraft) => ComposerDraft) => void; type: ProductType | null }) {
  const settings = useSettings();
  const { main, others } = translationLangs(settings.data?.header);
  const rows = useMemo(() => productRows(draft, type), [draft, type]);
  if (!others.length) return null;
  const value = translationsOf(draft.translations);
  const done = others.filter((l) => value[l] && Object.keys(value[l]!).length).map((l) => LANG_LABEL[l]);
  return (
    <details className="glass group rounded-2xl p-4 sm:p-5" data-testid="product-translations">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-medium text-white/75 sm:min-h-0">
        {tr("الترجمة (", "Translation (")}{others.map((l) => LANG_LABEL[l]).join(tr("، ", ", "))})
        <span className="text-xs text-white/40 group-open:hidden">{done.length ? tr(`في ترجمة: ${done.join("، ")}`, "Translated: {0}", [done.join(", ")]) : tr("بيبين بالنص الأصلي", "Shows the original text")}</span>
      </summary>
      <div className="mt-4">
        <TranslationsPanel
          langs={others}
          main={main}
          rows={rows}
          value={value}
          onChange={(next) => update((d) => ({ ...d, translations: next }))}
          context={tr(`منتج بالمتجر: ${draft.title || "بدون اسم"}`, "A product in the store: {0}", [draft.title || "بدون اسم"])}
        />
      </div>
    </details>
  );
}
