// Site blueprints (wave 0 of docs/sites-300-plan.ar.md): a site is a business, an archetype and the
// modules it uses; compile.ts builds it into the feature template the store installs. The backend reads
// the same files (siteTemplates.unit.spec.ts, sites.spec.ts) and installs them for real.
import { describe, expect, test } from "vitest";
import { createHash } from "node:crypto";
import { ARCHETYPES, FRONT_LOOKS, MODULES, SITES, blueprintProblems, buildChosen, buildSite, keepModules, modulesOf, pagesOf, siteByKey, siteCounts, slugsOf, withChoices, type SiteBlueprint } from "./index";

const LANGS = ["ar", "en", "he"] as const;

/**
 * Each site's file, as it was built before the sites were made of modules (#177's builder), in ar/en/he
 * with calm then rich motion. The modules must build exactly the same files: change a line here only
 * when a site's output changes on purpose, and say why in the change.
 */
const BUILT: Record<string, string[]> = {
  "site-restaurant": ["1ede22fe85b15845", "e2a114b831a7fa12", "1b990730cef4a895", "be14fa2d0d0738e7", "9f2be1905f17c95d", "eecad930ce0958ff"],
  "site-bakery-cafe": ["c3120d297911d570", "7119396c11f84213", "21f6ad887da897d0", "13e558d607bdd752", "0457a4bbf027c675", "c6863083998a8a1b"],
  "site-dental-clinic": ["43fa9ecfe27366fd", "f302a29669e4de89", "a3ebd320cfffe40d", "8f1d4a677f45c5ff", "298881c231f8116b", "eb4407620c7d2f52"],
  "site-beauty-salon": ["dc5249a39ae44fc5", "21d60141d2c1988c", "4b833c4646496f57", "0a99826f1f885efc", "84e4ce37a858261d", "8a25c35f5191b4af"],
  "site-gym": ["0ac4f24cd596e074", "d5a174131758c6dd", "3a15fd64c89f1bb8", "5a0c319bdda4377b", "3624f3eb996955c4", "57d321a2e1667df6"],
  "site-academy": ["44d31d3946649343", "f68f1043206b1dc9", "00cd111400d28334", "75254ea460024ccb", "a410b02cb614a8cb", "02b589b426ef6f8e"],
  "site-real-estate": ["60842adce4f57909", "3a56e6466e99f62d", "e7c7e378b5f8cec0", "489476523a629349", "4082c319b44f0be3", "c07f7be2b0102275"],
  "site-guest-house": ["6d42e3f6c52c2fcf", "ba1ceb5955645c9b", "883d082940fd9271", "1e71fb512bd41b69", "8faeeaa0c1828d45", "c82c5651e977e227"],
  "site-events-hall": ["59d12c69da2fc3e1", "db708b39e5ae1b6a", "eb389bf7e54d9877", "78da5c268270953c", "256d74e31884a341", "cee910943cb94e52"],
  "site-photographer": ["352c6db37caa685b", "bfe2948f088d0f3f", "040d2ac6bd460e63", "e2b3c28f07012adc", "ee9846a1f7f7c62e", "126363f588f9d957"],
  "site-law-office": ["ff5dd73b93c46eb0", "7fb7a5dbba140fa9", "7de9192bb071bc79", "81dce3a081843396", "e3a9747fbf9f5b1c", "d7a77a6d1b4298e9"],
  "site-creative-agency": ["89f0ebdd97a0468d", "7ac1b8a144e24cfb", "e794dee8e4140053", "a5cc30ecce895306", "57119028757aac0a", "92e0eb7e78ede220"],
};

const print = (bp: SiteBlueprint, lang: (typeof LANGS)[number], motion: "calm" | "rich") => createHash("sha256").update(JSON.stringify(buildSite(bp, { lang, motion }))).digest("hex").slice(0, 16);

describe("The twelve sites as blueprints", () => {
  test("build exactly the files they built before they were made of modules", () => {
    expect(SITES.map((s) => s.key)).toEqual(Object.keys(BUILT));
    for (const s of SITES) expect(LANGS.flatMap((lang) => [print(s, lang, "calm"), print(s, lang, "rich")]), s.key).toEqual(BUILT[s.key]);
  });

  test("every one is a blueprint with nothing wrong, of the front archetype, using known modules", () => {
    const known = new Set(MODULES.map((m) => m.key));
    for (const s of SITES) {
      expect(s.format).toBe("estabrek.site");
      expect(s.formatVersion).toBe(2);
      expect(blueprintProblems(s), s.key).toEqual([]);
      expect(s.archetype).toBe("front");
      for (const key of Object.keys(s.modules)) expect(known.has(key as never), `${s.key} ${key}`).toBe(true);
    }
  });

  test("what the gallery says it holds is what it builds", () => {
    for (const s of SITES) {
      const f = buildSite(s, { lang: "en" });
      const c = siteCounts(s);
      expect(c.pages, s.key).toBe(f.pages.length);
      expect(c.tables, s.key).toBe(f.tables.length);
      expect(c.rows, s.key).toBe(f.tables.reduce((n, t) => n + (t.rows?.length ?? 0), 0));
      expect(Object.values(slugsOf(s))).toEqual(f.pages.map((p) => p.slug));
      expect(pagesOf(s).map((p) => p.key)[0]).toBe("home");
    }
  });
});

describe("The modules", () => {
  test("each named and told in three languages, once; the thirteen archetypes too", () => {
    expect(new Set(MODULES.map((m) => m.key)).size).toBe(MODULES.length);
    for (const m of [...MODULES, ...Object.values(ARCHETYPES)]) for (const lang of LANGS) expect(m.name[lang].trim() && m.note[lang].trim(), `${"key" in m ? m.key : m.name.en} ${lang}`).toBeTruthy();
    expect(Object.keys(ARCHETYPES)).toHaveLength(13);
  });

  test("a site leaves out what it doesn't use: no page, no table, no section, no link to it", () => {
    const r = SITES[0];
    const { team, news, booking, branches, ...rest } = r.modules;
    expect(team && news && booking && branches).toBeTruthy();
    const lean: SiteBlueprint = { ...r, key: "site-lean", modules: rest };
    expect(blueprintProblems(lean)).toEqual([]);
    expect(modulesOf(lean).map((m) => m.key)).toEqual(["offers", "story", "reviews", "questions", "contact", "notify"]);
    for (const lang of LANGS) {
      const f = buildSite(lean, { lang });
      expect(f.pages.map((p) => p.key)).toEqual(["home", "offers", "story", "questions", "contact"]);
      expect(f.tables.map((t) => t.key)).toEqual(["offers", "reviews", "questions", "messages"]);
      // Only the messages tell the owner now.
      expect(f.functions.map((fn) => fn.triggers.map((t) => t.config.table))).toEqual([["@table:messages"]]);
      const text = JSON.stringify(f);
      for (const gone of ['"@table:team"', '"@table:posts"', '"@table:branches"', '"/book"', '"/news"']) expect(text, gone).not.toContain(gone);
      // Every button and link still goes to one of the site's own pages.
      const pages = new Set(f.pages.map((p) => p.slug));
      for (const m of text.matchAll(/"href":"(\/[^"#]*)"/g)) expect(pages.has(m[1]), m[1]).toBe(true);
    }
  });

  test("what can't be built is said, in words", () => {
    const r = SITES[0];
    const say = (change: Partial<SiteBlueprint>) => blueprintProblems({ ...r, ...change });
    expect(say({ key: "restaurant" })[0]).toContain('isn\'t site-');
    expect(say({ version: "1.0" })[0]).toContain("three numbers");
    expect(say({ archetype: "social" })).toEqual(['The "social" archetype has no home yet']);
    expect(say({ modules: { ...r.modules, chat: {} } as never })).toEqual(['No module "chat"']);
    const { offers, ...noList } = r.modules;
    expect(offers).toBeTruthy();
    // The restaurant's booking has options of its own, so it needs no main list; without them it does.
    expect(say({ modules: noList })).toEqual([]);
    expect(say({ modules: { ...noList, booking: { ...r.modules.booking!, options: undefined } } })).toEqual(['"booking" needs "offers"']);
    const { contact, booking, ...quiet } = r.modules;
    expect(contact && booking).toBeTruthy();
    expect(say({ modules: quiet })[0]).toContain('"notify" needs a module visitors write through');
    expect(say({ home: "/news" })).toEqual(['Two pages at "/news"']);
    expect(say({ home: "/Restaurant" })).toEqual(['The page address "/Restaurant" isn\'t /small-words']);
    expect(() => buildSite({ ...r, archetype: "social" }, { lang: "ar" })).toThrow("no home yet");
  });
});

describe("The install wizard's choices (choices.ts)", () => {
  test("nothing chosen: the gallery's own file, without choices in it", () => {
    for (const s of SITES) {
      const f = buildChosen(s, null, "ar");
      expect(createHash("sha256").update(JSON.stringify(f)).digest("hex").slice(0, 16), s.key).toBe(BUILT[s.key][0]);
      expect("site" in f).toBe(false);
      expect(withChoices(s, {})).toEqual(s);
    }
  });

  test("the owner's details take the sample's place on every page, and the sample's own branch takes the number", () => {
    const r = siteByKey("site-restaurant")!;
    const c = { biz: { name: { ar: "أبو سمير", en: "Abu Samir", he: "אבו סמיר" }, phone: "050-123-4567", email: "hi@abusamir.example", city: "Akko", address: { ar: "شارع السوق 3، عكا", en: "3 Market St, Akko", he: "רחוב השוק 3, עכו" } } };
    const f = buildChosen(r, c, "ar");
    expect(f.site).toEqual(c);
    const text = JSON.stringify(f);
    for (const gone of [r.biz.name.ar, r.biz.name.en, r.biz.email, r.biz.address.ar]) expect(text, gone).not.toContain(gone);
    for (const there of ["أبو سمير", "Abu Samir", "hi@abusamir.example", "شارع السوق 3، عكا", "tel:0501234567", '"query":"Akko"']) expect(text, there).toContain(there);
    // The branches table: the one that was the sample business has the owner's number; the others keep theirs.
    const branches = f.tables.find((t) => t.key === "branches")!.rows!.map((row) => row.data.phone);
    expect(branches[0]).toBe("050-123-4567");
    expect(branches.slice(1)).toEqual(r.modules.branches!.rows.slice(1).map((row) => row.phone));
    // A word left empty keeps the sample's in that language.
    expect(withChoices(r, { biz: { name: { ar: "أبو سمير", en: "", he: "" } } }).biz.name).toEqual({ ar: "أبو سمير", en: r.biz.name.en, he: r.biz.name.he });
  });

  test("a module that needs one the owner took out goes with it; «tell me» goes when nobody can write", () => {
    const clinic = siteByKey("site-dental-clinic")!;
    const all = modulesOf(clinic).map((m) => m.key);
    expect(keepModules(clinic, all.filter((k) => k !== "offers"))).toEqual({ kept: all.filter((k) => k !== "offers" && k !== "booking"), dropped: ["booking"] });
    expect(keepModules(clinic, all.filter((k) => k !== "contact" && k !== "booking")).dropped).toEqual(["notify"]);
    // Every site, without any one of its modules: it builds, with no link to a page it doesn't have.
    for (const s of SITES)
      for (const m of modulesOf(s)) {
        const kept = keepModules(s, modulesOf(s).map((x) => x.key).filter((k) => k !== m.key)).kept;
        const chosen = withChoices(s, { modules: kept });
        expect(blueprintProblems(chosen), `${s.key} without ${m.key}`).toEqual([]);
        const f = buildChosen(s, { modules: kept }, "en");
        const pages = new Set(f.pages.map((p) => p.slug));
        for (const hit of JSON.stringify(f.pages).matchAll(/"href":"(\/[^"#]*)"/g)) expect(pages.has(hit[1]), `${s.key} without ${m.key}: ${hit[1]}`).toBe(true);
      }
  });

  test("its home's six compositions, named in three languages; the look and motion it picks build", () => {
    expect(FRONT_LOOKS).toHaveLength(6);
    for (const l of FRONT_LOOKS) for (const lang of LANGS) expect(l.name[lang] && l.note[lang]).toBeTruthy();
    const r = SITES[0];
    const homes = new Set(FRONT_LOOKS.map((_, k) => JSON.stringify(buildChosen(r, { look: k }, "en").pages[0].tree)));
    expect(homes.size).toBe(6);
    expect(JSON.stringify(buildChosen(r, { motion: "rich" }, "en"))).not.toBe(JSON.stringify(buildChosen(r, null, "en")));
  });
});
