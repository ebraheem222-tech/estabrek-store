import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import { aiKeyReady, publicCallsToday } from "./ai.client.js";
import { NO_KEY_NEEDED, aiOf, type AiFeature } from "./ai.settings.js";

/** The feature is on (and, when it needs one, the key is there); else 404 FEATURE_OFF. */
export async function needFeature(feature: AiFeature) {
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  const ai = aiOf(s?.header);
  if (!ai[feature] || (!NO_KEY_NEEDED.has(feature) && !aiKeyReady())) throw new AppError(404, "FEATURE_OFF", "This AI feature is off");
  return ai;
}

/* Shoppers: a few calls per IP an hour, and the owner's daily ceiling for everyone. */
const perIp = new Map<string, { hour: number; n: number }>();
export const aiPublicLimits = { perIpHour: 30 };

export async function needPublicFeature(feature: AiFeature, ip: string | null | undefined) {
  const ai = await needFeature(feature);
  const hour = Math.floor(Date.now() / 3600_000);
  if (ip) {
    const cur = perIp.get(ip);
    if (cur && cur.hour === hour) {
      if (cur.n >= aiPublicLimits.perIpHour) throw new AppError(429, "AI_BUSY", "Too many requests, try later");
      cur.n++;
    } else {
      if (perIp.size > 20_000) perIp.clear();
      perIp.set(ip, { hour, n: 1 });
    }
  }
  if ((await publicCallsToday()) >= ai.dailyLimit) throw new AppError(429, "AI_BUSY", "The shop's AI is resting for today");
  return ai;
}
