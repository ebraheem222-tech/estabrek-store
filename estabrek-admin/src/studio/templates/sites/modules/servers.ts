/**
 * A network's or a community's own servers («السيرفرات», wave G7b of docs/sites-300-plan.ar.md): a Minecraft network's
 * games behind its proxy (bedwars, skywars…), a CS2 community's servers (retake, surf, deathmatch). A table its owner
 * edits: each server's key, its words, its game and, where players reach it directly, its address. The backend
 * (lib/gameSites.ts) asks each one with an address every minute with the main one; one with none is known by the
 * server's link, which says hello by the same name (server=bedwars in its server.properties). «السيرفرات» has them
 * big, the home page has them under the status, and the panel's status card lists them.
 */
import { EL, SEC, STACK, say, withSkin, type Ctx } from "../../build";
import { w } from "../../words";
import { SERVER, SUBS_W } from "../siteWords";
import { T, f, head, pageHead, type Built, type Part, type SiteModule } from "./kit";

const list = (k: Ctx, size: "big" | "small", columns: number) => EL(k, "serverList", { join: say(k, SUBS_W.join), copy: say(k, SERVER.copy), empty: say(k, SUBS_W.empty), columns, size }, { style: { self: "stretch" } });
const columnsOf = (b: Built) => Math.min(3, Math.max(1, b.use.servers!.list.length));

/** On the home page, under the status: each server now. */
export const serversBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [head(k, b.use.servers!.title, SUBS_W.bandSub), STACK(k, [list(k, "small", columnsOf(b))], { width: "100%" })], { name: b.use.servers!.title });
};
const serversPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [STACK(k, [list(k, "big", Math.min(2, columnsOf(b)))], { width: "100%" })], { name: SUBS_W.all });
};

const GAMES: Array<[string, ReturnType<typeof w>]> = [
  ["fivem", w("FiveM (GTA V)", "FiveM (GTA V)", "FiveM (GTA V)")],
  ["minecraft", w("ماينكرافت Java", "Minecraft Java", "Minecraft Java")],
  ["bedrock", w("ماينكرافت Bedrock", "Minecraft Bedrock", "Minecraft Bedrock")],
  ["steam", w("لعبة على Steam", "A Steam game", "משחק ב־Steam")],
];
const plain = (v: string) => ({ ar: v, en: v, he: v });

export const SERVERS: SiteModule = {
  key: "servers",
  name: SUBS_W.name,
  note: SUBS_W.note,
  needs: () => ["status"],
  pages: (bp) => [{ key: "servers", slug: "/servers", order: 12, name: bp.modules.servers!.title, seo: bp.modules.servers!.sub, parts: (b) => [pageHead(b.use.servers!.title, b.use.servers!.sub, "soft"), serversPart(b)] }],
  tables: (b) => [
    {
      key: "servers",
      slug: "servers",
      name: SUBS_W.name,
      fields: [
        f.text("title", SUBS_W.title, { required: true }),
        { ...f.text("key", SUBS_W.key, { required: true, unique: true, max: 30 }), help: SUBS_W.keyHelp },
        f.long("line", SUBS_W.line),
        f.select("game", SUBS_W.game, GAMES, { default: b.bp.modules.status!.game }),
        { ...f.text("address", SUBS_W.address, { max: 120 }), help: SUBS_W.addressHelp },
        f.text("hint", SUBS_W.hint, { max: 60 }),
      ],
      // The site's pages read them on the server, with each one's status (lib/gameSites.ts); nothing through the API.
      api: { read: "off", create: "off", update: "off", delete: "off" },
      rows: b.use.servers!.list.map((x) => ({
        slug: x.key,
        data: { title: x.title, key: plain(x.key), line: x.line, game: x.game ?? b.bp.modules.status!.game, address: plain(x.address), ...(x.hint ? { hint: x.hint } : {}) },
      })),
    },
  ],
  counts: (bp) => ({ tables: 1, rows: bp.modules.servers!.list.length }),
  panel: () => ({ lists: [{ kind: "view", key: "serversAll", title: SUBS_W.name, table: T("servers"), columns: ["title", "key", "game", "address", "$status"] }] }),
};
