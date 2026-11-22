// ميزاتي → upgrading a feature made from a template (stage 4). A newer file of the same template (from
// the gallery, or one the owner has) shows piece by piece what it would do: new things made, what the
// owner never touched updated, what they changed kept (unless they choose the template's), a field
// change that would set values aside left to them. Functions take the new steps as their draft.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import * as FeaturesAPI from "../../api/myFeatures.api";
import type { Feature, UpgradeAction } from "../../api/myFeatures.api";
import { buildChosen, siteByKey } from "../../studio/templates/sites";
import { problemText, readJson } from "./templatesText";
import { actionMeans, actionName, compareVersions, inOrder, kindName, summaryLine, withChoices } from "./upgradeText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const BADGE: Record<UpgradeAction, "default" | "success" | "warning"> = { add: "success", update: "success", conflict: "warning", taken: "warning", dropped: "default", gone: "default", waits: "warning" };
/** The server's own name for what went wrong (its words are said too). */
const codeOf = (e: unknown) => (e as { response?: { data?: { error?: string } } } | null)?.response?.data?.error ?? null;

export function FeatureUpgrade({ feature }: { feature: Feature }) {
  const t = feature.template!;
  const gallery = useQuery({ queryKey: ["feature-gallery"], queryFn: FeaturesAPI.listGallery, staleTime: 5 * 60_000 });
  const inGallery = gallery.data?.items.find((x) => x.key === t.key) ?? null;
  // A whole site is built here, in the admin (studio/templates/sites): its newest version is the one this admin has.
  const site = siteByKey(t.key);
  const latest: { version: string } | null = inGallery ?? site;
  const newer = latest && compareVersions(latest.version, t.version) > 0 ? latest : null;
  const [source, setSource] = useState<{ id: string; template: unknown } | null>(null);
  const [bad, setBad] = useState<string | null>(null);
  const fromGallery = useMutation({
    // Built with the choices its install wizard made (the owner's details, the modules it kept, its look), not the sample's.
    mutationFn: async () => (site && !inGallery ? { template: buildChosen(site, t.site ?? null, adminLang()) as unknown } : FeaturesAPI.galleryFile(t.key)),
    onSuccess: (r) => setSource({ id: `gallery:${t.key}:${newer!.version}`, template: r.template }),
    onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  const pick = async (f: File | undefined) => {
    setSource(null);
    setBad(null);
    if (!f) return;
    const json = readJson(await f.text());
    if (json === null) return setBad(say("هاد الملف مش JSON.|This file isn't JSON.|הקובץ הזה אינו JSON."));
    setSource({ id: `${f.name}:${f.size}:${f.lastModified}:${Math.random()}`, template: json });
  };
  return (
    <section className={box} data-testid="feature-upgrade">
      <h2 className="font-medium">{say("رقّي الميزة|Upgrade the feature|שדרוג התכונה")}</h2>
      <p className="mt-1 text-xs text-white/60">
        {say(
          "نسخة أجدد من نفس القالب بتجيب تحسيناته، وتعديلاتك بتضل إلك: اللي ما غيّرته بياخد الجديد، واللي غيّرته بيضل متل ما هو إلا إذا اخترت نسخة القالب. الـ functions بتاخد الخطوات الجديدة كمسودة، والمنشور بيضل شغّال لحد ما تنشر.|A newer version of the same template brings its improvements, and your changes stay yours: what you didn't change takes the new, what you changed stays as it is unless you choose the template's. Functions take the new steps as their draft; what is published keeps running until you publish.|גרסה חדשה של אותה תבנית מביאה את השיפורים שלה, והשינויים שלכם נשארים שלכם: מה שלא שיניתם מקבל את החדש, ומה ששיניתם נשאר כמו שהוא אלא אם בוחרים את של התבנית. פונקציות מקבלות את השלבים החדשים כטיוטה; מה שפורסם ממשיך לרוץ עד שמפרסמים.",
        )}
      </p>
      {newer ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm" data-testid="feature-upgrade-newer">
          <span>
            {say("بالمعرض نسخة أجدد: {to} (عندك {from})|The gallery has a newer version: {to} (you have {from})|בגלריה יש גרסה חדשה יותר: {to} (אצלכם {from})").replace("{to}", newer.version).replace("{from}", t.version)}
          </span>
          <Button size="sm" variant="secondary" isLoading={fromGallery.isPending} onClick={() => fromGallery.mutate()} data-testid="feature-upgrade-gallery">
            {say("شوف شو بيتغيّر|See what changes|מה משתנה")}
          </Button>
        </div>
      ) : latest ? (
        <p className="mt-3 text-xs text-white/60" data-testid="feature-upgrade-latest">
          {say("عندك آخر نسخة بالمعرض ({v}).|You have the gallery's latest ({v}).|יש לכם את הגרסה האחרונה בגלריה ({v}).").replace("{v}", t.version)}
        </p>
      ) : null}
      <label className="mt-3 block text-xs text-white/60">
        {say("أو من ملف بنسخة أجدد من نفس القالب:|Or from a file of a newer version of the same template:|או מקובץ של גרסה חדשה יותר של אותה תבנית:")}
        <input type="file" accept=".json,application/json" className="mt-1 block max-w-full text-sm text-white/80" onChange={(e) => void pick(e.target.files?.[0])} data-testid="feature-upgrade-file" />
      </label>
      {bad ? <p className="mt-2 text-sm text-red-300">{bad}</p> : null}
      {source ? <UpgradeFlow key={source.id} featureId={feature.id} id={source.id} template={source.template} onDone={() => setSource(null)} /> : null}
    </section>
  );
}

function UpgradeFlow({ featureId, id, template, onDone }: { featureId: string; id: string; template: unknown; onDone: () => void }) {
  const lang = adminLang();
  const qc = useQueryClient();
  const [take, setTake] = useState<Set<string>>(new Set());
  const look = useQuery({ queryKey: ["feature-upgrade", featureId, id], queryFn: () => FeaturesAPI.previewUpgrade(featureId, template, lang), gcTime: 0, retry: false });
  const run = useMutation({
    mutationFn: () => FeaturesAPI.upgradeFeature(featureId, template, [...take], lang),
    onSuccess: (r) => {
      qc.setQueryData(["my-features", featureId], r.feature);
      void qc.invalidateQueries({ queryKey: ["my-features"], exact: true });
      void qc.invalidateQueries({ queryKey: ["functions"] });
      toast.success(say("رقّيت لـ {v}|Upgraded to {v}|שודרג ל-{v}").replace("{v}", r.to), { description: summaryLine(r.items, lang) });
      onDone();
    },
    onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  if (look.isLoading) return <p className="mt-3 text-sm text-white/60">{say("عم نقارن…|Comparing…|משווים…")}</p>;
  if (look.isError || !look.data) {
    const code = codeOf(look.error);
    const said =
      code === "NOT_NEWER"
        ? say("الميزة على هالنسخة أو أجدد منها: ما في شي لترقّيه.|The feature is at this version or newer: nothing to upgrade.|התכונה בגרסה הזאת או חדשה יותר: אין מה לשדרג.")
        : code === "TEMPLATE_OTHER"
          ? say("هاد الملف لقالب تاني، مش للقالب اللي إجت منه هالميزة.|This file is of another template, not the one this feature came from.|הקובץ הזה של תבנית אחרת, לא של זו שהתכונה הגיעה ממנה.")
          : getApiErrorMessage(look.error);
    return (
      <p className="mt-3 text-sm text-amber-200" data-testid="feature-upgrade-refused">
        {said}
      </p>
    );
  }
  const p = look.data;
  if (!p.from) {
    return (
      <ul className="mt-3 space-y-1 text-sm text-red-200" data-testid="feature-upgrade-problems">
        {p.problems.map((x, k) => (
          <li key={k}>{problemText(x, lang)}</li>
        ))}
      </ul>
    );
  }
  const items = inOrder(withChoices(p.items, take));
  return (
    <div className="mt-4 space-y-3" data-testid="feature-upgrade-preview" data-ok={p.ok}>
      <div className="text-sm font-medium" data-testid="feature-upgrade-versions">
        {say("من|From|מ-")} <bdi dir="ltr">{p.from}</bdi> {say("لـ|to|ל-")} <bdi dir="ltr">{p.to}</bdi>
        {items.length ? <bdi className="ms-3 text-xs font-normal text-white/60">({summaryLine(items, lang)})</bdi> : null}
      </div>
      {p.problems.length ? (
        <ul className="space-y-1 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" data-testid="feature-upgrade-problems">
          {p.problems.map((x, k) => (
            <li key={k}>{problemText(x, lang)}</li>
          ))}
        </ul>
      ) : null}
      {items.length ? (
        <ul className="divide-y divide-white/10 rounded-xl border border-white/10" data-testid="feature-upgrade-items">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 p-3" data-testid={`feature-upgrade-item-${i.id}`} data-action={i.action}>
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm">
                  <span className="text-white/50">{kindName(i.kind, lang)} · </span>
                  {i.name}
                </div>
                <div className="text-xs text-white/60">{actionMeans(i.action, lang)}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={BADGE[i.action]} size="sm">
                  {actionName(i.action, lang)}
                </Badge>
                {i.action === "conflict" || i.action === "taken" ? (
                  <label className="flex items-center gap-1 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={take.has(i.id)}
                      onChange={(e) => {
                        const next = new Set(take);
                        if (e.target.checked) next.add(i.id);
                        else next.delete(i.id);
                        setTake(next);
                      }}
                      data-testid={`feature-upgrade-take-${i.id}`}
                    />
                    {say("خد نسخة القالب|Take the template's|לקחת את של התבנית")}
                  </label>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/60">{say("ما في شي بيتغيّر بالنسخة الجديدة، غير رقمها.|Nothing changes in the new version but its number.|שום דבר לא משתנה בגרסה החדשה חוץ מהמספר.")}</p>
      )}
      <Button size="sm" variant="primary" disabled={!p.ok} isLoading={run.isPending} onClick={() => run.mutate()} data-testid="feature-upgrade-go">
        {say("رقّي لـ {v}|Upgrade to {v}|שדרוג ל-{v}").replace("{v}", p.to)}
      </Button>
    </div>
  );
}
