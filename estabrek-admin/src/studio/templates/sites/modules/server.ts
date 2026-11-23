/**
 * The "server" archetype (wave G1 of docs/sites-300-plan.ar.md): a game server's own site (FiveM, Minecraft, a Steam
 * game). A player wants to know at once whether it is up, how many play, how to get in and where the Discord is: its
 * home opens with the server's live status and «فوت هلّق», not a big picture and words. The status module brings the
 * settings the backend reads it by (lib/gameSites.ts: the game and the address), the Discord link, and its part on the
 * panel.
 *
 * A community's site (wave G7c) opens the same way with its own pulse: its Roblox game (everyone playing it now, the way
 * to play, its Roblox group) or its Discord server (who is on now and how many are in it).
 */
import { B, EL, GRID, H, P, SEC, STACK, eyebrow, pop, say, withSkin } from "../../build";
import { w } from "../../words";
import type { PanelBits, SiteBlueprint, SiteSetting } from "../blueprint";
import { SET, SERVER, STREAM_W } from "../siteWords";
import { noticePart } from "./front";
import { postsPart, questionsPart, teamPart } from "./lists";
import { fromSetting, shownIf, still, type Built, type Part, type SiteModule } from "./kit";
import { applyBand } from "./apply";
import { mcNoticePart, mcStoreBand } from "./mcstore";
import { wipeBand } from "./wipe";
import { streamersBand } from "./streamers";
import { serversBand } from "./servers";
import { codesBand } from "./codes";
import { eventsBand } from "./events";
import { rosterBand } from "./roster";
import { membersBand } from "./members";
import { lfgBand } from "./lfg";
import { clipsBand, scheduleBand, sponsorsBand } from "./streamer";

const when = (on: unknown, part: () => Part): Part[] => (on ? [part()] : []);

/** The opening: the server's name and line, its live status with the way in, and the Discord. */
const statusHero = (b: Built): Part => (c) => {
  // The theme's deepest band: dark on a light theme, a night under the page on a dark one (G6c's themes).
  const k = withSkin(c, "night");
  const s = b.use.status!;
  const discord = shownIf(fromSetting(B(k, SERVER.discord, "https://discord.com", "outline", still), { href: "discordUrl" }), "discordOn");
  // A Roblox game's group, beside the Discord, while its owner shows it.
  const group = s.game === "roblox" ? [shownIf(fromSetting(B(k, SERVER.group, "https://www.roblox.com/communities", "outline", still), { href: "robloxGroup" }), "robloxGroupOn")] : [];
  return SEC(k, [
    STACK(k, [
      eyebrow(k, b.bp.pack.eyebrow),
      H(k, b.bp.pack.title, 1),
      P(k, b.bp.pack.sub, { style: { size: 19, maxWidth: "640px" } }),
      EL(k, "gameStatus", { join: say(k, s.join), copy: say(k, SERVER.copy), chart: true, size: "big" }, { style: { self: "stretch", maxWidth: "720px" } }),
      STACK(k, [...group, discord], { direction: "row", gap: 12, wrap: true }),
    ], { gap: 20, align: "center", textAlign: "center" }),
  ], { name: SERVER.statusSection, pad: [104, 24, 96, 24] });
};

/** How to get in, in three steps. */
const joinSteps = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const steps = b.use.status!.steps;
  return SEC(k, [
    STACK(k, [H(k, SERVER.howJoin, 2)], { align: "center", textAlign: "center", margin: [0, 0, 32, 0] }),
    GRID(k, 3, steps.map(([title, line], i) => STACK(k, [
      P(k, w(String(i + 1), String(i + 1), String(i + 1)), { ...still, quiet: false, style: { size: 32, weight: 800, color: pop(k) } }),
      H(k, title, 4, still),
      P(k, line, still),
    ], { gap: 6 })), { gap: 32, phone: 1 }),
  ], { name: SERVER.howJoin });
};

/** The Discord, in a band of its own, while its owner shows it. */
const discordBand: Part = (c) => {
  const k = withSkin(c, "bold");
  const button = fromSetting(B(k, SERVER.discordJoin, "https://discord.com", "solid", still), { href: "discordUrl" });
  return shownIf(SEC(k, [STACK(k, [H(k, SERVER.discordTitle, 2), P(k, SERVER.discordLine, { style: { maxWidth: "560px" } }), STACK(k, [button], { direction: "row", justify: "center" })], { gap: 16, align: "center", textAlign: "center" })], { name: SERVER.discordTitle, pad: [80, 24, 80, 24] }), "discordOn");
};

/** A Roblox game's community site ends with its line: not Roblox's own, and nothing of the game sold here. */
const robloxNoticePart: Part = (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [P(k, SERVER.robloxNotice, { ...still, style: { size: 13, textAlign: "center", maxWidth: "720px" } })], { name: w("سطر Roblox", "Roblox's line", "השורה של Roblox"), pad: [24, 24, 32, 24] });
};

/**
 * A game server's home: the notice, its status and way in, its own servers (a network's), its codes (a Roblox game's), how to join, its events, its updates,
 * its roster (a clan's), a call to apply or to its store, its team, its members, questions, the Discord; a Minecraft server's ends with Mojang's line, a Roblox game's with Roblox's.
 */
export function serverHome(b: Built): Part[] {
  const u = b.use;
  const ends = [...(u.mcstore ? [mcNoticePart] : []), ...(u.status?.game === "roblox" ? [robloxNoticePart] : [])];
  return [noticePart, statusHero(b), ...when(u.lfg, () => lfgBand(b)), ...when(u.servers, () => serversBand(b)), ...when(u.wipe, () => wipeBand(b)), ...when(u.codes, () => codesBand(b)), ...when(u.schedule, () => scheduleBand(b)), joinSteps(b), ...when(u.events, () => eventsBand(b)), ...when(u.news, () => postsPart(b, "plain", 3, true)), ...when(u.roster, () => rosterBand(b)), ...when(u.clips, () => clipsBand(b)), ...when(u.apply, () => applyBand(b)), ...when(u.mcstore, () => mcStoreBand(b)), ...when(u.team, () => teamPart(b, "surface")), ...when(u.streamers, () => streamersBand(b)), ...when(u.members, () => membersBand(b)), ...when(u.sponsors, () => sponsorsBand(b)), ...when(u.questions, () => questionsPart(b, "plain", 4, true)), discordBand, ...ends];
}

/** A server's own settings: the notice over its first page ("restart at 20:00"). */
export const serverSettings = (): SiteSetting[] => [
  { key: "noticeOn", kind: "toggle", label: SET.noticeOn, note: SET.noticeOnNote, group: SET.site, public: true, default: false },
  { key: "notice", kind: "words", label: SET.notice, group: SET.site, public: true, long: true, default: SERVER.noticeText },
];
export const serverPanel = (): PanelBits => ({
  actions: [
    { key: "noticeShow", label: w("شغّل شريط الإعلان", "Show the notice bar", "להציג את פס ההודעה"), setting: "noticeOn", value: true },
    { key: "noticeHide", label: w("طفّي شريط الإعلان", "Hide the notice bar", "להסתיר את פס ההודעה"), setting: "noticeOn", value: false },
  ],
});

const STATUS_NAME = w("حالة السيرفر", "Server status", "מצב השרת");
export const STATUS: SiteModule = {
  key: "status",
  name: STATUS_NAME,
  // A game server's site is its status: never taken out.
  core: (bp) => bp.archetype === "server",
  note: w("حالة السيرفر الحيّة (شغّال، كم لاعب، آخر 24 ساعة)، «فوت هلّق»، والديسكورد.", "The server's live status (up, how many play, the last 24 hours), «join now» and the Discord.", "מצב השרת החי (פועל, כמה משחקים, 24 השעות האחרונות), «להתחבר עכשיו» והדיסקורד."),
  // The game and the address the backend reads the status by (they stay on the server); the Discord link the pages show.
  settings: (bp: SiteBlueprint) => {
    const s = bp.modules.status!;
    // A community (a Roblox game, a Discord server) may also be read as either, a streamer's as their Twitch channel too; a game server's choices stay its own.
    const community = s.game === "roblox" || s.game === "discord" || s.game === "twitch" ? [{ id: "roblox", name: w("لعبة على Roblox", "A Roblox game", "משחק ב־Roblox") }, { id: "discord", name: w("سيرفر ديسكورد (مجتمع)", "A Discord server (a community)", "שרת דיסקורד (קהילה)") }] : [];
    const streamer = s.game === "twitch";
    const choices = streamer ? [...community, { id: "twitch", name: w("قناة على Twitch (ستريمر)", "A Twitch channel (a streamer)", "ערוץ ב־Twitch (סטרימר)") }] : community;
    return [
      { key: "game", kind: "choice", label: SERVER.game, note: SERVER.gameNote, group: STATUS_NAME, default: s.game, options: [{ id: "fivem", name: w("FiveM (GTA V)", "FiveM (GTA V)", "FiveM (GTA V)") }, { id: "minecraft", name: w("ماينكرافت Java", "Minecraft Java", "Minecraft Java") }, { id: "bedrock", name: w("ماينكرافت Bedrock", "Minecraft Bedrock", "Minecraft Bedrock") }, { id: "steam", name: w("لعبة على Steam (Rust، CS2، GMod…)", "A Steam game (Rust, CS2, GMod…)", "משחק ב־Steam (Rust, CS2, GMod…)") }, ...choices] },
      { key: "serverAddress", kind: "text", label: SERVER.address, note: streamer ? SERVER.streamerAddressNote : community.length ? SERVER.communityAddressNote : SERVER.addressNote, group: STATUS_NAME, default: s.address },
      // A server with no Discord (a children's one) starts with its button and band off.
      { key: "discordOn", kind: "toggle", label: SERVER.discordOn, group: STATUS_NAME, public: true, default: Boolean(s.discord.trim()) },
      { key: "discordUrl", kind: "text", label: SERVER.discordUrl, note: SERVER.discordUrlNote, group: STATUS_NAME, public: true, default: s.discord },
      // A streamer's channel is read with their own Twitch keys (unless the streamers module brings them already).
      ...(streamer && !bp.modules.streamers
        ? [
            { key: "twitchClientId", kind: "text" as const, label: STREAM_W.clientId, note: STREAM_W.keysNote, group: STATUS_NAME, default: "" },
            { key: "twitchSecret", kind: "text" as const, label: STREAM_W.secret, group: STATUS_NAME, default: "" },
          ]
        : []),
      // A Roblox game's group: its button beside the Discord's.
      ...(s.game === "roblox"
        ? [
            { key: "robloxGroupOn", kind: "toggle" as const, label: SERVER.groupOn, group: STATUS_NAME, public: true, default: Boolean(s.group?.trim()) },
            { key: "robloxGroup", kind: "text" as const, label: SERVER.groupUrl, note: SERVER.groupUrlNote, group: STATUS_NAME, public: true, default: s.group ?? "" },
          ]
        : []),
    ];
  },
  panel: () => ({ today: [{ kind: "game", key: "server", title: SERVER.statusTitle }] }),
};
