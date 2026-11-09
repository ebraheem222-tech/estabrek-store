/**
 * Main components in the editor (W2; backend lib/componentTree.ts): make one of an element, add
 * instances, pick an instance's variant, change its own words and links, open the main component
 * to change every page, or detach an instance into a plain copy. Pure helpers are tested in
 * components.test.tsx.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listComponents, type ComponentInfo, type PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { say } from "./say";

export const useComponents = () => useQuery({ queryKey: ["page-components"], queryFn: listComponents, staleTime: 30_000, retry: false });

const box = "space-y-2 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const input = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";

type Overrides = Record<string, Record<string, unknown>>;
/** What an instance can change in an inner element: its words and its link. */
export type OverrideField = { nodeId: string; key: "text" | "label" | "href" | "alt"; kind: "words" | "link"; label: string; value: unknown };

const wordsOf = (t: unknown, lang: Lang) => (t && typeof t === "object" ? String((t as Record<string, string>)[lang] ?? "") : typeof t === "string" ? t : "");

/** The fields an instance of `variant` can change, in its tree order. */
export function overrideFields(variant: PageTreeNode): OverrideField[] {
  const out: OverrideField[] = [];
  const walk = (n: PageTreeNode) => {
    const name = n.name || n.type;
    if (n.type === "heading" || n.type === "text") out.push({ nodeId: n.id, key: "text", kind: "words", label: name, value: n.props.text });
    if (n.type === "button") {
      out.push({ nodeId: n.id, key: "label", kind: "words", label: name, value: n.props.label });
      out.push({ nodeId: n.id, key: "href", kind: "link", label: name, value: n.props.href });
    }
    if (n.type === "image") out.push({ nodeId: n.id, key: "alt", kind: "words", label: name, value: n.props.alt });
    n.children?.forEach(walk);
  };
  walk(variant);
  return out;
}

/** The instance's overrides with one field changed (back to the main component's when it's the same again). */
export function withOverride(overrides: Overrides, field: OverrideField, lang: Lang, value: string): Overrides {
  const own = { ...(overrides[field.nodeId] ?? {}) };
  if (field.kind === "link") {
    if (!value.trim() || value.trim() === field.value) delete own[field.key];
    else own[field.key] = value.trim();
  } else {
    const base = (own[field.key] ?? field.value ?? {}) as Record<string, string>;
    const next = { ...(typeof base === "object" ? base : {}), [lang]: value };
    if (!value.trim()) delete next[lang];
    const same = JSON.stringify(next) === JSON.stringify(field.value ?? {});
    if (same || !Object.keys(next).length) delete own[field.key];
    else own[field.key] = next;
  }
  const out = { ...overrides };
  if (Object.keys(own).length) out[field.nodeId] = own;
  else delete out[field.nodeId];
  return out;
}

/** A plain copy of an instance (detached): the variant with its overrides, new ids, the instance's place. */
export function detached(instance: PageTreeNode, variant: PageTreeNode, ids: (prefix: string) => string): PageTreeNode {
  const overrides = (instance.props.overrides ?? {}) as Overrides;
  const walk = (n: PageTreeNode, top: boolean): PageTreeNode => {
    const props = { ...structuredClone(n.props), ...(overrides[n.id] ?? {}) };
    return { ...structuredClone(n), id: top ? instance.id : ids(n.type.slice(0, 4)), props, children: n.children?.map((c) => walk(c, false)) };
  };
  const out = walk(variant, true);
  const style: Record<string, Record<string, unknown>> = {};
  for (const screen of new Set([...Object.keys(variant.style ?? {}), ...Object.keys(instance.style ?? {})])) style[screen] = { ...((variant.style as Record<string, Record<string, unknown>> | undefined)?.[screen] ?? {}), ...((instance.style as Record<string, Record<string, unknown>> | undefined)?.[screen] ?? {}) };
  if (Object.keys(style).length) out.style = style;
  if (instance.name) out.name = instance.name;
  return out;
}

/** A new instance of a component (its first variant, unless one is given). */
export const newInstance = (c: ComponentInfo, ids: (prefix: string) => string, variant?: string): PageTreeNode => ({ id: ids("comp"), type: "component", name: c.name, props: { componentId: c.id, ...(variant ? { variant } : {}) } });

/** The element's place on its page (stays on the instance); the rest of its look goes to the component. */
export function placeOnly(style: PageTreeNode["style"]): PageTreeNode["style"] | undefined {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [screen, s] of Object.entries((style ?? {}) as Record<string, Record<string, unknown> | undefined>)) if (s?.layer) out[screen] = { layer: s.layer };
  return Object.keys(out).length ? out : undefined;
}

/** Turning the selected element into a main component. */
export function MakeComponentPanel({ node, busy, onMake }: { node: PageTreeNode; busy: boolean; onMake: (name: string) => Promise<void> }) {
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (name === null) return <button type="button" className={`${btn} w-full`} disabled={busy} onClick={() => setName(node.name ?? "")} data-testid="component-make-open">◇ {say("اعمله مكوّن رئيسي (يتغيّر بكل الصفحات)|Make it a main component (changes on every page)|הפוך לרכיב ראשי (משתנה בכל הדפים)")}</button>;
  return (
    <form className={box} data-testid="component-make" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; setSaving(true); try { await onMake(name.trim()); setName(null); } finally { setSaving(false); } }}>
      <label className="block text-[11px] text-white/55">{say("إسم المكوّن|The component's name|שם הרכיב")}<input className={input} value={name} autoFocus maxLength={80} onChange={(e) => setName(e.target.value)} data-testid="component-make-name" /></label>
      <div className="flex gap-1">
        <button type="submit" className="flex-1 rounded-lg bg-accent-500 px-2 py-1.5 text-xs text-white disabled:opacity-40" disabled={busy || saving || !name.trim()} data-testid="component-make-save">{say("اعمله|Make it|צור")}</button>
        <button type="button" className={btn} onClick={() => setName(null)}>{say("إلغاء|Cancel|ביטול")}</button>
      </div>
    </form>
  );
}

/** A selected instance: its component, variant, own changes, and the ways back to the main one. */
export function ComponentInstancePanel({ node, components, lang, busy, onProps, onEdit, onDetach }: { node: PageTreeNode; components: ComponentInfo[] | undefined; lang: Lang; busy: boolean; onProps: (props: Record<string, unknown>) => void; onEdit: (id: string) => void; onDetach: (variant: PageTreeNode) => void }) {
  const c = components?.find((x) => x.id === node.props.componentId);
  const overrides = (node.props.overrides ?? {}) as Overrides;
  if (!c) return <div className={box} data-testid="component-instance"><p className="text-xs text-amber-100/70">{components ? say("المكوّن الرئيسي انحذف أو لسا ما انتشر.|The main component was deleted or isn't published yet.|הרכיב הראשי נמחק או עדיין לא פורסם.") : say("عم نجيب المكوّنات…|Loading the components…|טוען רכיבים…")}</p></div>;
  const variant = c.variants.find((v) => v.id === node.props.variant) ?? c.variants[0];
  const fields = variant ? overrideFields(variant.node) : [];
  const changed = Object.keys(overrides).length;
  return (
    <div className={box} data-testid="component-instance">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/85">◇ {c.name}</span>
        <span className="text-[10px] text-white/40">{say(`بـ ${c.uses} صفحات|On ${c.uses} pages|ב-${c.uses} דפים`)}</span>
      </div>
      {c.variants.length > 1 ? (
        <label className="block text-[11px] text-white/55">{say("النسخة|Variant|גרסה")}
          <select className={input} disabled={busy} value={variant?.id ?? ""} onChange={(e) => onProps({ ...node.props, variant: e.target.value === c.variants[0].id ? undefined : e.target.value })} data-testid="component-variant">
            {c.variants.map((v) => <option key={v.id} value={v.id}>{v.name ?? v.id}</option>)}
          </select>
        </label>
      ) : null}
      {fields.length ? <div className="space-y-1.5" data-testid="component-overrides">
        <div className="text-[11px] text-white/55">{say("تغييرات هالنسخة بس|Changes for this one only|שינויים רק לעותק הזה")}</div>
        {fields.map((f) => {
          const own = overrides[f.nodeId]?.[f.key];
          const shown = f.kind === "link" ? String(own ?? f.value ?? "") : wordsOf(own ?? f.value, lang);
          return (
            <label key={`${f.nodeId}.${f.key}`} className="block text-[11px] text-white/45">
              {f.label} · {f.kind === "link" ? say("رابط|link|קישור") : say("كلام|words|טקסט")}{own !== undefined ? <span className="text-accent-300"> ●</span> : null}
              <input key={`${f.nodeId}.${f.key}:${shown}`} className={input} defaultValue={shown} disabled={busy} dir={f.kind === "link" ? "ltr" : undefined} onBlur={(e) => { if (e.target.value !== shown) onProps({ ...node.props, overrides: withOverride(overrides, f, lang, e.target.value) }); }} data-testid={`component-override-${f.nodeId}-${f.key}`} />
            </label>
          );
        })}
      </div> : null}
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} disabled={busy} onClick={() => onEdit(c.id)} data-testid="component-edit">✎ {say("عدّل المكوّن الرئيسي|Edit the main component|ערוך את הרכיב הראשי")}</button>
        {changed ? <button type="button" className={btn} disabled={busy} onClick={() => onProps({ ...node.props, overrides: undefined })} data-testid="component-reset">↺ {say("رجّع متل الرئيسي|Back to the main one|חזרה לראשי")}</button> : null}
        {variant ? <button type="button" className={btn} disabled={busy} onClick={() => onDetach(variant.node)} data-testid="component-detach">⛓ {say("افصله (نسخة عادية)|Detach (a plain copy)|נתק (עותק רגיל)")}</button> : null}
      </div>
    </div>
  );
}

/** Editing a main component itself: what its variants are, and adding one. */
export function ComponentDocPanel({ variants, busy, onAddVariant }: { variants: PageTreeNode[]; busy: boolean; onAddVariant: () => void }) {
  return (
    <div className={box} data-testid="component-doc">
      <div className="text-xs font-medium text-white/85">◇ {say("مكوّن رئيسي|A main component|רכיב ראשי")}</div>
      <p className="text-[11px] leading-5 text-white/50">{say("كل عنصر بهالقسم نسخة من المكوّن، وإسمه إسم النسخة (زر أساسي، ثانوي…). لما تنشر، بيتغيّر بكل الصفحات.|Each element in this section is a variant of the component, named after it (primary, secondary…). Publish to change it on every page.|כל אובייקט בסעיף הזה הוא גרסה של הרכיב, ושמו שם הגרסה. פרסם כדי לשנות בכל הדפים.")}</p>
      <div className="text-[11px] text-white/60" data-testid="component-doc-variants">{variants.map((v) => v.name ?? v.type).join(" · ")}</div>
      <button type="button" className={`${btn} w-full`} disabled={busy || !variants.length} onClick={onAddVariant} data-testid="component-add-variant">+ {say("زيد نسخة|Add a variant|הוסף גרסה")}</button>
    </div>
  );
}
