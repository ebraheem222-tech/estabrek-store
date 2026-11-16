/**
 * A feature the owner built, switched off (M; admin → ميزاتي): its functions aren't started by
 * anything but the admin's own run, and its tables' API answers as if they weren't open. The
 * things themselves stay as they are: switched back on, everything works as before.
 *
 * Asked on every call to a function's address and to a table's API, so it is read once every few
 * seconds (and at once after a feature changes: `forgetFeatureGate`).
 */
import { prisma } from "./prisma.js";

export const FEATURE_KINDS = ["table", "function", "page"] as const;
export type FeatureKind = (typeof FEATURE_KINDS)[number];

type Off = { at: number; tables: Set<string>; fns: Set<string> };
let cache: Off | null = null;

export function forgetFeatureGate() {
  cache = null;
}

/** The tables and functions that belong to a feature that is switched off. */
export async function switchedOff(now = Date.now()): Promise<Pick<Off, "tables" | "fns">> {
  if (!cache || now - cache.at > 10_000) {
    const items = await prisma.featureItem.findMany({ where: { feature: { enabled: false }, kind: { in: ["table", "function"] } }, select: { kind: true, refId: true } });
    cache = { at: now, tables: new Set(items.filter((i) => i.kind === "table").map((i) => i.refId)), fns: new Set(items.filter((i) => i.kind === "function").map((i) => i.refId)) };
  }
  return cache;
}
