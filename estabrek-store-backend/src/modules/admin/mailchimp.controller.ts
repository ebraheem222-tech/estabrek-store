/**
 * Admin → الإعدادات → النشرة البريدية → Mailchimp (lib/mailchimp.ts): the connection as it stands (never its key),
 * the key and audience saved (the key checked with Mailchimp first, then sealed), the key's audiences to pick one,
 * and the subscribers from before sent to the audience. Behind the settings' permissions (admin.routes.ts).
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getOrCreateSiteRow } from "../../lib/siteRow.js";
import { seal, open } from "../../lib/secretBox.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { MailchimpError, dataCentre, mailchimpLists, queueAllMailchimp } from "../../lib/mailchimp.js";

const r = Router();

const KEY = z.string().trim().max(120).refine((v) => dataCentre(v) !== null, "Not a Mailchimp API key (it ends in -us21 or the like)");
const SaveBody = z.object({
  enabled: z.boolean().optional(),
  /** A new key (null takes it away; left out keeps the one saved). */
  apiKey: KEY.nullable().optional(),
  listId: z.string().trim().regex(/^[A-Za-z0-9]{4,40}$/, "An audience id").nullable().optional(),
  doubleOptIn: z.boolean().optional(),
});
const ListsBody = z.object({ apiKey: KEY.optional() });

/** The key saved, opened (none when there's none or it was sealed with another server key). */
function savedKey(sealed: string | null): string | null {
  if (!sealed) return null;
  try { return open(sealed); } catch { return null; }
}
const fail = (res: any, e: unknown) => {
  if (e instanceof MailchimpError) return res.status(400).json({ error: "MAILCHIMP", status: e.status, message: e.message });
  throw e;
};

async function stateOf() {
  const s = await getOrCreateSiteRow();
  const key = savedKey(s.mailchimpApiKey);
  const [subscribers, inAudience] = await Promise.all([prisma.newsletterSubscriber.count(), prisma.newsletterSubscriber.count({ where: { mailchimpAt: { not: null } } })]);
  return {
    enabled: s.mailchimpEnabled,
    keySet: Boolean(s.mailchimpApiKey),
    // Its data centre only ("us21"): enough to tell which account, nothing to use.
    keyCentre: key ? dataCentre(key) : null,
    keyUnreadable: Boolean(s.mailchimpApiKey) && !key,
    listId: s.mailchimpListId,
    doubleOptIn: s.mailchimpDoubleOptIn,
    syncedAt: s.mailchimpSyncedAt,
    error: s.mailchimpError,
    subscribers,
    inAudience,
  };
}

// GET /v1/admin/newsletter/mailchimp
r.get("/", asyncHandler(async (_req, res) => {
  res.json(await stateOf());
}));

// POST /v1/admin/newsletter/mailchimp/lists — the audiences of a key typed now, or of the one saved.
r.post("/lists", validate({ body: ListsBody }), asyncHandler(async (req, res) => {
  const s = await getOrCreateSiteRow();
  const key = (req.body as z.infer<typeof ListsBody>).apiKey ?? savedKey(s.mailchimpApiKey);
  if (!key) return res.status(400).json({ error: "NO_KEY", message: "Type the Mailchimp API key first" });
  try {
    res.json({ lists: await mailchimpLists(key) });
  } catch (e) {
    return fail(res, e);
  }
}));

// PUT /v1/admin/newsletter/mailchimp — switched on or off, a new key, the audience, asking to confirm first.
r.put("/", validate({ body: SaveBody }), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof SaveBody>;
  const s = await getOrCreateSiteRow();
  const key = body.apiKey === undefined ? savedKey(s.mailchimpApiKey) : body.apiKey;
  const listId = body.listId === undefined ? s.mailchimpListId : body.listId;
  const enabled = body.enabled ?? s.mailchimpEnabled;
  // Switched on: the key must open the account and the audience must be one of it.
  if (enabled) {
    if (!key || !listId) return res.status(400).json({ error: "INCOMPLETE", message: "A key and an audience are needed to switch it on" });
    try {
      const lists = await mailchimpLists(key);
      if (!lists.some((l) => l.id === listId)) return res.status(400).json({ error: "NO_SUCH_LIST", message: "That audience isn't in this Mailchimp account" });
    } catch (e) {
      return fail(res, e);
    }
  }
  await prisma.siteSettings.update({
    where: { id: s.id },
    data: {
      mailchimpEnabled: enabled,
      ...(body.apiKey !== undefined ? { mailchimpApiKey: body.apiKey ? seal(body.apiKey) : null } : {}),
      ...(body.listId !== undefined ? { mailchimpListId: body.listId } : {}),
      ...(body.doubleOptIn !== undefined ? { mailchimpDoubleOptIn: body.doubleOptIn } : {}),
      // A new connection starts with a clean slate.
      mailchimpError: null,
    },
  });
  res.json(await stateOf());
}));

// POST /v1/admin/newsletter/mailchimp/sync — every subscriber not in the audience yet, sent through the queue.
r.post("/sync", asyncHandler(async (_req, res) => {
  const queued = await queueAllMailchimp();
  if (queued) await prisma.siteSettings.updateMany({ data: { mailchimpSyncedAt: new Date(), mailchimpError: null } });
  res.json({ queued, ...(await stateOf()) });
}));

export default r;
