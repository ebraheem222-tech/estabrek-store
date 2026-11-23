/**
 * A game server's streamers («الستريمرز», wave G6b of docs/sites-300-plan.ar.md): the people who stream its server, a
 * table its owner edits (a name, their Twitch channel, a picture, a line about them). Who is live now comes from
 * Twitch with the owner's own app keys (the site's settings; they stay on the server, lib/twitch.ts): the live first,
 * with their stream. Without keys, the page lists them with their channels. Its page, a band on the home page, and a
 * part on the panel saying whether Twitch answers and who is live.
 */
import { EL, SEC, STACK, say, withSkin, type Ctx } from "../../build";
import { STREAM_W } from "../siteWords";
import { T, f, head, pageHead, type Built, type Part, type SiteModule } from "./kit";

const list = (k: Ctx) => EL(k, "streamers", { live: say(k, STREAM_W.live), watch: say(k, STREAM_W.watch), channel: say(k, STREAM_W.channel), empty: say(k, STREAM_W.empty), columns: 3 }, { style: { self: "stretch" } });

/** On the home page: the streamers, the live first. */
export const streamersBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [head(k, b.use.streamers!.title, STREAM_W.bandSub), STACK(k, [list(k)], { width: "100%" })], { name: b.use.streamers!.title });
};
const streamersPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [STACK(k, [list(k)], { width: "100%" })], { name: b.use.streamers!.title });
};

export const STREAMERS: SiteModule = {
  key: "streamers",
  name: STREAM_W.name,
  note: STREAM_W.note,
  pages: (bp) => [{ key: "streamers", slug: "/streamers", order: 32, name: bp.modules.streamers!.title, seo: bp.modules.streamers!.sub, parts: (b) => [pageHead(b.use.streamers!.title, b.use.streamers!.sub, "soft"), streamersPart(b)] }],
  tables: (b) => [
    {
      key: "streamers",
      slug: "streamers",
      name: STREAM_W.name,
      fields: [f.text("name", STREAM_W.who, { required: true }), { ...f.text("twitch", STREAM_W.twitch), help: STREAM_W.twitchHelp }, f.image("picture", STREAM_W.picture), f.long("about", STREAM_W.about)],
      // Anyone reads them: they are on the site's pages.
      api: { read: "public", create: "off", update: "off", delete: "off" },
      rows: b.use.streamers!.rows.map((r) => ({ slug: r.slug, data: { name: r.name, twitch: { ar: r.twitch, en: r.twitch, he: r.twitch }, about: r.about } })),
    },
  ],
  counts: (bp) => ({ tables: 1, rows: bp.modules.streamers!.rows.length }),
  // Read by the server alone (the shop learns only who is live).
  settings: () => [
    { key: "twitchClientId", kind: "text", label: STREAM_W.clientId, note: STREAM_W.keysNote, group: STREAM_W.name, default: "" },
    { key: "twitchSecret", kind: "text", label: STREAM_W.secret, group: STREAM_W.name, default: "" },
  ],
  panel: () => ({
    today: [{ kind: "streamers", key: "streamers", title: STREAM_W.panel }],
    lists: [{ kind: "view", key: "streamersAll", title: STREAM_W.name, table: T("streamers"), columns: ["name", "twitch", "$status"] }],
  }),
};
