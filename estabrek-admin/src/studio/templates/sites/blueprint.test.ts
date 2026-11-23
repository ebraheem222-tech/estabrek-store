// Site blueprints (wave 0 of docs/sites-300-plan.ar.md): a site is a business, an archetype and the
// modules it uses; compile.ts builds it into the feature template the store installs. The backend reads
// the same files (siteTemplates.unit.spec.ts, sites.spec.ts) and installs them for real.
import { describe, expect, test } from "vitest";
import { createHash } from "node:crypto";
import { shellOf } from "./shell";
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
 *   site-fivem-rp 1.1.0 (wave G3): its rules, and applying for its jobs (a page and a form each, the staff's votes).
 *   site-fivem-rp 1.2.0 (wave G3): its appeals (one for each ban) and reports on a player; its tables' fields named
 *   about the player, as the staff read them (its forms still speak to the player).
 *   site-fivem-rp 1.3.0 (wave G4): its packages from its owner's Tebex webstore, and the webstore on its panel.
 *   site-minecraft-survival 1.0.0 (wave G4): the first Minecraft server, with its own store behind the advantage gate.
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
  "site-fivem-rp": ["c4819073c5315e50", "3f37e33dc5030b03", "9327f4472f72a535", "7087d5060fcf2c2c", "e83d45205686d990", "36fc0595c979bfd7"],
  "site-minecraft-survival": ["fe50d3a564011062", "f54c0ed2e993777c", "e3c3aa6d3ee37f6d", "79bc55692f433695", "429ceb228edc986e", "fec1429ecc09e269"],
};

const print = (bp: SiteBlueprint, lang: (typeof LANGS)[number], motion: "calm" | "rich") => createHash("sha256").update(JSON.stringify(buildSite(bp, { lang, motion }))).digest("hex").slice(0, 16);

describe("The twelve sites as blueprints", () => {
  test("build exactly the files they built before they were made of modules", () => {
    expect(SITES.map((s) => s.key)).toEqual(Object.keys(BUILT));
    for (const s of SITES) expect(LANGS.flatMap((lang) => [print(s, lang, "calm"), print(s, lang, "rich")]), s.key).toEqual(BUILT[s.key]);
  });

  test("every one is a blueprint with nothing wrong, of the front or the server archetype, using known modules", () => {
    const known = new Set(MODULES.map((m) => m.key));
    for (const s of SITES) {
      expect(s.format).toBe("estabrek.site");
      expect(s.formatVersion).toBe(2);
      expect(blueprintProblems(s), s.key).toEqual([]);
      expect(["front", "server"]).toContain(s.archetype);
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
    expect(Object.keys(ARCHETYPES)).toHaveLength(14);
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
      // The archetype's own, then each module's that the site uses.
      expect(keys.slice(0, s.archetype === "server" ? 2 : 3)).toEqual(s.archetype === "server" ? ["noticeOn", "notice"] : ["hours", "noticeOn", "notice"]);
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
      if (s.archetype === "front") expect(list[0].default).toEqual(s.biz.hours);
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
        // The hours, wherever the pages give them (a game server runs all the time: it has none).
        if (s.archetype === "front") expect(read.filter((m) => m.key === "hours").length, `${s.key} hours`).toBeGreaterThan(0);
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
      expect(panel.map((p) => p.key), s.key).toEqual(s.modules.booking || s.modules.apply || s.modules.mcstore ? ["today", "board", "people", "reports", "lists", "settings"] : ["today", "people", "reports", "lists", "settings"]);
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

describe("A game server's rules and applications (wave G3)", () => {
  const rp = () => siteByKey("site-fivem-rp")!;
  test("the rules in numbered sections from their table, and when they last changed, a setting the shop reads", () => {
    const f = buildSite(rp(), { lang: "ar" });
    const rules = f.tables.find((t) => t.key === "rules")!;
    expect(rules.rows!.map((r) => (r.data.number as { ar: string }).ar)).toEqual(["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "3.1", "3.2", "3.3"]);
    expect(rules.rows!.every((r) => r.data.changed === "2026-11-20")).toBe(true);
    const page = f.pages.find((p) => p.key === "rules")!;
    const text = JSON.stringify(page.tree);
    // One list for each section, by its key; the last change from the setting.
    for (const s of ["general", "roleplay", "crime"]) expect(text).toContain(`"value":"${s}"`);
    expect(text).toContain('"fromSetting":{"text":"rulesChanged"}');
    expect(f.settings!.find((x) => x.key === "rulesChanged")).toMatchObject({ kind: "words", public: true });
  });

  test("a page for each kind, out of the menu, its form writing the kind with what was typed and the rules agreed to", () => {
    const bp = rp();
    const f = buildSite(bp, { lang: "en" });
    const kinds = bp.modules.apply!.kinds.map((k) => k.key);
    expect(kinds).toEqual(["police", "ems", "mechanic", "staff"]);
    expect(pagesOf(bp).filter((p) => p.menu === false).map((p) => p.slug)).toEqual(kinds.map((k) => `/apply/${k}`));
    for (const k of bp.modules.apply!.kinds) {
      const page = f.pages.find((p) => p.slug === `/apply/${k.key}`)!;
      const form = JSON.stringify(page.tree).match(/"type":"form","props":(\{.*?"done":\{[^}]*\}\})/)?.[1];
      const props = JSON.parse(form!) as { fields: Array<{ name: string; kind: string; required?: boolean; hint?: { en: string } }>; send: unknown };
      expect(props.send).toEqual({ to: "table", table: "applications", set: { kind: k.key } });
      expect(props.fields.map((x) => x.name)).toEqual(["character", "age", "story", "why", "question", "rules"]);
      // Its own question, under the one every kind asks; the rules agreed to, or it isn't sent.
      expect(props.fields.find((x) => x.name === "question")!.hint!.en).toBe(k.question.en);
      expect(props.fields.find((x) => x.name === "rules")).toMatchObject({ kind: "check", required: true });
      // Only while applications are open; the owner's words otherwise.
      expect(JSON.stringify(page.tree)).toContain('"showIf":{"setting":"applyOpen"}');
    }
    // «My applications»: the player's own rows, read in their browser.
    expect(JSON.stringify(f.pages.find((p) => p.slug === "/apply")!.tree)).toContain('"feed":"added"');
  });

  test("a player adds an application and reads theirs, never its state, the staff's answer or notes; once a kind, again after the days", () => {
    const f = buildSite(rp(), { lang: "en" });
    const apps = f.tables.find((t) => t.key === "applications")!;
    expect(apps.api).toEqual({ read: "customer", create: "customer", update: "off", delete: "off", private: ["notes"], locked: ["status", "reply"] });
    expect(f.waits![0]).toEqual({ table: "@table:applications", same: ["kind"], days: 7, setting: "applyWaitDays", open: { field: "status", values: ["fresh", "review", "interview"] } });
    expect(f.settings!.find((x) => x.key === "applyWaitDays")).toMatchObject({ kind: "number", default: 7, min: 0 });
    // Each kind's Discord role, kept on the server (the functions read it).
    for (const k of ["rolePolice", "roleEms", "roleMechanic", "roleStaff"]) expect(f.settings!.find((x) => x.key === k)).toMatchObject({ kind: "text", default: "" });
    expect(f.settings!.find((x) => x.key === "rolePolice")!.public).toBeUndefined();
  });

  test("the staff vote in the queue, «accept» waits for the votes its owner sets; the board is the applications'", () => {
    const panel = panelOf(rp());
    const queue = panel[0].parts.find((p) => p.key === "applications")!;
    expect(queue).toMatchObject({ kind: "queue", votes: { need: "applyVotes" } });
    if (queue.kind !== "queue") throw new Error("a queue");
    expect(queue.show[0]).toBe("$by");
    expect(queue.decisions.map((d) => [d.key, !!d.afterVotes])).toEqual([["review", false], ["interview", false], ["accept", true], ["reject", false]]);
    expect(panel.find((p) => p.key === "board")!.name.ar).toBe("الطلبات");
    expect(settingsOf(rp()).find((s) => s.key === "applyVotes")).toMatchObject({ kind: "number", default: 2 });
  });

  test("its functions: a bell for each, the player told and whitelisted when decided, Discord once its owner picks the connection", () => {
    const f = buildSite(rp(), { lang: "ar" });
    const fn = (key: string) => f.functions.find((x) => x.key === key)!;
    expect(f.functions.map((x) => x.key)).toEqual(["applyNew", "applyDecided", "applyDiscord", "appealsBell", "appealDecided", "reportDecided", "notify"]);
    expect(fn("applyNew").triggers).toEqual([{ kind: "row", config: { table: "@table:applications", on: ["added"] } }]);
    const decided = JSON.stringify(fn("applyDecided").def);
    expect(decided).toContain('"who":"{{input.row.$owner}}"');
    expect(decided).toContain('"table":"@table:whitelist"');
    expect(decided).toContain("{{settings.applyWaitDays}}");
    const discord = JSON.stringify(fn("applyDiscord").def);
    // A ready connection is the store's own: picked when it is set up.
    expect(discord.match(/"act":"ready","via":""/g)?.length).toBe(5);
    expect(discord).toContain('"role":"{{settings.rolePolice}}"');
    // The bell for messages stays the messages'; applications have their own.
    expect(fn("notify").triggers.map((t) => t.config.table)).toEqual(["@table:messages"]);
  });
});

describe("A game server's appeals and reports (wave G3)", () => {
  const rp = () => siteByKey("site-fivem-rp")!;
  test("an appeal for each ban, a report with a clip and a private picture; theirs to add and read, never to decide", () => {
    const f = buildSite(rp(), { lang: "en" });
    const appeals = f.tables.find((t) => t.key === "appeals")!;
    const reports = f.tables.find((t) => t.key === "reports")!;
    // One appeal for each ban, whoever sends it, with the owner's words when it is taken.
    expect(appeals.fields.find((x) => x.id === "ban")).toMatchObject({ type: "text", required: true, unique: true, message: { en: "There is an appeal on this ban already: each ban has one." } });
    expect(reports.fields.find((x) => x.id === "clip")).toMatchObject({ type: "link" });
    expect(reports.fields.find((x) => x.id === "shot")).toMatchObject({ type: "file", upload: { maxMb: 8, kinds: ["image"], private: true } });
    expect((reports.fields.find((x) => x.id === "reason")!.options as Array<{ id: string }>).map((o) => o.id)).toEqual(["cheating", "rdm", "meta", "toxic", "other"]);
    for (const t of [appeals, reports]) expect(t.api).toEqual({ read: "customer", create: "customer", update: "off", delete: "off", private: ["notes"], locked: ["status", "reply"] });
    // A report on a player waits while the last one on them is being looked at.
    expect(f.waits).toContainEqual({ table: "@table:reports", same: ["who"], days: 0, open: { field: "status", values: ["fresh", "review"] } });
    // One page with both forms and what the player sent.
    const page = JSON.stringify(f.pages.find((p) => p.slug === "/appeal")!.tree);
    for (const t of ["appeals", "reports"]) expect(page).toContain(`"send":{"to":"table","table":"${t}"}`);
    expect(page.match(/"feed":"added"/g)?.length).toBe(2);
    expect(shellOf(rp()).header.map((l) => l.page)).toContain("appeal");
  });

  test("a queue for each in the panel, and the player told by email once decided", () => {
    const today = panelOf(rp())[0].parts;
    const queue = (key: string) => today.find((p) => p.key === key)!;
    expect(queue("appeals")).toMatchObject({ kind: "queue", where: [{ field: "status", op: "isNot", value: "lifted" }, { field: "status", op: "isNot", value: "kept" }] });
    expect(queue("reports")).toMatchObject({ kind: "queue", show: ["$by", "who", "reason", "when", "story", "clip", "shot", "status"] });
    const f = buildSite(rp(), { lang: "ar" });
    const fn = (key: string) => f.functions.find((x) => x.key === key)!;
    expect(fn("appealsBell").triggers.map((t) => t.config.table)).toEqual(["@table:appeals", "@table:reports"]);
    expect(JSON.stringify(fn("appealDecided").def)).toContain("{{input.row.ban}}");
    expect(JSON.stringify(fn("reportDecided").def)).toContain('"who":"{{input.row.$owner}}"');
  });
});

describe("A game server's packages from its Tebex webstore (wave G4)", () => {
  test("a page with the webstore's packages, its token kept on the server, the webstore on the panel's first page", () => {
    const rp = siteByKey("site-fivem-rp")!;
    const f = buildSite(rp, { lang: "ar" });
    const page = f.pages.find((p) => p.slug === "/packages")!;
    expect(JSON.stringify(page.tree)).toContain('"type":"tebexPackages"');
    expect(JSON.stringify(page.tree)).toContain('"columns":3');
    expect(JSON.stringify(page.tree)).toContain("اشتري عند Tebex");
    // The token is read by the server alone: never a setting the shop gets.
    const token = f.settings!.find((s) => s.key === "tebexToken")!;
    expect(token).toMatchObject({ kind: "text", default: "" });
    expect(token.public).toBeUndefined();
    expect(panelOf(rp)[0].parts.map((p) => p.kind)).toContain("tebex");
    expect(shellOf(rp).header.map((l) => l.page)).toContain("packages");
  });
});

describe("A Minecraft server's own store behind the advantage gate (wave G4)", () => {
  const mc = () => siteByKey("site-minecraft-survival")!;
  test("the store lists what gives no advantage, read in the browser, each «اشتري» asking for that row's payment", () => {
    const f = buildSite(mc(), { lang: "en" });
    const page = JSON.stringify(f.pages.find((p) => p.slug === "/store")!.tree);
    expect(page).toContain('"feed":"live"');
    expect(page).toContain('"where":[{"field":"advantage","op":"isFalse"}]');
    expect(page).toContain('"do":[{"act":"fn","fn":"buy-package","input":{"package":"{{row_id}}"},"as":"order"},{"act":"link","to":"order_link"}]');
    expect(page).toContain('"who":"customer","deny":"signin"');
    // Mojang's line where it sells and on its first page; never on a FiveM server's.
    const notice = "NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.";
    expect(page).toContain(notice);
    expect(JSON.stringify(f.pages.find((p) => p.key === "home")!.tree)).toContain(notice);
    expect(JSON.stringify(buildSite(siteByKey("site-fivem-rp")!, { lang: "en" }))).not.toContain(notice);
  });

  test("a package that gives an advantage is held back: never listed, never sold, shown to the owner with why", () => {
    const f = buildSite(mc(), { lang: "ar" });
    const packages = f.tables.find((t) => t.key === "packages")!;
    expect(packages.api).toEqual({ read: "public", create: "off", update: "off", delete: "off", private: ["command"] });
    expect(packages.fields.find((x) => x.id === "advantage")).toMatchObject({ type: "boolean", help: { en: expect.stringContaining("minecraft.net/usage-guidelines") } });
    expect(packages.rows!.filter((r) => r.data.advantage === true).map((r) => r.slug)).toEqual(["diamond-kit"]);
    expect(f.tables.find((t) => t.key === "purchases")!.api).toEqual({ read: "customer", create: "off", update: "off", delete: "off", private: ["note"] });
    const buy = f.functions.find((x) => x.key === "buyPackage")!;
    expect(buy.triggers).toEqual([{ kind: "call", config: { who: "customer", perMinute: 10 }, slug: "buy-package" }]);
    expect(JSON.stringify(buy.def)).toContain('"if":[{"left":"{{pkg.advantage}}","cmp":"eq","right":true}],"do":[{"act":"stop"');
    expect(f.functions.find((x) => x.key === "packagePaid")!.triggers).toEqual([{ kind: "event", config: { event: "payment.paid" } }]);
    const lists = panelOf(mc()).find((p) => p.key === "lists")!.parts;
    expect(lists.find((p) => p.key === "packagesHeld")).toMatchObject({ kind: "view", where: [{ field: "advantage", op: "is", value: true }] });
  });
});
