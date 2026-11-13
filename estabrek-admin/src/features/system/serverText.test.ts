import { describe, expect, test } from "vitest";
import type { DeployPage } from "../../api/deploy.api";
import { STATE_TEXT, commitLink, deploySentence, hasEmailRule, markText, shortCommit, watchProblem } from "./serverText";
import { newRule, TRIGGER_TEXT, WORD_TEXT } from "./automationText";
import { runSummary } from "./jobsText";
import { JOB_TEXT } from "./jobNames";

const LIVE = "a".repeat(40);
const NEXT = "b".repeat(40);
const NOW = Date.parse("2026-11-13T10:12:00Z");

const page = (over: Partial<DeployPage> = {}): DeployPage => ({
  now: NOW,
  state: "current",
  reason: null,
  live: { commit: LIVE, message: "Merge pull request #91", branch: "main", repo: "acme/shop", deploymentId: null, startedAt: "2026-11-13T09:00:00Z" },
  latest: { commit: LIVE, message: "Merge pull request #91", at: null, seenAt: "2026-11-13T09:00:20Z", since: "2026-11-13T09:00:20Z" },
  mark: null,
  lateAfterMinutes: 10,
  checkedAt: "2026-11-13T10:11:30Z",
  error: null,
  told: false,
  watch: { status: "waiting", everyMs: 60_000, nextAt: "2026-11-13T10:12:30Z", off: null, failuresInRow: 0 },
  rules: [],
  channels: { email: true, outboxWorker: true },
  ...over,
});
const waiting = (since: string) => ({ commit: NEXT, message: "Merge pull request #92", at: null, seenAt: since, since });

describe("Server state texts", () => {
  test("each state in a sentence that says what to do", () => {
    expect(deploySentence(page(), NOW)).toBe("السيرفر شغّال على آخر تعديل بالفرع main.");
    expect(deploySentence(page({ state: "deploying", latest: waiting("2026-11-13T10:09:00Z") }), NOW)).toBe(
      "التعديل bbbbbbb وصل قبل 3 دقايق ولسا عم ينزل (بالعادة من دقيقتين لـ 6). إذا ما صار حي خلال 10 دقايق بيوصلك تنبيه.",
    );
    expect(deploySentence(page({ state: "late", latest: waiting("2026-11-13T09:57:00Z") }), NOW)).toBe(
      "التعديل bbbbbbb على الفرع من 15 دقايق ولسا مش حي. السيرفر لسا شغّال على النسخة aaaaaaa: شوف سجل النشر على Railway.",
    );
    expect(deploySentence(page({ state: "failed", latest: waiting("2026-11-13T10:08:00Z"), mark: "failure" }), NOW)).toContain("Railway علّم نشر التعديل bbbbbbb إنه فشل");
  });

  test("unknown says why", () => {
    const unknown = (reason: DeployPage["reason"], error: string | null = null) => deploySentence(page({ state: "unknown", reason, error, latest: null }), NOW);
    expect(unknown("noCommit")).toContain("ما بيعرف أي تعديل شغّال عليه");
    expect(unknown("noRepo")).toContain("RAILWAY_GIT_REPO_OWNER");
    expect(unknown("cantReach", "GitHub: 503")).toBe("ما قدر السيرفر يوصل لـ GitHub ليعرف آخر تعديل (GitHub: 503). بيجرّب كل دقيقة.");
    expect(unknown("notChecked")).toContain("لسا ما انفحص");
    for (const s of Object.values(STATE_TEXT)) expect(s.label).toBeTruthy();
  });

  test("commits, links and the host's mark", () => {
    expect(shortCommit(NEXT)).toBe("bbbbbbb");
    expect(shortCommit(null)).toBe("—");
    expect(commitLink("acme/shop", NEXT)).toBe(`https://github.com/acme/shop/commit/${NEXT}`);
    expect(commitLink("acme/shop", "bbbbbbb")).toBeNull();
    expect(commitLink("javascript:alert(1)//x/y", NEXT)).toBeNull();
    expect(commitLink(null, NEXT)).toBeNull();
    expect(markText("failure")).toBe("فشل");
    expect(markText("in_progress")).toBe("عم ينبنى");
    expect(markText("success")).toBe("نجح");
    expect(markText(null)).toBe("—");
    expect(markText("waiting")).toBe("waiting");
  });

  test("who gets told, and when the watch itself isn't looking", () => {
    expect(hasEmailRule(page())).toBe(false);
    expect(hasEmailRule(page({ rules: [{ id: "1", name: "x", action: "email", enabled: false }] }))).toBe(false);
    expect(hasEmailRule(page({ rules: [{ id: "1", name: "x", action: "email", enabled: true }] }))).toBe(true);
    expect(watchProblem(page())).toBeNull();
    expect(watchProblem(page({ watch: null }))).toContain("مش مسجّلة");
    expect(watchProblem(page({ watch: { status: "paused", everyMs: 60_000, nextAt: null, off: null, failuresInRow: 0 } }))).toContain("موقّفة");
    const off = { status: "off" as const, everyMs: 60_000, nextAt: null, off: "RAILWAY_GIT_COMMIT_SHA", failuresInRow: 0 };
    expect(watchProblem(page({ state: "unknown", reason: "noCommit", watch: off }))).toBeNull();
    expect(watchProblem(page({ watch: off }))).toContain("مطفية");
    expect(watchProblem(page({ watch: { status: "waiting", everyMs: 60_000, nextAt: null, off: null, failuresInRow: 3 } }))).toContain("عم تفشل");
  });

  test("the watch in the jobs page and in the automations", () => {
    expect(JOB_TEXT.deployWatch.link?.to).toBe("/admin/system/server");
    expect(runSummary("deployWatch", { ok: true, counts: { checked: 1, behind: 0 }, error: null })).toBe("آخر نسخة حية");
    expect(runSummary("deployWatch", { ok: true, counts: { checked: 1, behind: 1, told: 0 }, error: null })).toBe("في تعديل لسا مش حي");
    expect(runSummary("deployWatch", { ok: true, counts: { checked: 1, behind: 1, told: 1 }, error: null })).toBe("تعديل ما صار حي: انبعت تنبيه");
    expect(runSummary("deployWatch", { ok: true, counts: { checked: 0, unreachable: 1 }, error: null })).toBe("ما وصل لـ GitHub");
    expect(runSummary("deployWatch", { ok: true, counts: { checked: 0 }, error: null })).toBe("السيرفر ما بيعرف نسخته");
    expect(TRIGGER_TEXT["deploy.failed"].label).toBe("النشر ما صار حي");
    // The bell rings by itself for this one: a new rule starts as an email, once an hour.
    expect(newRule("deploy.failed", {})).toMatchObject({ action: "email", cooldownMinutes: 60 });
    for (const w of ["commit", "message", "minutes", "live", "reason"]) expect(WORD_TEXT[w], w).toBeTruthy();
  });
});
