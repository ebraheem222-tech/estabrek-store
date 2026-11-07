import { expect, test } from "vitest";
import { commercePageIssues } from "../lib/commercePage.js";
import { commercePageValid } from "../../../estabrek-storefront/src/pageTree/commerce.js";
import { storePageDraft } from "../lib/storePageTemplates.js";

test("the public fallback and backend publication guard agree on missing, duplicated and hidden commerce", () => {
  for (const kind of ["shop", "cart"] as const) {
    const valid = storePageDraft(kind).tree;
    const empty = { version: 1 as const, root: { id: "page", type: "page" as const, props: {}, children: [] } };
    const hidden = structuredClone(valid); hidden.root.style = { base: { hidden: true } };
    const duplicated = structuredClone(valid);
    duplicated.root.children![0].children!.push({ id: "duplicate-part", type: kind === "shop" ? "shop" : "cartSummary", props: {} });
    for (const tree of [valid, empty, hidden, duplicated]) {
      expect(commercePageValid(`/${kind}`, tree)).toBe(commercePageIssues(`/${kind}`, tree).length === 0);
    }
  }
});
