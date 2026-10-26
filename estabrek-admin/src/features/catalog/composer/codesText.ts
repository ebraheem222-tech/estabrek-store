// Codes sold one per piece (game keys, gift cards): words and counts for the
// product's codes block and the order's delivery card. Pure (tested).
import type { CodeStatus, CodesImportResult, ProductCode, ProductCodesInfo } from "../../../api/fulfillment.api";
import { timeAgo } from "../../../lib/orders";
import { tr } from "@/lib/words";

export const CODE_STATUS: Record<CodeStatus, { label: string; cls: string }> = {
  available: { label: tr("متاح", "Available"), cls: "bg-emerald-500/15 text-emerald-300" },
  delivered: { label: tr("انباع", "Sold"), cls: "bg-sky-500/15 text-sky-300" },
  void: { label: tr("ملغي", "Cancelled"), cls: "bg-white/10 text-white/50" },
};

/** 1 → "كود واحد", 2 → "كودين", 3–10 → "3 أكواد", more → "25 كود". */
export function codesCount(n: number) {
  if (n === 0) return tr("ولا كود", "no codes");
  if (n === 1) return tr("كود واحد", "1 code");
  if (n === 2) return tr("كودين", "2 codes");
  return tr(n <= 10 ? `${n} أكواد` : `${n} كود`, "{0} codes", [n]);
}

const MIN_LEN = 4;
const MAX_LEN = 200;
/** Tabs, line breaks and other invisible control characters. */
const hasControl = (v: string) => [...v].some((c) => c.charCodeAt(0) < 32);

/** What the server takes in one go (codes.service MAX_UPLOAD). */
export const MAX_CODES = 5000;
/** The body the server takes (characters). */
export const MAX_TEXT = 600_000;

/**
 * What the server will make of a pasted list (same rules as codes.service
 * parseCodeList): one per line or a CSV's first column, a header row skipped,
 * repeats dropped. Codes already on the server aren't known here.
 */
export function previewCodes(text: string) {
  const seen = new Set<string>();
  let count = 0;
  let invalid = 0;
  let repeated = 0;
  String(text ?? "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .forEach((line, i) => {
      const v = (line.split(/[,;\t]/)[0] ?? "").trim().replace(/^"(.*)"$/, "$1").trim();
      if (!v) return;
      if (i === 0 && /^(code|codes|key|keys|serial|serials|كود|الكود)$/i.test(v)) return;
      if (v.length < MIN_LEN || v.length > MAX_LEN || hasControl(v)) {
        invalid += 1;
        return;
      }
      const k = v.replace(/\s+/g, "").toUpperCase();
      if (seen.has(k)) {
        repeated += 1;
        return;
      }
      seen.add(k);
      count += 1;
    });
  return { count, invalid, repeated };
}

/** After an upload: what went in, and what didn't. */
export function importMessage(r: CodesImportResult): { title: string; description?: string } {
  const skipped = [
    r.duplicates ? tr(`${codesCount(r.duplicates)} موجود من قبل أو مكرر`, "{0} already there or repeated", [codesCount(r.duplicates)]) : "",
    r.invalid
      ? tr(`${codesCount(r.invalid)} مش مزبوط${r.invalidExamples.length ? ` (مثل «${r.invalidExamples[0]}»)` : ""}`, r.invalidExamples.length ? "{0} not right (like “{1}”)" : "{0} not right", [codesCount(r.invalid), r.invalidExamples[0]])
      : "",
  ].filter(Boolean);
  return {
    title: r.added ? tr(`انضاف ${codesCount(r.added)} · صار المتاح ${r.available}`, "{0} added · {1} available now", [codesCount(r.added), r.available]) : tr("ما انضاف ولا كود جديد", "No new codes added"),
    description: skipped.length ? tr(`تخطّينا: ${skipped.join("، ")}`, "Skipped: {0}", [skipped.join(", ")]) : undefined,
  };
}

/** A size's name in the codes block ("أزرق · 50$"); one size = the product itself. */
export function variantLabel(v: ProductCodesInfo["variants"][number]) {
  const parts = [v.color, v.size].map((x) => (x ?? "").trim()).filter(Boolean);
  return [...new Set(parts)].join(" · ") || v.sku;
}

/** The code as the admin sees it before revealing it. */
export const masked = (last4: string) => `•••• ${last4}`;

/** A code's story in one line: when it came, who got it, whether she looked. */
export function codeNote(c: Pick<ProductCode, "status" | "batch" | "createdAt" | "deliveredAt" | "viewedAt">, now = Date.now()) {
  const parts: string[] = [];
  if (c.status === "delivered" || (c.status === "void" && c.deliveredAt)) {
    if (c.deliveredAt) parts.push(tr(`انباع ${timeAgo(c.deliveredAt, now)}`, "Sold {0}", [timeAgo(c.deliveredAt, now)]));
    parts.push(c.viewedAt ? tr(`شافته ${timeAgo(c.viewedAt, now)}`, "Seen {0}", [timeAgo(c.viewedAt, now)]) : tr("لسا ما شافته", "Not seen yet"));
  } else {
    parts.push(tr(`انضاف ${timeAgo(c.createdAt, now)}`, "Added {0}", [timeAgo(c.createdAt, now)]));
  }
  if (c.batch) parts.push(c.batch);
  return parts.join(" · ");
}

/** The order's delivery card: is it OK to swap this code for another? */
export function canReplace(c: { status: CodeStatus }, closed: boolean) {
  return c.status === "delivered" && !closed;
}
