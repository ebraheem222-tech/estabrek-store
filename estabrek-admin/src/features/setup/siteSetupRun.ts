// A new copy set up as a whole site (the setup's last step, «شو نوع موقعك؟» → a site): one step after another,
// each with the admin's own calls, so what is done stays done and «جرّب كمان مرة» goes on from the one that
// failed: the store's part (its name, theme, assistant) → the site installed → and, to have it live from the
// first day, switched on → its pages published → made the store's home with its menus.
import { applySetup } from "../../api/setup.api";
import { installTemplate, makeSiteHome, saveFeature, type Feature } from "../../api/myFeatures.api";
import { updatePage } from "../../api/pages.api";
import { getApiErrorMessage } from "../../api/http";
import type { SetupRequest } from "./buildSetup";
import type { ChosenFile, Shell } from "../../studio/templates/sites";

export const SITE_RUN = ["setup", "install", "on", "publish", "home"] as const;
export type SiteRunStep = (typeof SITE_RUN)[number];
export type SiteRun = { done: SiteRunStep[]; failed: { step: SiteRunStep; message: string } | null; feature: Feature | null; live: boolean };
export const siteRunStart = (live: boolean): SiteRun => ({ done: [], failed: null, feature: null, live });
/** The steps this run takes: all of them live, else up to the install (a draft, as the gallery's). */
export const runSteps = (live: boolean): SiteRunStep[] => (live ? [...SITE_RUN] : ["setup", "install"]);

export type SiteRunInput = { request: SetupRequest; file: ChosenFile; lang: "ar" | "en" | "he"; shell: Shell };

/** Goes on from `from` (its done steps are skipped) to the end, or to the step that fails; `onStep` hears each one. */
export async function runSiteSetup(input: SiteRunInput, from: SiteRun, onStep: (run: SiteRun) => void): Promise<SiteRun> {
  let run: SiteRun = { ...from, failed: null };
  for (const step of runSteps(run.live)) {
    if (run.done.includes(step)) continue;
    try {
      const feature = await doStep(step, input, run.feature);
      run = { ...run, done: [...run.done, step], feature: feature ?? run.feature };
    } catch (e) {
      run = { ...run, failed: { step, message: getApiErrorMessage(e) } };
      onStep(run);
      return run;
    }
    onStep(run);
  }
  return run;
}

async function doStep(step: SiteRunStep, input: SiteRunInput, feature: Feature | null): Promise<Feature | null> {
  if (step === "setup") return void (await applySetup(input.request)), null;
  if (step === "install") return installTemplate(input.file, input.lang);
  if (!feature) throw new Error("The site isn't installed");
  if (step === "on") return saveFeature(feature.id, { enabled: true });
  if (step === "publish") {
    // The site's own pages (those its file names); one published already is left as it is.
    for (const p of feature.pages) if (p.key && p.status !== "PUBLISHED") await updatePage(p.id, { status: "PUBLISHED" });
    return { ...feature, pages: feature.pages.map((p) => (p.key ? { ...p, status: "PUBLISHED" as const } : p)) };
  }
  return (await makeSiteHome(feature.id, input.shell)).feature;
}
