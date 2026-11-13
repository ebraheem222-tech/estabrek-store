// Plain-Arabic texts and small helpers for the server state page (حالة السيرفر). Pure (tested).
import type { DeployPage, DeployState } from "../../api/deploy.api";
import { durationText } from "./cacheText";
import { agoText } from "./jobsText";

export const STATE_TEXT: Record<DeployState, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  current: { label: "آخر نسخة حية", variant: "success" },
  deploying: { label: "نسخة جديدة عم تنزل", variant: "info" },
  late: { label: "النشر متأخّر", variant: "danger" },
  failed: { label: "النشر فشل", variant: "danger" },
  unknown: { label: "مش معروف", variant: "default" },
};

export const shortCommit = (sha: string | null | undefined) => (sha ? sha.slice(0, 7) : "—");

/** The commit's page on GitHub (only for a real commit of a known repository). */
export function commitLink(repo: string | null | undefined, sha: string | null | undefined): string | null {
  return repo && sha && /^[\w.-]+\/[\w.-]+$/.test(repo) && /^[0-9a-f]{40}$/.test(sha) ? `https://github.com/${repo}/commit/${sha}` : null;
}

/** The host's mark for a deployment, in plain words. */
export function markText(mark: string | null | undefined): string {
  if (!mark) return "—";
  if (mark === "success") return "نجح";
  if (mark === "failure" || mark === "error") return "فشل";
  if (mark === "in_progress") return "عم ينبنى";
  if (mark === "queued" || mark === "pending") return "بالدور";
  if (mark === "inactive") return "تبدّل بنشر أحدث";
  return mark;
}

/** What's going on, and what to do about it. */
export function deploySentence(d: Pick<DeployPage, "state" | "reason" | "live" | "latest" | "lateAfterMinutes" | "error">, now: number): string {
  const live = shortCommit(d.live.commit);
  const next = shortCommit(d.latest?.commit);
  const waiting = d.latest ? durationText(Math.max(1, (now - Date.parse(d.latest.since)) / 1000)) : "";
  if (d.state === "current") return `السيرفر شغّال على آخر تعديل بالفرع ${d.live.branch}.`;
  if (d.state === "deploying") return `التعديل ${next} وصل ${agoText(d.latest?.since, now)} ولسا عم ينزل (بالعادة من دقيقتين لـ 6). إذا ما صار حي خلال ${d.lateAfterMinutes} دقايق بيوصلك تنبيه.`;
  if (d.state === "late") return `التعديل ${next} على الفرع من ${waiting} ولسا مش حي. السيرفر لسا شغّال على النسخة ${live}: شوف سجل النشر على Railway.`;
  if (d.state === "failed") return `Railway علّم نشر التعديل ${next} إنه فشل. السيرفر لسا شغّال على النسخة القديمة ${live}: شوف سجل النشر على Railway.`;
  if (d.reason === "noCommit") return "هالسيرفر ما بيعرف أي تعديل شغّال عليه، فما في مراقبة (بتشتغل لحالها على Railway).";
  if (d.reason === "noRepo") return "السيرفر بيعرف تعديله بس ما بيعرف المستودع (RAILWAY_GIT_REPO_OWNER و RAILWAY_GIT_REPO_NAME).";
  if (d.reason === "cantReach") return `ما قدر السيرفر يوصل لـ GitHub ليعرف آخر تعديل${d.error ? ` (${d.error})` : ""}. بيجرّب كل دقيقة.`;
  return "لسا ما انفحص. أول فحص بيصير بعد تشغيل السيرفر بـ 20 ثانية.";
}

/** Is someone told by email when a deployment doesn't go live? */
export const hasEmailRule = (d: Pick<DeployPage, "rules">) => d.rules.some((r) => r.action === "email" && r.enabled);

/** Why the watch itself isn't looking, or null. */
export function watchProblem(d: Pick<DeployPage, "watch" | "reason">): string | null {
  const w = d.watch;
  if (!w) return "مهمة المراقبة مش مسجّلة على هالسيرفر.";
  if (w.status === "paused") return "المراقبة موقّفة من «المهام بالخلفية»: ما رح يوصلك تنبيه لحتى تكمّلها.";
  // Off because the server doesn't know its commit: the sentence above says it already.
  if (w.status === "off") return d.reason === "noCommit" || d.reason === "noRepo" ? null : "المراقبة مطفية من السيرفر.";
  if (w.failuresInRow >= 3) return "المراقبة عم تفشل: السيرفر مش قادر يوصل لـ GitHub من نص ساعة وأكثر.";
  return null;
}
