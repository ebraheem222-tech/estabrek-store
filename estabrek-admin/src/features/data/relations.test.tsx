// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CollectionField, Impact, Linked } from "../../api/collections.api";
import type { Blocker, GridRow } from "../../api/data.api";

// Relations in the admin (B3): a relation's value between the rows it links and the words in its
// box, the box itself (chips and a search of the linked table), its settings in the fields editor,
// and what a change of fields or a refused delete says. The server's part is tested with the database.

const api = vi.hoisted(() => ({ lookupRows: vi.fn() }));
vi.mock("../../api/data.api", () => api);

import { setLangForTests } from "../../lib/lang";
import { firstLinkable, itemDataOut, newField } from "../collections/collectionForms";
import { FieldRulesEditor } from "../collections/FieldRulesEditor";
import { linkKind, linkParts, ruleParts, setLinkKind, setOnDelete } from "../collections/fieldRules";
import { impactText, retype } from "../collections/schemaText";
import { CellEditor, CellView } from "./GridCells";
import { blockersText, cellPatch, cellText, columnsOf, issueAbout, issueWords, opName } from "./dataText";
import { KIND_NAME, draftFrom, draftLinks, linkedName, linkedOf, linksDraft, shownText, valueFrom } from "./kinds";
import { RelationInput } from "./RelationInput";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
  vi.clearAllMocks();
});

const a1: Linked = { id: "x1", slug: "a1", title: { en: "Amal", ar: "أمل" } };
const a2: Linked = { id: "x2", slug: "a2", title: null };
const author: CollectionField = { id: "author", type: "relation", name: { en: "Author" }, to: "tbl-authors" };
const tags: CollectionField = { id: "tags", type: "relation", name: { en: "Tags" }, to: "tbl-tags", many: true };
const row = (data: Record<string, unknown>): GridRow => ({ id: "r1", collectionId: "c1", slug: "b1", status: "DRAFT", data, sort: 0, publishedAt: null, createdAt: "", updatedAt: "", deletedAt: null });
const say = (words: string, i = 1) => words.split("|")[i];

describe("A relation's value and the words in its box", () => {
  test("the linked rows, their names, and back as ids", () => {
    expect(KIND_NAME.relation.split("|")).toHaveLength(3);
    expect(linkedOf([{ ...a1, status: "DRAFT" }, a2, "junk", { slug: "no-id" }])).toEqual([a1, a2]);
    expect(linkedOf("a1")).toEqual([]);
    expect(linkedName(a1, "en")).toBe("Amal");
    expect(linkedName(a1, "he")).toBe("أمل");
    // No words: its address.
    expect(linkedName(a2, "en")).toBe("a2");
    const draft = draftFrom(author, [a1, a2]);
    expect(draftLinks(draft)).toEqual([a1, a2]);
    expect(valueFrom(tags, draft)).toEqual(["x1", "x2"]);
    // Nothing linked: an empty box, and an empty box unlinks.
    expect(draftFrom(author, undefined)).toBe("");
    expect(linksDraft([])).toBe("");
    expect(valueFrom(author, "")).toBeNull();
    expect(draftLinks("not json")).toEqual([]);
    expect(shownText(tags, [a1, a2], "en")).toBe("Amal, a2");
    expect(shownText(tags, [a1, a2], "ar")).toBe("أمل، a2");
  });

  test("a cell: shown as its rows' names; written as their ids", () => {
    const [, , column] = columnsOf({ fields: [author] }, "en");
    expect(column).toMatchObject({ id: "author", kind: "relation" });
    expect(cellText(column, row({ author: [a1] }), "en")).toBe("Amal");
    expect(cellPatch(column, row({}), "en", linksDraft([a2]))).toEqual({ values: { author: ["x2"] } });
    expect(cellPatch(column, row({ author: [a1] }), "en", "")).toEqual({ values: { author: null } });
    render(<CellView column={column} row={row({ author: [a1, a2] })} lang="en" />);
    expect(screen.getByText("Amal")).toBeTruthy();
    expect(screen.getByText("a2")).toBeTruthy();
  });

  test("what may be asked of it, and what a refusal says", () => {
    expect(say(opName("anyOf", "relation"))).toBe("linked to any of");
    expect(say(opName("empty", "relation"))).toBe("linked to nothing");
    expect(say(opName("anyOf", "select"))).toBe("any of");
    for (const message of ["No such row", "One row only", "A row can't link itself", "Already linked from another row", "Rows by their id or address", "Too many linked rows", "Only one row can link this row"]) expect(issueWords(message).split("|"), message).toHaveLength(3);
    expect(issueAbout({ value: "zz" })).toBe(" «zz»");
    expect(issueAbout({})).toBe("");
    const blockers: Blocker[] = [{ table: "t", slug: "books", name: { en: "Books" }, field: "author", rows: 2, sample: "b1" }];
    expect(say(blockersText(blockers, "en"))).toBe("2 rows of “Books” link them (field author, like b1) and don't let them be deleted. Unlink them from those rows first, or change “when deleted” in the field's rules.");
    expect(blockersText([{ ...blockers[0], name: null }], "ar")).toContain("«books»");
    // The relation by its own name when it has one.
    expect(say(blockersText([{ ...blockers[0], fieldName: { en: "Writer" } }], "en"))).toContain("(field Writer, like b1)");
  });
});

describe("The relation's box", () => {
  const found = { rows: [a1, a2, { id: "x3", slug: "a3", title: { en: "Sami" } }], total: 3 };

  test("several rows: found in the linked table, added after the others, taken out by their chip", async () => {
    api.lookupRows.mockResolvedValue(found);
    const onChange = vi.fn();
    const { rerender } = render(<RelationInput field={tags} value={linksDraft([a1])} onChange={onChange} lang="en" testId="box" />);
    // Its chips show without asking the server; the list opens when the box is used.
    expect(screen.getByTestId("box-chosen-a1").textContent).toContain("Amal");
    expect(api.lookupRows).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByTestId("box-search"));
    await screen.findByTestId("box-pick-a3");
    expect(api.lookupRows).toHaveBeenCalledWith("tbl-tags", "");
    expect(screen.getByTestId("box-pick-a1").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("box-pick-a3"));
    expect(draftLinks(onChange.mock.calls[0][0]).map((r) => r.slug)).toEqual(["a1", "a3"]);
    rerender(<RelationInput field={tags} value={onChange.mock.calls[0][0]} onChange={onChange} lang="en" testId="box" />);
    fireEvent.click(screen.getByTestId("box-remove-a1"));
    expect(draftLinks(onChange.mock.calls[1][0]).map((r) => r.slug)).toEqual(["a3"]);
    // Written words are looked for (after the typing stops).
    api.lookupRows.mockResolvedValue({ rows: [], total: 0 });
    fireEvent.change(screen.getByTestId("box-search"), { target: { value: "nobody" } });
    await screen.findByTestId("box-none");
    expect(api.lookupRows).toHaveBeenLastCalledWith("tbl-tags", "nobody");
  });

  test("one row: the new one takes the place of the old; pressed again, it's unlinked", async () => {
    api.lookupRows.mockResolvedValue(found);
    const onChange = vi.fn();
    render(<RelationInput field={author} value={linksDraft([a1])} onChange={onChange} lang="en" testId="box" autoFocus />);
    fireEvent.click(await screen.findByTestId("box-pick-a2"));
    expect(draftLinks(onChange.mock.calls[0][0])).toEqual([a2]);
    fireEvent.click(screen.getByTestId("box-pick-a1"));
    expect(onChange.mock.calls[1][0]).toBe("");
  });

  test("a relation with no table says so; a failed search too", async () => {
    render(<RelationInput field={{ many: true }} value="" onChange={vi.fn()} lang="en" testId="box" />);
    expect(screen.queryByTestId("box-search")).toBeNull();
    cleanup();
    api.lookupRows.mockRejectedValue(new Error("down"));
    setLangForTests("en");
    render(<RelationInput field={author} value="" onChange={vi.fn()} lang="en" testId="box" autoFocus />);
    await screen.findByText("The rows couldn't be read.");
  });

  test("in a cell: one row is saved as soon as it's picked; several when the cell is left", async () => {
    api.lookupRows.mockResolvedValue(found);
    const [, , one] = columnsOf({ fields: [author] }, "en");
    const onSave = vi.fn();
    render(<CellEditor column={one} row={row({})} lang="en" onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(await screen.findByTestId("cell-editor-pick-a2"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(draftLinks(onSave.mock.calls[0][0])).toEqual([a2]);
    cleanup();
    const [, , many] = columnsOf({ fields: [tags] }, "en");
    const onMany = vi.fn();
    render(<CellEditor column={many} row={row({ tags: [a1] })} lang="en" onSave={onMany} onCancel={vi.fn()} />);
    fireEvent.click(await screen.findByTestId("cell-editor-pick-a3"));
    expect(onMany).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId("cell-editor-search"), { key: "Enter" });
    expect(draftLinks(onMany.mock.calls[0][0]).map((r) => r.slug)).toEqual(["a1", "a3"]);
  });
});

describe("A relation in the fields editor", () => {
  const fit = { unique: false, limits: null, shape: false, default: false } as const;
  const tables = [{ id: "tbl-authors", name: "Authors" }, { id: "tbl-tags", name: "Tags" }];

  test("how rows pair up, and what deleting a linked row does", () => {
    expect(linkKind(author)).toBe("manyToOne");
    expect(linkKind(tags)).toBe("manyToMany");
    expect(setLinkKind(author, "oneToOne")).toEqual({ ...author, exclusive: true });
    expect(setLinkKind(author, "oneToMany")).toEqual({ ...author, many: true, exclusive: true });
    // Back to the usual: nothing is left written on the field.
    expect(setLinkKind({ ...author, many: true, exclusive: true }, "manyToOne")).toEqual(author);
    expect(setOnDelete(author, "restrict")).toEqual({ ...author, onDelete: "restrict" });
    expect(setOnDelete({ ...author, onDelete: "cascade" }, "unlink")).toEqual(author);
    expect(linkParts({ ...tags, onDelete: "restrict" }).map((p) => say(p))).toEqual(["many to many", "can't be deleted while linked"]);
    expect(ruleParts(author, "en").map((p) => say(p))).toEqual(["many to one"]);
    expect(linkParts({ id: "t", type: "text" })).toEqual([]);
  });

  test("its settings: the table, the pairing, deleting", () => {
    setLangForTests("en");
    const onChange = vi.fn();
    render(<FieldRulesEditor field={author} lang="en" fit={fit} shapes={[]} onChange={onChange} tables={tables} />);
    expect([...(screen.getByTestId("rule-author-to") as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(["Authors", "Tags"]);
    fireEvent.change(screen.getByTestId("rule-author-to"), { target: { value: "tbl-tags" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...author, to: "tbl-tags" });
    fireEvent.change(screen.getByTestId("rule-author-pairing"), { target: { value: "manyToMany" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...author, many: true });
    fireEvent.change(screen.getByTestId("rule-author-ondelete"), { target: { value: "cascade" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...author, onDelete: "cascade" });
    // No rules of the other kinds are offered.
    expect(screen.queryByTestId("rule-author-unique")).toBeNull();
    expect(screen.queryByTestId("rule-author-default")).toBeNull();
    cleanup();
    // A table that's gone is said, not shown as the first in the list.
    render(<FieldRulesEditor field={{ ...author, to: "gone" }} lang="en" fit={fit} shapes={[]} onChange={onChange} tables={tables} />);
    expect((screen.getByTestId("rule-author-to") as HTMLSelectElement).selectedOptions[0].textContent).toBe("A table that isn't there");
  });

  test("a new relation and a field turned into one get a table to link; turned back, they let go of it", () => {
    expect(newField("relation", { en: "Author" }, [], "tbl-authors")).toEqual({ id: "author", type: "relation", name: { en: "Author" }, to: "tbl-authors" });
    expect(newField("text", { en: "Title" }, [], "tbl-authors")).toEqual({ id: "title", type: "text", name: { en: "Title" } });
    expect(firstLinkable(tables, "tbl-authors")).toBe("tbl-tags");
    expect(firstLinkable([tables[0]], "tbl-authors")).toBe("tbl-authors");
    const note: CollectionField = { id: "note", type: "text", unique: true, default: { en: "x" } };
    expect(retype(note, "relation", fit, "tbl-tags")).toEqual({ id: "note", type: "relation", to: "tbl-tags" });
    expect(retype({ ...tags, exclusive: true, onDelete: "cascade" }, "text", { unique: true, limits: "length", shape: true, default: true })).toEqual({ id: "tags", type: "text", name: { en: "Tags" } });
  });

  test("the older item form sends the linked rows by id, and an emptied relation as none", () => {
    const fields: CollectionField[] = [{ id: "title", type: "text" }, author, tags];
    expect(itemDataOut(fields, { title: { en: "B" }, author: [a1], tags: ["x2", "x3"] })).toEqual({ title: { en: "B" }, author: ["x1"], tags: ["x2", "x3"] });
    expect(itemDataOut(fields, { title: { en: "B" }, author: null })).toEqual({ title: { en: "B" }, author: [], tags: [] });
  });
});

describe("A change of fields, said before it's made", () => {
  const impact = (over: Partial<Impact> & { change: Impact["change"] }): Impact => ({ field: "tags", rows: 0, converted: 0, lost: 0, hidden: 0, failing: 0, missing: 0, doubles: 0, samples: [], ...over });

  test("a relation's links are hidden or shown again, never deleted", () => {
    expect(say(impactText(impact({ change: "removed", from: "relation", rows: 2, hidden: 2 }), "Tags"))).toBe("“Tags” goes. The links of 2 rows are hidden (not deleted), and show again if it's put back as it was.");
    expect(say(impactText(impact({ change: "removed", from: "relation" }), "Tags"))).toBe("“Tags” goes. It held no links.");
    expect(say(impactText(impact({ change: "added", to: "relation", rows: 2, converted: 2 }), "Tags"))).toBe("“Tags”: a new relation. The links of 2 rows, kept from before, show again.");
    expect(say(impactText(impact({ change: "retyped", from: "text", to: "relation", rows: 3, lost: 3 }), "Note"))).toBe("“Note”: from Short words to Link to a table. 3 written values are put aside (rows are linked by picking them, not by writing), and come back if the kind is changed back.");
    expect(say(impactText(impact({ change: "retyped", from: "relation", to: "text", rows: 1, hidden: 1, converted: 2 }), "Note"))).toBe("“Note”: from Link to a table to Short words. The links of 1 rows are hidden (not deleted), and show again if it's put back as it was. 2 written values, kept from before, come back.");
    const ruled = impactText(impact({ change: "ruled", from: "relation", to: "relation", rows: 4, hidden: 2, failing: 1, missing: 3, doubles: 2 }), "Author");
    expect(say(ruled)).toBe("“Author”: new relation settings. It links another table now: the links of 2 rows to the first one are hidden (not deleted), and show again if it's pointed back. 1 rows link more than one row: they stay as they are until they're changed. 3 rows link nothing, and it's required. 2 rows link a row that another row links too, where only one may.");
    for (const text of [ruled, impactText(impact({ change: "added", to: "relation", lost: 1 }), "x")]) expect(text.split("|")).toHaveLength(3);
  });
});
