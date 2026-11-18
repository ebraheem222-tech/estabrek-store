import { describe, expect, test } from "vitest";
import { GALLERY, galleryFile, galleryList } from "../lib/gallery/index.js";
import { CATEGORIES } from "../lib/gallery/kit.js";
import { planInstall, readTemplate } from "../lib/featureTemplate.js";
import { problemsOf, type Known } from "../lib/fnDef.js";
import { codeProblems } from "../lib/fnCode.js";
import { runTests } from "../modules/functions/functions.service.js";
import type { Field } from "../lib/collectionTree.js";

// The gallery's ready examples (admin → ميزاتي → المعرض), every one of them, read as a store reads
// a template file: it must read, plan with no problems in an empty store, and its functions must be
// whole: every table, field and name they talk about is there. What is left to the store after
// installing is only what is its own: the connection a ready step uses. The tests an example carries
// run here too, as they run before publishing.

const empty = { tables: new Set<string>(), pages: new Set<string>(), calls: new Set<string>(), routes: new Set<string>() };
/** What a store picks for itself after installing (its own connection): not a mistake in the example. */
const THE_STORES = new Set(["Pick a connection"]);

describe("The gallery", () => {
  test("every example reads as a template file, once, with its words in the three languages", () => {
    const keys = GALLERY.map((e) => e.template.key);
    expect(keys.filter((k, n) => keys.indexOf(k) !== n), "two examples with one key").toEqual([]);
    for (const e of GALLERY) {
      const r = readTemplate(e.template);
      expect(r.ok ? [] : r.problems, e.template.key).toEqual([]);
      for (const l of ["ar", "en", "he"] as const) {
        expect(e.template.name[l]?.trim(), `${e.template.key}: name.${l}`).toBeTruthy();
        expect(e.template.note?.[l]?.trim(), `${e.template.key}: note.${l}`).toBeTruthy();
      }
      expect(Object.keys(CATEGORIES)).toContain(e.category);
    }
    expect(galleryList().items).toHaveLength(GALLERY.length);
  });

  test("every example installs into an empty store with nothing missing in its steps", async () => {
    const wrong: string[] = [];
    for (const e of GALLERY) {
      const t = readTemplate(e.template);
      if (!t.ok) continue;
      const { plan, problems } = planInstall(t.template, empty);
      for (const p of problems) wrong.push(`${e.template.key} ${p.at}: ${p.message}`);
      const known: Known = {
        tables: plan.tables.map((x) => ({ id: x.id, slug: x.slug, name: x.name, fields: x.fields as Field[] })),
        // The example's own functions, as they will be once published.
        fns: plan.fns.map((x) => ({ id: x.id, name: x.name, live: true, inputs: x.def.inputs })),
      };
      for (const fn of plan.fns) {
        for (const p of [...problemsOf(fn.def, { ...known, self: fn.id }), ...(await codeProblems(fn.def))]) if (!THE_STORES.has(p.message)) wrong.push(`${e.template.key}/${fn.key} ${p.at}: ${p.message}`);
      }
    }
    expect(wrong).toEqual([]);
  }, 120_000);

  test("the tests the examples carry pass", async () => {
    const failed: string[] = [];
    for (const e of GALLERY) {
      const t = readTemplate(e.template);
      if (!t.ok) continue;
      const { plan } = planInstall(t.template, empty);
      for (const fn of plan.fns) {
        if (!fn.tests.length) continue;
        const ran = await runTests(fn.def, fn.tests as never, { kind: "admin" });
        for (const r of ran.results) if (!r.pass) failed.push(`${e.template.key}/${fn.key} «${r.name}»: ${JSON.stringify(r).slice(0, 300)}`);
      }
    }
    expect(failed).toEqual([]);
  }, 120_000);

  test("its own addresses are all different, so any of them can be installed beside the others", () => {
    const seen = new Map<string, string>();
    const twice: string[] = [];
    for (const e of GALLERY) {
      const t = readTemplate(e.template);
      if (!t.ok) continue;
      for (const fn of planInstall(t.template, empty).plan.fns)
        for (const tr of fn.triggers) {
          if (tr.kind !== "route" || !tr.slug) continue;
          if (seen.has(tr.slug)) twice.push(`${tr.slug}: ${seen.get(tr.slug)} and ${e.template.key}`);
          seen.set(tr.slug, e.template.key);
        }
    }
    expect(twice).toEqual([]);
  });

  test("one example's file is found by its key", () => {
    const first = GALLERY[0].template.key;
    expect(galleryFile(first)?.key).toBe(first);
    expect(galleryFile("no-such-example")).toBeNull();
  });
});
