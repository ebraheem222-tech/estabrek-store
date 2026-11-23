/**
 * A game server site's own elements, filled as its page is served (wave G of docs/sites-300-plan.ar.md): its live
 * status (lib/gameSites.ts), its Tebex packages (lib/tebex.ts), its rankings (lib/ranking.ts), its next wipe
 * (lib/wipes.ts) and its streamers (lib/twitch.ts). Each looks for its own elements and leaves a page without them as it is.
 */
import { withGameStatus } from "./gameSites.js";
import { withRanking } from "./ranking.js";
import { withTebex } from "./tebex.js";
import { withStreamers } from "./twitch.js";
import { withWipe } from "./wipes.js";

export async function withGameParts<T>(tree: T, of: { kind: "page" | "table"; id: string }): Promise<T> {
  let out = tree;
  for (const fill of [withGameStatus, withTebex, withRanking, withWipe, withStreamers]) out = await fill(out, of);
  return out;
}
