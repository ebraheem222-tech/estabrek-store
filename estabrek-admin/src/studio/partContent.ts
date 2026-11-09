/** Use renderer-declared source paths for static words; visible equality alone never proves ownership. */
import { defaultPartWords, exactLanguageWords } from "../../../shared/partWords";
export type ContentBinding = { path: Array<string | number>; value: string; line?: number };
type Locale = "ar" | "en" | "he";
const LOCALES = ["ar", "en", "he"] as const;
const BLOCKED = new Set(["__proto__", "prototype", "constructor", "partLooks", "edges", "art", "interactions", "motion", "styleId"]);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const local = (v: unknown): v is Partial<Record<Locale, string>> => object(v) && Object.keys(v).length > 0 && Object.keys(v).every(k => (LOCALES as readonly string[]).includes(k) && typeof v[k] === "string");
const read = (props: unknown, path: ContentBinding["path"]): unknown => {
  let at: any = props;
  for (const key of path) {
    if (typeof key === "string" && (BLOCKED.has(key) || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)) || typeof key === "number" && (!Number.isInteger(key) || key < 0 || key > 299) || !at || !Object.hasOwn(at, key)) return undefined;
    at = at[key];
  }
  return at;
};
const pick = (v: Partial<Record<Locale, string>>, lang: Locale, main: Locale) => v[lang] || v[main] || v.ar || v.en || v.he || "";
const normal = (s: string) => s.replace(/\s+/g, " ").trim();
export function contentBinding(props: Record<string, unknown>, text: string, lang: Locale, main: Locale, source?: string, sourceLine?: number, nodeType?: string): ContentBinding | null {
  if (!source || source.length > 120 || !/^[A-Za-z][A-Za-z0-9_-]*(?:\.(?:[A-Za-z][A-Za-z0-9_-]*|0|[1-9][0-9]{0,2})){0,9}$/.test(source) || text.length > 6000) return null;
  const path = source.split(".").map(key => /^\d+$/.test(key) ? Number(key) : key);
  const raw = read(props, path), defaults = defaultPartWords(nodeType, source);
  if (!local(raw) && !(defaults && (raw === undefined || object(raw) && !Object.keys(raw).length))) return null;
  // A shop's words: its own in this language, else its built-in one in this language (as the shop draws them).
  const own = local(raw) ? (defaults && exactLanguageWords(nodeType) ? raw[lang] ?? "" : pick(raw, lang, main)) : "";
  const value = own || defaults?.[lang] || "";
  if (sourceLine !== undefined) {
    const lines = value.split("\n");
    if (!Number.isInteger(sourceLine) || sourceLine < 0 || sourceLine >= lines.length || normal(lines[sourceLine]) !== normal(text)) return null;
    return { path, value: lines[sourceLine], line: sourceLine };
  }
  return normal(value) === normal(text) ? { path, value } : null;
}
export function replaceContent<T extends Record<string, unknown>>(props: T, binding: ContentBinding, lang: Locale, value: string, main: Locale = "ar", nodeType?: string): T | null {
  if (!binding.path.length || binding.path.length > 10 || value.length > 6000) return null;
  const before = read(props, binding.path);
  const defaults = defaultPartWords(nodeType, binding.path.join("."));
  if (!local(before) && !(defaults && (before === undefined || object(before) && !Object.keys(before).length))) return null;
  if (defaults && value.length > 40) return null;
  let text = value;
  if (binding.line !== undefined) {
    if (!local(before)) return null;
    const lines = pick(before, lang, main).split("\n");
    if (!Number.isInteger(binding.line) || binding.line < 0 || binding.line >= lines.length || value.includes("\n")) return null;
    lines[binding.line] = value; text = lines.join("\n");
  }
  const next = structuredClone(props); let at: any = next;
  for (const key of binding.path.slice(0, -1)) at = at[key];
  at[binding.path.at(-1)!] = { ...(local(before) ? before : {}), [lang]: text };
  return next;
}
export function bindingLink(props: Record<string, unknown>, binding: ContentBinding): { path: ContentBinding["path"]; value: string } | null {
  if (!["label", "cta", "name", "title"].includes(String(binding.path.at(-1)))) return null;
  const path = [...binding.path.slice(0, -1), "href"], value = read(props, path);
  return typeof value === "string" ? { path, value } : null;
}
