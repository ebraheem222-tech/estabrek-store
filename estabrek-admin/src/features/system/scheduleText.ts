// Plain-Arabic texts and small helpers for the timeline (الجدول الزمني). Pure (tested).
import type { CacheNamespaceName } from "../../api/cache.api";
import type { PreviewLine, ScheduleKind, ScheduleStatus, ScheduledChange } from "../../api/schedule.api";
import type { Campaign } from "../../api/selling.api";
import { MOTION_TEXT, NAMESPACE_TEXT } from "./cacheText";
import { valueText } from "../discounts/abText";
import { loc } from "@/lib/lang";

export const KIND_TEXT: Record<ScheduleKind, { label: string; title: string }> = {
  theme: { label: "الثيم", title: "تغيير الثيم" },
  motion: { label: "إعدادات الحركة", title: "تغيير الحركة" },
  maintenance: { label: "وضع الصيانة", title: "صيانة" },
  announcement: { label: "شريط الإعلان", title: "إعلان" },
  section: { label: "قسم بصفحة", title: "قسم" },
  cachePurge: { label: "تفريغ الكاش", title: "تفريغ الكاش" },
};

export const STATUS_TEXT: Record<ScheduleStatus, { label: string; variant: "info" | "success" | "default" | "warning" | "danger" }> = {
  scheduled: { label: "مجدول", variant: "info" },
  applied: { label: "مطبّق، بيرجع لحاله", variant: "success" },
  done: { label: "صار", variant: "default" },
  undone: { label: "رجع", variant: "default" },
  canceled: { label: "انلغى", variant: "warning" },
  failed: { label: "فشل", variant: "danger" },
};

export type Names = { theme: (id: string | null) => string; section: (id: string) => string };

const onOff = (v: unknown) => (v ? "شغّال" : "مطفي");
const quote = (v: unknown) => (v ? `«${String(v)}»` : "فاضي");

/** One line for the list: what the change sets. */
export function payloadSummary(kind: ScheduleKind, p: Record<string, unknown>, names: Names): string {
  if (kind === "theme") return `الثيم: ${names.theme((p.presetId as string | null) ?? null)}`;
  if (kind === "motion") {
    const c = (p.changes ?? {}) as Record<string, unknown>;
    return Object.entries(c)
      .map(([k, v]) => `${MOTION_TEXT[k] ?? k}: ${valueText("motion", k, v)}`)
      .join(" · ");
  }
  if (kind === "maintenance") return p.on ? `الصيانة شغّالة${p.message ? `: ${quote(p.message)}` : ""}` : "الصيانة مطفية";
  if (kind === "announcement") return p.on ? `شريط الإعلان: ${p.text ? quote(p.text) : "بالنص المحفوظ"}` : "بلا شريط إعلان";
  if (kind === "section") return `${p.visible ? "إظهار" : "إخفاء"}: ${names.section(String(p.sectionId))}`;
  const ns = p.namespace as CacheNamespaceName | null;
  return ns ? `تفريغ ${NAMESPACE_TEXT[ns]?.label ?? ns}` : "تفريغ كل الكاش";
}

/** A preview line: "الثيم: Estabrak Soft ← Luxury Paper". */
export function previewLineText(l: PreviewLine, names: Names): string {
  const [root, k] = l.key.split(".");
  if (root === "theme") return `الثيم: ${names.theme(l.from as string | null)} ← ${names.theme(l.to as string | null)}`;
  if (root === "storefront") return `${MOTION_TEXT[k] ?? k}: ${valueText("motion", k, l.from)} ← ${valueText("motion", k, l.to)}`;
  if (root === "maintenance") return k === "on" ? `الصيانة: ${onOff(l.from)} ← ${onOff(l.to)}` : `رسالة الصيانة: ${quote(l.from)} ← ${quote(l.to)}`;
  if (root === "announcement") {
    if (k === "on") return `شريط الإعلان: ${onOff(l.from)} ← ${onOff(l.to)}`;
    return `${k === "text" ? "نص الإعلان" : "رابط الإعلان"}: ${quote(l.from)} ← ${quote(l.to)}`;
  }
  if (root === "section") return `${l.label ?? "القسم"}: ${l.from ? "ظاهر" : "مخفي"} ← ${l.to ? "ظاهر" : "مخفي"}`;
  const ns = k as CacheNamespaceName | "all";
  return ns === "all" ? "كل الكاش بيفضى، والمتجر بيبني صفحاته من جديد." : `${NAMESPACE_TEXT[ns]?.label ?? ns} بيفضى.`;
}

const when = (iso: string) => new Date(iso).toLocaleString(loc("ar"), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export function whenText(c: Pick<ScheduledChange, "runAt" | "undoAt">): string {
  return c.undoAt ? `${when(c.runAt)} ← بيرجع ${when(c.undoAt)}` : when(c.runAt);
}

export type TimelineItem = { type: "change"; at: string; change: ScheduledChange } | { type: "campaign"; at: string; campaign: Campaign };

/** Now (applied, waiting to go back; seasons running), next (soonest first), past (newest first). */
export function timelineGroups(changes: ScheduledChange[], campaigns: Campaign[]) {
  const items: TimelineItem[] = [
    ...changes.map((c) => ({ type: "change" as const, at: c.status === "applied" && c.undoAt ? c.undoAt : c.runAt, change: c })),
    ...campaigns.map((c) => ({ type: "campaign" as const, at: c.status === "running" ? c.endsAt : c.startsAt, campaign: c })),
  ];
  const state = (i: TimelineItem) =>
    i.type === "change"
      ? i.change.status === "applied"
        ? "now"
        : i.change.status === "scheduled"
          ? "next"
          : "past"
      : i.campaign.status === "running"
        ? "now"
        : i.campaign.status === "scheduled"
          ? "next"
          : "past";
  const by = (s: string) => items.filter((i) => state(i) === s);
  const asc = (a: TimelineItem, b: TimelineItem) => Date.parse(a.at) - Date.parse(b.at);
  return { now: by("now").sort(asc), next: by("next").sort(asc), past: by("past").sort((a, b) => -asc(a, b)) };
}
