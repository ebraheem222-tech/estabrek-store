// Site blueprints (wave 0 of docs/sites-300-plan.ar.md): a site is a business, an archetype and the
// modules it uses; compile.ts builds it into the feature template the store installs. The backend reads
// the same files (siteTemplates.unit.spec.ts, sites.spec.ts) and installs them for real.
import { describe, expect, test } from "vitest";
import { createHash } from "node:crypto";
import { ARCHETYPES, FRONT_LOOKS, MODULES, SITES, blueprintProblems, buildChosen, buildSite, keepModules, modulesOf, pagesOf, panelOf, settingsOf, siteByKey, siteCounts, slugsOf, withChoices, type SiteBlueprint } from "./index";

const LANGS = ["ar", "en", "he"] as const;

/**
 * Each site's file, in ar/en/he with calm then rich motion. Until 1.0.0 these were the files #177's builder
 * made before the sites were made of modules, and the modules built exactly the same. Change a line here
 * only when a site's output changes on purpose, and say why in the change:
 *   1.1.0 (wave 1): the sites' settings (the hours, the notice bar over the first page, showing prices,
 *   online booking open or closed, the bell and an email), read by their pages and their function.
 *   1.2.0 (wave 1.2): the sites' panels (today's numbers, queues and quick actions; their lists; their settings).
 *   1.3.0 (wave 1.3): their bookings' calendar and board, a customer's page, charts and reports, the branches' map.
 */
const BUILT: Record<string, string[]> = {
  "site-restaurant": ["88d649b47d4e4d32", "eb90430e347c9b4a", "db40072aa7f6233a", "0b4c23ad9fc9b390", "31f84c7e8a0c123e", "5e987cb80e089cf6"],
  "site-bakery-cafe": ["e42355ec9e8583e5", "d7d3d17b8b1d2ba9", "583f3674ec5d94ba", "c6123fa1483d53ee", "005df78e83cdc4e1", "90a3254aca5a6115"],
  "site-dental-clinic": ["68de3d12904b4bf0", "c7fcdf8cc26e29fa", "106cff0b9156d7bd", "9b390f2a60cc27a4", "1705a14d29014e31", "f91ca00e11a9260e"],
  "site-beauty-salon": ["8efb6b490a17a0b3", "1ddd94f0c5105972", "addac2db9cf5bf29", "9b663a7180d15e8d", "f66504346eae5484", "e47a4503d92a9f0e"],
  "site-gym": ["7b5d502eed6dd1d6", "ef1b153c861796de", "71c42519a9b68201", "77e09922a1e0dde0", "dbde6f6c4553bcb3", "cc29cc11411c0953"],
  "site-academy": ["0566e46fc4fade86", "ed688ae155877c0b", "eea90f4fd0b4d59c", "1bb3557e128231d5", "f650c88c468a8f0a", "14b7167b9c7899ca"],
  "site-real-estate": ["9ad20c9b1475dabc", "c05f9b8ac321d76c", "b9c42bc0026e738c", "25a887d268e3cf4b", "5baa70c467a23782", "eb6c21be879aac1e"],
  "site-guest-house": ["b03d0ba3d2f19139", "ccd00d638b3362f6", "f8e660406181c970", "96b5c7632cea9184", "0da7cc3bbaf4e1b7", "571253cf1a2bdb73"],
  "site-events-hall": ["845c64542522ae5b", "0e2e8b0d16bc1fc0", "45c1ea65a9a9eeca", "962c23542ecabb9f", "3eff321a46ebb7d8", "58ef89547beb0ca9"],
  "site-photographer": ["fe9bbb429db02ade", "b334ecfd451e4074", "2f4dc4be70255e87", "7ec2e79838d70375", "4a59d87bf2cf4c0f", "33e2b6b85e22d7c2"],
  "site-law-office": ["934cce069a07b2f9", "80945bb343c4c259", "202d00ca4f92c98c", "3c2358d71dbdf7ee", "0ac39da7dd433f91", "f171bd02092cc104"],
  "site-creative-agency": ["b2d6f0303bb9aadd", "22a2abc51b6e597d", "e412687b60f93ad0", "7e6eb86448a5513a", "50c7ae74f75f3d89", "05e0dbe3330fb361"],
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

describe("A site's settings (wave 1)", () => {
  /** Every element's marks in a file: the settings its pages and its rows' pages read. */
  const marks = (f: ReturnType<typeof buildSite>) => {
    const out: Array<{ prop: "showIf" | "fromSetting"; key: string; is?: unknown }> = [];
    const walk = (n: { props?: Record<string, unknown>; children?: unknown[] }) => {
      const show = n.props?.showIf as { setting: string; is?: unknown } | undefined;
      if (show) out.push({ prop: "showIf", key: show.setting, is: show.is });
      for (const key of Object.values((n.props?.fromSetting ?? {}) as Record<string, string>)) out.push({ prop: "fromSetting", key });
      for (const c of n.children ?? []) walk(c as never);
    };
    for (const p of f.pages) walk(p.tree.root);
    for (const t of f.tables) if (t.itemPage) walk(t.itemPage.root);
    return out;
  };

  test("every site declares its own, each named in three languages with a default that fits", () => {
    for (const s of SITES) {
      const list = settingsOf(s);
      const keys = list.map((x) => x.key);
      expect(new Set(keys).size, s.key).toBe(keys.length);
      // The front's own, then each module's that the site uses.
      expect(keys.slice(0, 3)).toEqual(["hours", "noticeOn", "notice"]);
      expect(keys.includes("showPrices"), s.key).toBe(!!s.modules.offers?.price);
      expect(keys.includes("bookingOpen") && keys.includes("bookingClosed"), s.key).toBe(!!s.modules.booking);
      expect(keys.includes("notifyOn") && keys.includes("notifyEmail"), s.key).toBe(!!s.modules.notify);
      for (const x of list) {
        for (const lang of LANGS) expect(x.label[lang].trim() && x.group?.[lang].trim(), `${s.key} ${x.key} ${lang}`).toBeTruthy();
        const d = x.default;
        if (x.kind === "toggle") expect(typeof d).toBe("boolean");
        if (x.kind === "words") for (const lang of LANGS) expect((d as Record<string, string>)[lang].trim(), `${x.key} ${lang}`).toBeTruthy();
        if (x.kind === "text") expect(typeof d).toBe("string");
      }
      // The hours start as the business's own.
      expect(list[0].default).toEqual(s.biz.hours);
      expect(buildSite(s, { lang: "en" }).settings).toEqual(list);
    }
  });

  test("a page reads only settings the site declares, and only public ones (the shop never gets the others)", () => {
    for (const s of SITES)
      for (const lang of LANGS) {
        const f = buildSite(s, { lang });
        const byKey = new Map((f.settings ?? []).map((x) => [x.key, x]));
        const read = marks(f);
        for (const m of read) {
          expect(byKey.has(m.key), `${s.key} ${m.prop} ${m.key}`).toBe(true);
          expect(byKey.get(m.key)!.public, `${s.key} ${m.key} isn't public`).toBe(true);
          if (m.prop === "showIf") expect(byKey.get(m.key)!.kind, m.key).toBe("toggle");
        }
        // The notice bar opens the first page, hidden until switched on, in the words its owner writes.
        const top = f.pages[0].tree.root.children![0];
        expect(top.props.showIf).toEqual({ setting: "noticeOn" });
        expect(JSON.stringify(top)).toContain('"fromSetting":{"text":"notice"}');
        // The hours, wherever the pages give them.
        expect(read.filter((m) => m.key === "hours").length, `${s.key} hours`).toBeGreaterThan(0);
        // The prices go with their switch, in the lists and on each row's own page.
        if (s.modules.offers?.price) expect(read.filter((m) => m.key === "showPrices").length, s.key).toBeGreaterThanOrEqual(2);
        // The booking form while it is open, the owner's words and a call while it is closed.
        if (s.modules.booking) {
          expect(read.filter((m) => m.key === "bookingOpen").map((m) => m.is ?? true).sort()).toEqual([false, true]);
          expect(read.some((m) => m.key === "bookingClosed")).toBe(true);
        }
      }
  });

  test("the bell reads its switch and the address to email, names its site declares", () => {
    for (const s of SITES) {
      const f = buildSite(s, { lang: "ar" });
      const keys = new Set((f.settings ?? []).map((x) => x.key));
      for (const fn of f.functions) for (const hit of JSON.stringify(fn.def).matchAll(/\{\{settings\.([A-Za-z0-9]+)\}\}/g)) expect(keys.has(hit[1]), `${s.key} ${fn.key} ${hit[1]}`).toBe(true);
      const bell = f.functions.find((fn) => fn.key === "notify")!;
      expect(bell.def.if).toEqual([{ left: "{{settings.notifyOn}}", cmp: "eq", right: true }]);
      expect(JSON.stringify(bell.def.do)).toContain('"act":"email","to":"{{settings.notifyEmail}}"');
    }
  });

  test("as the owner chose the site: the hours they wrote are the setting's start, a module left out takes its settings", () => {
    const clinic = siteByKey("site-dental-clinic")!;
    const hours = { ar: "كل يوم ٩–٥", en: "Daily 9–5", he: "כל יום 9–5" };
    const f = buildChosen(clinic, { biz: { hours } }, "ar");
    expect(f.settings![0]).toMatchObject({ key: "hours", default: hours });
    const all = modulesOf(clinic).map((m) => m.key);
    const lean = buildChosen(clinic, { modules: all.filter((k) => k !== "booking" && k !== "notify") }, "ar");
    expect(lean.settings!.map((x) => x.key)).toEqual(["hours", "noticeOn", "notice", "showPrices"]);
    expect(marks(lean).some((m) => m.key.startsWith("booking"))).toBe(false);
  });
});

describe("A site's panel (wave 1.2)", () => {
  test("today, its lists and its settings: every part reads the site's own tables and fields, and names its own settings", () => {
    for (const s of SITES) {
      const f = buildSite(s, { lang: "en" });
      const panel = panelOf(s);
      expect(f.panel).toEqual(panel);
      expect(panel.map((p) => p.key), s.key).toEqual(s.modules.booking ? ["today", "board", "people", "reports", "lists", "settings"] : ["today", "people", "reports", "lists", "settings"]);
      for (const p of panel) for (const lang of LANGS) expect(p.name[lang].trim()).toBeTruthy();
      const tables = new Map(f.tables.map((t) => [`@table:${t.key}`, new Set(t.fields.map((x) => x.id))]));
      const keys = new Set((f.settings ?? []).map((x) => x.key));
      for (const page of panel)
        for (const part of page.parts) {
          const reads = part.kind === "numbers" ? part.items.map((i) => ({ table: i.table, fields: (i.where ?? []).map((c) => c.field) })) : part.kind === "queue" ? [{ table: part.table, fields: [...part.show, ...part.where.map((c) => c.field), ...part.decisions.flatMap((d) => Object.keys(d.set))] }] : part.kind === "view" ? [{ table: part.table, fields: part.columns }] : [];
          for (const r of reads) {
            expect(tables.has(r.table), `${s.key} ${part.key} ${r.table}`).toBe(true);
            for (const field of r.fields.filter((x) => !x.startsWith("$"))) expect(tables.get(r.table)!.has(field), `${s.key} ${part.key} ${field}`).toBe(true);
          }
          if (part.kind === "settings") expect(part.keys).toEqual([...keys]);
          if (part.kind === "actions") for (const a of part.items) expect(keys.has(a.setting), `${s.key} ${a.key}`).toBe(true);
          if (part.kind === "queue") for (const d of part.decisions) for (const [field, value] of Object.entries(d.set)) {
            // A queue's button sets a choice to one of its options.
            const t = f.tables.find((x) => `@table:${x.key}` === part.table)!;
            const options = (t.fields.find((x) => x.id === field)?.options as Array<{ id: string }> | undefined)?.map((o) => o.id);
            expect(options, `${s.key} ${d.key}`).toContain(value);
          }
        }
      // Today: the numbers first, the quick actions last.
      const today = panel[0].parts;
      expect(today[0].kind).toBe("numbers");
      expect(today[today.length - 1].kind).toBe("actions");
    }
  });

  test("a module left out takes its numbers, queues, tables and actions with it", () => {
    const clinic = siteByKey("site-dental-clinic")!;
    const lean = withChoices(clinic, { modules: modulesOf(clinic).map((m) => m.key).filter((k) => k !== "booking") });
    const text = JSON.stringify(panelOf(lean));
    expect(text).not.toContain("@table:bookings");
    expect(text).not.toContain('"setting":"bookingOpen"');
    expect(text).toContain('"key":"messages"');
  });
});
