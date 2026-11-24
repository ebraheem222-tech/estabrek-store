/**
 * The Variables panel (Styles tab): the store's colours, fonts, font sizes, spaces, corners and shadows by
 * name. An element takes one by name ("$brand"), so changing it here changes every page once it's
 * published. Changes are a draft the editor's preview shows first.
 */
import { useState } from "react";
import { adminLang } from "../lib/lang";
import { say } from "./say";
import { useTreeFonts } from "./TypePanels";
import { newTokenId, TOKEN_GROUP_NAMES, tokenName, withGroup, type DesignTokens, type TokenGroup } from "./designTokens";
import { starterTokens } from "./tokenSets";
import { HARMONIES, harmony, SCALE_RATIOS, type ContrastGrade, type Harmony } from "../../../shared/colour";
import { matesToAdd, readings, SIZE_MAX, SIZE_MIN, sizesOnScale, spacesOnScale, tonesToAdd, weakGrounds } from "./variableMaths";
export { starterTokens };

type Api = { tokens: DesignTokens; hasDraft: boolean; busy: boolean; save: (t: DesignTokens) => Promise<boolean>; publish: () => Promise<boolean>; drop: () => Promise<boolean> };
const btn = "rounded-lg bg-white/6 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40";
const input = "w-full min-w-0 rounded-md border border-white/10 bg-surface-925 px-1.5 py-1 text-xs text-white";
const GROUPS: TokenGroup[] = ["colors", "fonts", "sizes", "spaces", "radii", "shadows"];
/** The ready set's font sizes: a store that has variables but no sizes yet gets these names with its scale. */
const READY_SIZES = starterTokens([]).sizes;
/** What a contrast is good for, in words (shared/colour.ts contrastGrade). */
const GRADE_NAMES: Record<ContrastGrade, string> = {
  AAA: "ممتاز لأي نص|Excellent for any text|מצוין לכל טקסט",
  AA: "منيح للنص|Good for text|טוב לטקסט",
  large: "للخط الكبير والحدود بس|Big text and edges only|לטקסט גדול ולקווים בלבד",
  fail: "ما بينقرأ|Doesn't read|לא קריא",
};
const HARMONY_NAMES: Record<Harmony, string> = {
  complement: "اللون المقابل|Its opposite|הצבע הנגדי",
  neighbours: "جيرانه|Its neighbours|השכנים שלו",
  triad: "ثلاثي|A triad|שלישייה",
  split: "مقابل مقسوم|Split opposite|נגדי מפוצל",
};

export function VariablesPanel({ api, canPublish }: { api: Api; canPublish: boolean }) {
  const fonts = useTreeFonts();
  const [open, setOpen] = useState<TokenGroup>("colors");
  // The scale the spaces can be put on: the smallest one, and what each next one is multiplied by.
  const [scale, setScale] = useState({ base: 4, ratio: 1.5 });
  // The scale the font sizes can be put on: the smallest size, and what each next one is multiplied by.
  const [sizeScale, setSizeScale] = useState({ base: 13, ratio: 1.25 });
  const t = api.tokens;
  const lang = adminLang();
  const empty = GROUPS.every((g) => !t[g].length);
  type Item = DesignTokens[TokenGroup][number];
  const set = (group: TokenGroup, i: number, patch: Partial<Item>) => void api.save(withGroup(t, group, (t[group] as Item[]).map((x, j) => (j === i ? { ...x, ...patch } : x)) as never));
  const drop = (group: TokenGroup, i: number) => void api.save(withGroup(t, group, (t[group] as Item[]).filter((_, j) => j !== i) as never));
  const add = (group: TokenGroup) => {
    const name = say({ colors: "لون جديد|New colour|צבע חדש", fonts: "خط جديد|New font|גופן חדש", spaces: "مسافة جديدة|New space|מרווח חדש", radii: "زاوية جديدة|New corner|פינה חדשה", shadows: "ظل جديد|New shadow|צל חדש", sizes: "حجم خط جديد|New font size|גודל גופן חדש" }[group]);
    const id = newTokenId(t, group, { colors: "colour", fonts: "font", spaces: "space", radii: "corner", shadows: "shadow", sizes: "size" }[group]);
    const item = { colors: { id, name: { [lang]: name }, value: "#c86b98" }, fonts: { id, name: { [lang]: name }, family: fonts[0]?.slug ?? "inter" }, spaces: { id, name: { [lang]: name }, value: 24 }, radii: { id, name: { [lang]: name }, value: 16 }, shadows: { id, name: { [lang]: name }, x: 0, y: 10, blur: 30, spread: -10, color: "#00000040" }, sizes: { id, name: { [lang]: name }, value: 16 } }[group];
    void api.save(withGroup(t, group, [...(t[group] as Item[]), item] as never));
  };
  const num = (v: string, min: number, max: number) => { const x = Number(v); return Number.isFinite(x) ? Math.max(min, Math.min(max, x)) : null; };
  return (
    <div className="space-y-2" data-testid="studio-variables">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-medium text-white/80">{say("المتغيرات|Variables|משתנים")}</span>
        {api.hasDraft ? <span className="text-[10px] text-amber-200/80">{say("مسودة|Draft|טיוטה")}</span> : null}
      </div>
      <p className="px-1 text-[11px] leading-5 text-white/45">{say("لون أو خط أو مسافة بإسم: أي عنصر بياخده بالإسم، وتغييره هون بيغيّر كل الصفحات.|A colour, font or space by name: any element takes it by name, and changing it here changes every page.|צבע, גופן או מרווח בשם: כל אובייקט לוקח אותו בשם, ושינוי כאן משנה את כל הדפים.")}</p>
      {empty ? <button type="button" className={`${btn} w-full`} disabled={api.busy} onClick={() => void api.save(starterTokens(fonts.map((f) => f.slug)))} data-testid="variables-starter">✦ {say("ابدأ بمجموعة جاهزة|Start from a ready set|התחל מסט מוכן")}</button> : null}
      <div className="flex flex-wrap gap-1" role="tablist">
        {GROUPS.map((g) => <button key={g} type="button" role="tab" aria-selected={open === g} className={`rounded-md px-2 py-1 text-[11px] ${open === g ? "bg-accent-500/20 text-white" : "text-white/60 hover:bg-white/6"}`} onClick={() => setOpen(g)} data-testid={`variables-tab-${g}`}>{say(TOKEN_GROUP_NAMES[g])} <span className="text-white/35">{t[g].length}</span></button>)}
      </div>
      <div className="space-y-1.5" data-testid={`variables-${open}`}>
        {open === "colors" && t.colors.length && weakGrounds(t) !== null ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] leading-5 text-amber-100" data-testid="variables-weak">
            {say("لون الحبر على لون الورق بينقرأ بصعوبة|Your ink hardly reads on your paper|הדיו שלך כמעט לא נקרא על הנייר שלך")} (<span dir="ltr">{weakGrounds(t)!.toFixed(1)}</span>): {say("النص بدو 4.5 وطالع|text needs 4.5 or more|טקסט צריך 4.5 ומעלה")}
          </p>
        ) : null}
        {open === "sizes" ? (() => {
          const next = sizesOnScale(t, sizeScale.base, sizeScale.ratio, READY_SIZES);
          return (
            <div className="space-y-1 rounded-lg border border-white/6 p-1.5" data-testid="variables-size-scale">
              <div className="text-[11px] leading-5 text-white/60">{say("سلّم أحجام: كل حجم قد اللي قبله مضروب بنسبة ثابتة، من الأصغر للأكبر|A scale of sizes: each one is the one before it times a fixed ratio, smallest first|סולם גדלים: כל גודל הוא הקודם כפול יחס קבוע, מהקטן לגדול")}</div>
              <div className="flex gap-1">
                <input type="number" className={input} min={SIZE_MIN} max={40} value={sizeScale.base} aria-label={say("أصغر حجم|The smallest size|הגודל הקטן ביותר")} title={say("أصغر حجم|The smallest size|הגודל הקטן ביותר")} onChange={(e) => { const v = num(e.target.value, SIZE_MIN, 40); if (v !== null) setSizeScale({ ...sizeScale, base: v }); }} data-testid="variables-size-scale-base" />
                <select className={input} value={sizeScale.ratio} aria-label={say("النسبة|The ratio|היחס")} onChange={(e) => setSizeScale({ ...sizeScale, ratio: Number(e.target.value) })} data-testid="variables-size-scale-ratio">
                  {SCALE_RATIOS.map((r) => <option key={r.id} value={r.ratio}>× {Math.round(r.ratio * 1000) / 1000}{r.id === "golden" ? ` · ${say("النسبة الذهبية|Golden ratio|יחס הזהב")}` : ""}</option>)}
                </select>
              </div>
              <div className="text-[10px] text-white/45" data-testid="variables-size-scale-preview">{next ? <span dir="ltr">{next.sizes.map((x) => x.value).join(" · ")}</span> : say("هالنسبة بتطلع فوق 200 قبل آخر حجم: صغّر النسبة أو أصغر حجم|This ratio passes 200 before the last size: lower the ratio or the smallest size|היחס הזה עובר 200 לפני הגודל האחרון: הקטן את היחס או את הגודל הקטן ביותר")}</div>
              <button type="button" className={`${btn} w-full`} disabled={api.busy || !next} onClick={() => { if (next) void api.save(next); }} data-testid="variables-size-scale-apply">{say("حط الأحجام على هالسلّم|Put the sizes on this scale|שים את הגדלים על הסולם הזה")}</button>
            </div>
          );
        })() : null}
        {open === "spaces" ? (() => {
          const next = spacesOnScale(t, scale.base, scale.ratio);
          return (
            <div className="space-y-1 rounded-lg border border-white/6 p-1.5" data-testid="variables-scale">
              <div className="text-[11px] leading-5 text-white/60">{say("سلّم مسافات: كل مسافة قد اللي قبلها مضروبة بنسبة ثابتة|A scale of spaces: each one is the one before it times a fixed ratio|סולם מרווחים: כל מרווח הוא הקודם כפול יחס קבוע")}</div>
              <div className="flex gap-1">
                <input type="number" className={input} min={1} max={64} value={scale.base} aria-label={say("أصغر مسافة|The smallest space|המרווח הקטן ביותר")} title={say("أصغر مسافة|The smallest space|המרווח הקטן ביותר")} onChange={(e) => { const v = num(e.target.value, 1, 64); if (v !== null) setScale({ ...scale, base: v }); }} data-testid="variables-scale-base" />
                <select className={input} value={scale.ratio} aria-label={say("النسبة|The ratio|היחס")} onChange={(e) => setScale({ ...scale, ratio: Number(e.target.value) })} data-testid="variables-scale-ratio">
                  {SCALE_RATIOS.map((r) => <option key={r.id} value={r.ratio}>× {Math.round(r.ratio * 1000) / 1000}{r.id === "golden" ? ` · ${say("النسبة الذهبية|Golden ratio|יחס הזהב")}` : ""}</option>)}
                </select>
              </div>
              <div className="text-[10px] text-white/45" data-testid="variables-scale-preview">{next ? <span dir="ltr">{next.spaces.map((x) => x.value).join(" · ")}</span> : say("هالنسبة بتطلع فوق 400 قبل آخر مسافة: صغّر النسبة أو أصغر مسافة|This ratio passes 400 before the last space: lower the ratio or the smallest space|היחס הזה עובר 400 לפני המרווח האחרון: הקטן את היחס או את המרווח הקטן ביותר")}</div>
              <button type="button" className={`${btn} w-full`} disabled={api.busy || !next} onClick={() => { if (next) void api.save(next); }} data-testid="variables-scale-apply">{say("حط المسافات على هالسلّم|Put the spaces on this scale|שים את המרווחים על הסולם הזה")}</button>
            </div>
          );
        })() : null}
        {(t[open] as Item[]).map((x, i) => (
          <div key={x.id} className="space-y-1 rounded-lg border border-white/6 p-1.5" data-token={x.id}>
            <div className="flex items-center gap-1">
              <input key={`${x.id}:${tokenName(x)}`} className={input} defaultValue={tokenName(x)} aria-label={say("الإسم|Name|שם")} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== tokenName(x)) set(open, i, { name: { ...(x.name ?? {}), [lang]: v.slice(0, 60) } }); }} data-testid="variable-name" />
              <code className="shrink-0 text-[10px] text-white/35" dir="ltr">${x.id}</code>
              <button type="button" className="shrink-0 px-1 text-red-300/80 hover:text-red-300" disabled={api.busy} aria-label={say("احذف|Delete|מחק")} onClick={() => drop(open, i)} data-testid="variable-delete">×</button>
            </div>
            {open === "colors" ? <input type="color" className="h-7 w-full cursor-pointer rounded-sm border border-white/10 bg-transparent" disabled={api.busy} defaultValue={(x as DesignTokens["colors"][number]).value.slice(0, 7)} onBlur={(e) => set(open, i, { value: e.target.value } as never)} data-testid="variable-colour" /> : null}
            {open === "colors" ? (() => {
              const c = x as DesignTokens["colors"][number];
              const tones = tonesToAdd(t, c, (step) => ({ [lang]: `${tokenName(c)} ${step}`.slice(0, 60) }));
              return (
                <div className="space-y-1" data-testid="variable-maths">
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-white/60">
                    {readings(t, c.value).map((r) => (
                      <span key={r.on} className={`inline-flex items-center gap-1 rounded-md border px-1 py-0.5 ${r.grade === "fail" ? "border-amber-400/40 text-amber-200/90" : "border-white/8"}`}
                        title={`${r.on === "paper" ? say("مع لون الورق|With the paper colour|עם צבע הנייר") : say("مع لون الحبر|With the ink colour|עם צבע הדיו")}: ${say(GRADE_NAMES[r.grade])}`} data-testid="variable-reading" data-on={r.on} data-grade={r.grade} data-best={r.best ? "1" : undefined}>
                        <span className="rounded-sm px-1 font-semibold" style={{ background: r.ground, color: c.value.slice(0, 7) }}>Aa</span>
                        <span dir="ltr">{r.ratio.toFixed(1)}</span>
                        <span>{say(GRADE_NAMES[r.grade])}</span>
                        {r.best ? <span aria-hidden>✓</span> : null}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className={`${btn} flex-1`} disabled={api.busy || !tones.length} title={say("بيزيد درجات هاللون من الفاتح للغامق كمتغيرات|Adds this colour's tones, light to dark, as variables|מוסיף את גווני הצבע, מבהיר לכהה, כמשתנים")}
                      onClick={() => void api.save(withGroup(t, "colors", [...t.colors, ...tones]))} data-testid="variable-tones">✦ {say("درجاته|Its tones|הגוונים שלו")}{tones.length ? ` +${tones.length}` : ""}</button>
                    <select className={`${input} flex-1`} disabled={api.busy || !harmony(c.value, "complement").length} value="" aria-label={say("ألوان بتلبق معه|Colours that go with it|צבעים שמתאימים לו")}
                      onChange={(e) => {
                        const kind = e.target.value as Harmony;
                        const mates = matesToAdd(t, c, kind, (n) => ({ [lang]: `${tokenName(c)} · ${say(HARMONY_NAMES[kind])}${n ? ` ${n + 1}` : ""}`.slice(0, 60) }));
                        if (mates.length) void api.save(withGroup(t, "colors", [...t.colors, ...mates]));
                      }} data-testid="variable-mates">
                      <option value="">{say("بيلبق معه…|Goes with…|מתאים לו…")}</option>
                      {HARMONIES.map((k) => <option key={k} value={k}>{say(HARMONY_NAMES[k])}</option>)}
                    </select>
                  </div>
                </div>
              );
            })() : null}
            {open === "fonts" ? <select className={input} disabled={api.busy} value={(x as DesignTokens["fonts"][number]).family} onChange={(e) => set(open, i, { family: e.target.value } as never)} data-testid="variable-font">{[...new Set([(x as DesignTokens["fonts"][number]).family, ...fonts.map((f) => f.slug)])].map((slug) => <option key={slug} value={slug}>{fonts.find((f) => f.slug === slug)?.name ?? slug}</option>)}</select> : null}
            {open === "spaces" || open === "radii" || open === "sizes" ? <input key={`${x.id}:${(x as DesignTokens["spaces"][number]).value}`} type="number" className={input} disabled={api.busy} min={open === "sizes" ? SIZE_MIN : 0} max={open === "spaces" ? 400 : open === "sizes" ? SIZE_MAX : 999} defaultValue={(x as DesignTokens["spaces"][number]).value} onBlur={(e) => { const v = num(e.target.value, open === "sizes" ? SIZE_MIN : 0, open === "spaces" ? 400 : open === "sizes" ? SIZE_MAX : 999); if (v !== null) set(open, i, { value: v } as never); }} data-testid="variable-number" /> : null}
            {open === "sizes" ? <div className="truncate leading-tight text-white/80" style={{ fontSize: Math.min((x as DesignTokens["sizes"][number]).value, 44) }} title={`${(x as DesignTokens["sizes"][number]).value}px`} data-testid="variable-size-sample">{say("أبجد هوّز|Aa Bb Cc|אבג דהו")}</div> : null}
            {open === "shadows" ? (() => {
              const s = x as DesignTokens["shadows"][number];
              return (
                <div className="grid grid-cols-4 gap-1">
                  {(["x", "y", "blur", "spread"] as const).map((k) => <input key={k} type="number" className={input} aria-label={k} title={k} disabled={api.busy} defaultValue={s[k] ?? 0} onBlur={(e) => { const v = num(e.target.value, k === "blur" ? 0 : -100, k === "blur" ? 200 : 100); if (v !== null) set(open, i, { [k]: v } as never); }} data-testid={`variable-shadow-${k}`} />)}
                  <input type="color" className="col-span-4 h-7 w-full cursor-pointer rounded-sm border border-white/10 bg-transparent" disabled={api.busy} defaultValue={s.color.slice(0, 7)} onBlur={(e) => set(open, i, { color: `${e.target.value}${s.color.length === 9 ? s.color.slice(7) : ""}` } as never)} />
                </div>
              );
            })() : null}
          </div>
        ))}
        <button type="button" className={`${btn} w-full`} disabled={api.busy} onClick={() => add(open)} data-testid={`variables-add-${open}`}>+ {say("زيد|Add|הוסף")}</button>
      </div>
      {api.hasDraft ? (
        <div className="flex gap-1">
          <button type="button" className="flex-1 rounded-lg bg-accent-500 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40" disabled={api.busy || !canPublish} onClick={() => void api.publish()} data-testid="variables-publish">{say("انشر المتغيرات|Publish the variables|פרסם את המשתנים")}</button>
          <button type="button" className={btn} disabled={api.busy} onClick={() => void api.drop()} data-testid="variables-drop">{say("تراجع|Drop|בטל")}</button>
        </div>
      ) : null}
    </div>
  );
}
