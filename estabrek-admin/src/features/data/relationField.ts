/**
 * A relation added from the Tables page (./RelationDialog.tsx), the pure parts (tested): how many
 * rows stand on each side of each kind, and the field a choice becomes.
 */
import type { Collection, CollectionField, Local, OnDelete } from "../../api/collections.api";
import type { Lang } from "../../api/data.api";
import { fieldIdOf } from "../collections/collectionForms";
import { setLinkKind, setOnDelete, type LinkKind } from "../collections/fieldRules";
import { STORE_FIELD_NAME, storeTarget } from "./storeLinks";

const three = (s: string): Local => {
  const [ar, en, he] = s.split("|");
  return { ar, en, he };
};

/** How many rows on each side: this table's, then the linked table's. */
export const LINK_MARKS: Record<LinkKind, [string, string]> = { manyToOne: ["∞", "1"], oneToOne: ["1", "1"], manyToMany: ["∞", "∞"], oneToMany: ["1", "∞"] };

/** The relation as it is saved: a new field of the table, called by the linked table when no name was written. */
export function relationField(table: Pick<Collection, "fields">, ask: { to: string; kind: LinkKind; onDelete: OnDelete; name: string; lang: Lang }, target: { name: Local; slug: string } | null): CollectionField {
  const store = storeTarget(ask.to);
  const base: Local = store ? three(STORE_FIELD_NAME[store]) : { ...(target?.name ?? {}) };
  const name: Local = ask.name.trim() ? { ...base, [ask.lang]: ask.name.trim() } : base;
  const id = fieldIdOf(store ? three(STORE_FIELD_NAME[store]).en! : target?.name.en || target?.slug || "link", table.fields.map((f) => f.id));
  // One of the store's rows that is deleted only drops its links: nothing else is asked.
  return setOnDelete(setLinkKind({ id, type: "relation", name, to: ask.to }, ask.kind), store ? "unlink" : ask.onDelete);
}
