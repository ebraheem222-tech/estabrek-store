/**
 * A reviewer's vote on a row in a site panel's queue (sites wave G3 of docs/sites-300-plan.ar.md): an application to
 * a game server's whitelist or one of its jobs is read by the staff, and each says yes or no, once (changed or taken
 * back by them), with a note if they like. A queue that counts votes (lib/sitePanel.ts `votes`) holds back its buttons
 * marked "after the votes" (accept) until enough said yes; how many is one of the site's settings, so its owner sets it.
 *
 * A vote names its member by id, and keeps their name as it was then (a member who leaves keeps their vote).
 */
import { prisma } from "./prisma.js";

export const VOTES = ["yes", "no"] as const;
export type Vote = (typeof VOTES)[number];
export const VOTE_NOTE_MAX = 500;
/** A row's votes as a member sees them: how many each way, their own, and who said what. */
export type VoteView = { yes: number; no: number; mine: Vote | null; by: Array<{ name: string; vote: Vote; note: string | null; at: string; me: boolean }> };

const isVote = (v: string): v is Vote => (VOTES as readonly string[]).includes(v);
const NONE: Omit<VoteView, "mine"> = { yes: 0, no: 0, by: [] };

/** The votes on each of these rows, the oldest first, as `member` sees them. */
export async function votesOn(itemIds: string[], member: string | null): Promise<Map<string, VoteView>> {
  const out = new Map<string, VoteView>(itemIds.map((id) => [id, { ...NONE, by: [], mine: null }]));
  if (!itemIds.length) return out;
  const found = await prisma.rowVote.findMany({ where: { itemId: { in: [...new Set(itemIds)] } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  for (const v of found) {
    const view = out.get(v.itemId);
    if (!view || !isVote(v.vote)) continue;
    view[v.vote] += 1;
    const me = !!member && v.memberId === member;
    if (me) view.mine = v.vote;
    view.by.push({ name: v.memberName, vote: v.vote, note: v.note, at: v.updatedAt.toISOString(), me });
  }
  return out;
}

/** How many said yes to a row. */
export const yesVotes = (itemId: string) => prisma.rowVote.count({ where: { itemId, vote: "yes" } });

/** A member's vote on a row: yes or no (their earlier one changed, its note too), or none (taken back). */
export async function castVote(itemId: string, member: { id: string; name: string }, vote: Vote | null, note?: string | null) {
  const where = { itemId_memberId: { itemId, memberId: member.id.slice(0, 64) } };
  if (!vote) {
    await prisma.rowVote.deleteMany({ where: { itemId, memberId: member.id.slice(0, 64) } });
    return;
  }
  const said = note?.trim() ? note.trim().slice(0, VOTE_NOTE_MAX) : null;
  const name = member.name.trim().slice(0, 200) || member.id.slice(0, 64);
  await prisma.rowVote.upsert({ where, create: { itemId, memberId: member.id.slice(0, 64), memberName: name, vote, note: said }, update: { vote, note: said, memberName: name } });
}
