import type { Lang } from "./lang";

/** Replace merchant-name placeholders without changing source navigation or structure. */
export function personaliseStoreWords<T>(value: T, names: Partial<Record<Lang, string>>, lang?: Lang): T {
  if (typeof value === "string") return value.replaceAll("{{store.name}}", () => (lang && names[lang]) || names.ar || names.en || names.he || "") as T;
  if (Array.isArray(value)) return value.map(item => personaliseStoreWords(item, names, lang)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, personaliseStoreWords(item, names, ["ar", "en", "he"].includes(key) ? key as Lang : lang)])) as T;
  return value;
}
