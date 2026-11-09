/**
 * The Variables panel (Styles tab): the store's colours, fonts, spaces, corners and shadows by
 * name. An element takes one by name ("$brand"), so changing it here changes every page once it's
 * published. Changes are a draft the editor's preview shows first.
 */
import { useState } from "react";
import { adminLang } from "../lib/lang";
import { say } from "./say";
import { useTreeFonts } from "./TypePanels";
import { newTokenId, TOKEN_GROUP_NAMES, tokenName, withGroup, type DesignTokens, type TokenGroup } from "./designTokens";
import { starterTokens } from "./tokenSets";
export { starterTokens };

type Api = { tokens: DesignTokens; hasDraft: boolean; busy: boolean; save: (t: DesignTokens) => Promise<boolean>; publish: () => Promise<boolean>; drop: () => Promise<boolean> };
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const input = "w-full min-w-0 rounded-md border border-white/[0.1] bg-surface-925 px-1.5 py-1 text-xs text-white";
const GROUPS: TokenGroup[] = ["colors", "fonts", "spaces", "radii", "shadows"];

export function VariablesPanel({ api, canPublish }: { api: Api; canPublish: boolean }) {
  const fonts = useTreeFonts();
  const [open, setOpen] = useState<TokenGroup>("colors");
  const t = api.tokens;
  const lang = adminLang();
  const empty = GROUPS.every((g) => !t[g].length);
  type Item = DesignTokens[TokenGroup][number];
  const set = (group: TokenGroup, i: number, patch: Partial<Item>) => void api.save(withGroup(t, group, (t[group] as Item[]).map((x, j) => (j === i ? { ...x, ...patch } : x)) as never));
  const drop = (group: TokenGroup, i: number) => void api.save(withGroup(t, group, (t[group] as Item[]).filter((_, j) => j !== i) as never));
  const add = (group: TokenGroup) => {
    const name = say({ colors: "لون جديد|New colour|צבע חדש", fonts: "خط جديد|New font|גופן חדש", spaces: "مسافة جديدة|New space|מרווח חדש", radii: "زاوية جديدة|New corner|פינה חדשה", shadows: "ظل جديد|New shadow|צל חדש" }[group]);
    const id = newTokenId(t, group, { colors: "colour", fonts: "font", spaces: "space", radii: "corner", shadows: "shadow" }[group]);
    const item = { colors: { id, name: { [lang]: name }, value: "#c86b98" }, fonts: { id, name: { [lang]: name }, family: fonts[0]?.slug ?? "inter" }, spaces: { id, name: { [lang]: name }, value: 24 }, radii: { id, name: { [lang]: name }, value: 16 }, shadows: { id, name: { [lang]: name }, x: 0, y: 10, blur: 30, spread: -10, color: "#00000040" } }[group];
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
        {GROUPS.map((g) => <button key={g} type="button" role="tab" aria-selected={open === g} className={`rounded-md px-2 py-1 text-[11px] ${open === g ? "bg-accent-500/20 text-white" : "text-white/60 hover:bg-white/[0.06]"}`} onClick={() => setOpen(g)} data-testid={`variables-tab-${g}`}>{say(TOKEN_GROUP_NAMES[g])} <span className="text-white/35">{t[g].length}</span></button>)}
      </div>
      <div className="space-y-1.5" data-testid={`variables-${open}`}>
        {(t[open] as Item[]).map((x, i) => (
          <div key={x.id} className="space-y-1 rounded-lg border border-white/[0.06] p-1.5" data-token={x.id}>
            <div className="flex items-center gap-1">
              <input key={`${x.id}:${tokenName(x)}`} className={input} defaultValue={tokenName(x)} aria-label={say("الإسم|Name|שם")} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== tokenName(x)) set(open, i, { name: { ...(x.name ?? {}), [lang]: v.slice(0, 60) } }); }} data-testid="variable-name" />
              <code className="shrink-0 text-[10px] text-white/35" dir="ltr">${x.id}</code>
              <button type="button" className="shrink-0 px-1 text-red-300/80 hover:text-red-300" disabled={api.busy} aria-label={say("احذف|Delete|מחק")} onClick={() => drop(open, i)} data-testid="variable-delete">×</button>
            </div>
            {open === "colors" ? <input type="color" className="h-7 w-full cursor-pointer rounded border border-white/[0.1] bg-transparent" disabled={api.busy} defaultValue={(x as DesignTokens["colors"][number]).value.slice(0, 7)} onBlur={(e) => set(open, i, { value: e.target.value } as never)} data-testid="variable-colour" /> : null}
            {open === "fonts" ? <select className={input} disabled={api.busy} value={(x as DesignTokens["fonts"][number]).family} onChange={(e) => set(open, i, { family: e.target.value } as never)} data-testid="variable-font">{[...new Set([(x as DesignTokens["fonts"][number]).family, ...fonts.map((f) => f.slug)])].map((slug) => <option key={slug} value={slug}>{fonts.find((f) => f.slug === slug)?.name ?? slug}</option>)}</select> : null}
            {open === "spaces" || open === "radii" ? <input type="number" className={input} disabled={api.busy} min={0} max={open === "spaces" ? 400 : 999} defaultValue={(x as DesignTokens["spaces"][number]).value} onBlur={(e) => { const v = num(e.target.value, 0, open === "spaces" ? 400 : 999); if (v !== null) set(open, i, { value: v } as never); }} data-testid="variable-number" /> : null}
            {open === "shadows" ? (() => {
              const s = x as DesignTokens["shadows"][number];
              return (
                <div className="grid grid-cols-4 gap-1">
                  {(["x", "y", "blur", "spread"] as const).map((k) => <input key={k} type="number" className={input} aria-label={k} title={k} disabled={api.busy} defaultValue={s[k] ?? 0} onBlur={(e) => { const v = num(e.target.value, k === "blur" ? 0 : -100, k === "blur" ? 200 : 100); if (v !== null) set(open, i, { [k]: v } as never); }} data-testid={`variable-shadow-${k}`} />)}
                  <input type="color" className="col-span-4 h-7 w-full cursor-pointer rounded border border-white/[0.1] bg-transparent" disabled={api.busy} defaultValue={s.color.slice(0, 7)} onBlur={(e) => set(open, i, { color: `${e.target.value}${s.color.length === 9 ? s.color.slice(7) : ""}` } as never)} />
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
