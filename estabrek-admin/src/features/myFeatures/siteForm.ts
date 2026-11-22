// A whole site's choices as the owner fills them in (the install wizard in ميزاتي → مواقع كاملة, and the
// store setup's «شو نوع موقعك؟» for a new copy): what is typed, and the choices it makes (only what differs
// from the sample, so an untouched site installs as the gallery's). Pure, apart from the components that
// show it (SiteSteps.tsx).
import { choosable, keepModules, type ModuleKey, type SiteBiz, type SiteBlueprint, type SiteChoices } from "../../studio/templates/sites";

export type Lang = "ar" | "en" | "he";
export type W = Record<Lang, string>;
export const LANGS: Lang[] = ["ar", "en", "he"];

/** Words in three languages, and which of them were given their own (the others follow the admin's). */
export type Words3 = { v: W; own: Record<Lang, boolean> };
export const words3 = (w: W): Words3 => ({ v: { ...w }, own: { ar: false, en: false, he: false } });
export const same = (a: W, b: W) => LANGS.every((l) => a[l] === b[l]);

export type SiteForm = {
  /** The site it is for (a form for another one starts again). */
  key: string;
  name: Words3;
  address: Words3;
  hours: Words3;
  contact: { phone: string; email: string; city: string };
  wanted: ModuleKey[];
  look: number;
  motion: "calm" | "rich";
};

/** The form as a site starts: the sample's details, all of its modules, its own look. `name`: the owner's own, when known. */
export function siteForm(bp: SiteBlueprint, name?: W | null): SiteForm {
  const given = name && LANGS.some((l) => name[l].trim()) ? name : null;
  // A name in one language only is the name in all three until the others are given (never the sample's).
  const first = given ? LANGS.map((l) => given[l].trim()).find(Boolean)! : "";
  return {
    key: bp.key,
    name: given ? { v: { ar: given.ar.trim() || first, en: given.en.trim() || first, he: given.he.trim() || first }, own: { ar: Boolean(given.ar.trim()), en: Boolean(given.en.trim()), he: Boolean(given.he.trim()) } } : words3(bp.biz.name),
    address: words3(bp.biz.address),
    hours: words3(bp.biz.hours),
    contact: { phone: bp.biz.phone, email: bp.biz.email, city: bp.biz.city },
    wanted: choosable(bp).map((m) => m.key),
    look: bp.look % 6,
    motion: "calm",
  };
}

/** The choices the form makes: what differs from the sample only. */
export function choicesOf(bp: SiteBlueprint, f: SiteForm): SiteChoices {
  const biz: Partial<SiteBiz> = {};
  if (!same(f.name.v, bp.biz.name)) biz.name = f.name.v;
  if (!same(f.address.v, bp.biz.address)) biz.address = f.address.v;
  if (!same(f.hours.v, bp.biz.hours)) biz.hours = f.hours.v;
  for (const k of ["phone", "email", "city"] as const) if (f.contact[k].trim() && f.contact[k].trim() !== bp.biz[k]) biz[k] = f.contact[k].trim();
  const { kept } = keepModules(bp, f.wanted);
  return {
    ...(Object.keys(biz).length ? { biz } : {}),
    ...(kept.length !== choosable(bp).length ? { modules: kept } : {}),
    ...(f.look !== bp.look % 6 ? { look: f.look } : {}),
    ...(f.motion !== "calm" ? { motion: f.motion } : {}),
  };
}

/** The choices, or null when nothing differs (the gallery's own file). */
export const choicesOrNull = (c: SiteChoices): SiteChoices | null => (Object.keys(c).length ? c : null);

/** The details still the sample's (to say so beside them): "name", "phone"… One left empty is the sample's too (withChoices keeps it). */
export function stillSample(bp: SiteBlueprint, f: SiteForm): Set<keyof SiteBiz> {
  const out = new Set<keyof SiteBiz>();
  for (const k of ["name", "address", "hours"] as const) if (LANGS.some((l) => !f[k].v[l].trim() || f[k].v[l].trim() === bp.biz[k][l])) out.add(k);
  for (const k of ["phone", "email", "city"] as const) if (!f.contact[k].trim() || f.contact[k].trim() === bp.biz[k]) out.add(k);
  return out;
}
