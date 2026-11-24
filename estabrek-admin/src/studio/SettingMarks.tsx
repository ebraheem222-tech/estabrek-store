/**
 * A whole site's element tied to one of its site's settings (sites wave 1; backend lib/siteSettings.ts): shown on
 * the shop only while a setting is a value (props.showIf), or its words taken from a setting (props.fromSetting).
 * The editor always shows the element with its own words; here the owner reads what the shop does with it, and
 * may untie it (then it shows always, in the words written here). One change = one step back with undo.
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { say } from "./say";
import { marksOf, type ShowIf } from "./settingMarksOf";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const btn = "rounded-lg bg-white/6 px-2 py-1 text-[11px] hover:bg-white/10 disabled:opacity-40";

/** What the shop does with it, in words. */
function showsWhen(s: ShowIf): string {
  const key = `«${s.setting}»`;
  if (s.is === undefined || s.is === true) return say("بيبيّن بالمتجر بس لما إعداد الموقع {key} شغّال.|Shows on the shop only while the site's setting {key} is on.|מוצג בחנות רק כשהגדרת האתר {key} פועלת.").replace("{key}", key);
  if (s.is === false) return say("بيبيّن بالمتجر بس لما إعداد الموقع {key} مطفّى.|Shows on the shop only while the site's setting {key} is off.|מוצג בחנות רק כשהגדרת האתר {key} כבויה.").replace("{key}", key);
  return say("بيبيّن بالمتجر بس لما إعداد الموقع {key} هو «{is}».|Shows on the shop only while the site's setting {key} is “{is}”.|מוצג בחנות רק כשהגדרת האתר {key} היא «{is}».").replace("{key}", key).replace("{is}", String(s.is));
}

export function SettingMarks({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const { showIf, fromSetting } = marksOf(node);
  const words = Object.entries(fromSetting);
  if (!showIf && !words.length) return null;
  const untie = (prop: "showIf" | "fromSetting") => {
    if (busy) return;
    const rest = Object.fromEntries(Object.entries((node.props ?? {}) as Record<string, unknown>).filter(([k]) => k !== prop));
    onOps(say("فكّ الربط بإعداد الموقع|Untie from the site's setting|ניתוק מהגדרת האתר"), [{ op: "setProps", nodeId: node.id, props: rest }]);
  };
  return (
    <div className="space-y-2 rounded-xl border border-sky-400/20 bg-sky-400/6 p-3 text-[11px] leading-4 text-sky-100/90" data-testid="studio-setting-marks">
      <div className="text-xs font-medium text-sky-100">{say("مربوط بإعدادات الموقع|Tied to the site's settings|מחובר להגדרות האתר")}</div>
      {showIf ? (
        <div className="flex items-start justify-between gap-2" data-testid="studio-setting-show" data-setting={showIf.setting}>
          <span>{showsWhen(showIf)}</span>
          <button type="button" className={btn} disabled={busy} onClick={() => untie("showIf")} data-testid="studio-setting-show-untie">{say("خلّيه يبيّن دايماً|Always show it|להציג תמיד")}</button>
        </div>
      ) : null}
      {words.length ? (
        <div className="flex items-start justify-between gap-2" data-testid="studio-setting-words" data-setting={words.map(([, k]) => k).join(",")}>
          <span>
            {say("كلامه بالمتجر من إعداد الموقع {keys}: بيتغيّر من ميزاتي ← الموقع ← إعدادات الموقع. اللي مكتوب هون ما بيبيّن بالمتجر.|On the shop its words come from the site's setting {keys}: change them in My features → the site → its settings. What is written here doesn't show on the shop.|בחנות המילים שלו מגיעות מהגדרת האתר {keys}: משנים אותן בתכונות שלי ← האתר ← ההגדרות. מה שכתוב כאן לא מוצג בחנות.").replace("{keys}", words.map(([, k]) => `«${k}»`).join("، "))}
          </span>
          <button type="button" className={btn} disabled={busy} onClick={() => untie("fromSetting")} data-testid="studio-setting-words-untie">{say("اكتبه هون|Write it here|לכתוב כאן")}</button>
        </div>
      ) : null}
    </div>
  );
}
