/**
 * An element's own CSS in the editor (docs/cms-big-engine-plan.ar.md C): Tailwind classes turned into rules for that
 * element only, by Tailwind 4 itself running here in the admin (`tailwind4`, loaded only when it's used), and CSS
 * written for it wrapped in its own class. What comes out (`out`) is what the shop puts in the page, after
 * checking it again (shared/cssCode.ts; the backend checks it too).
 *  - Tailwind's colours, sizes and shadows come as its theme's variables and its own registered properties: both are
 *    set on the element itself (nothing goes on :root), so the rules stay its own.
 *  - States (hover:, focus:…), screens (md:, lg:…) and dark: become nested rules (&:hover, @media) inside it.
 */
import { cssProblem, wrapCss, CODE_LIMITS } from "../../../shared/cssCode";

export type CodeResult = { out: string; error?: undefined } | { out?: undefined; error: string };

const CLASS = /^[A-Za-z0-9_\-:/[\]#%.!(),'"@>&*+=~]+$/;
/** Tailwind's classes as typed: one per word, nothing that could close a rule. */
export function classesOf(tw: string): string[] | null {
  const words = tw.trim().split(/\s+/).filter(Boolean);
  return words.every((w) => CLASS.test(w) && !/[{};<>]/.test(w)) ? words : null;
}

/** A block's inside, from the brace at `open` to its matching one. */
function blockAt(css: string, open: number): { body: string; end: number } | null {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return { body: css.slice(open + 1, i), end: i };
  }
  return null;
}

/**
 * Tailwind's output made the element's own: its theme variables and registered properties' starting values moved
 * into the element's rule, @layer and @property taken away.
 */
export function ownTailwind(raw: string, id: string): string {
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const own = `.pt-${id}`;
  const vars: string[] = [];
  // The theme's variables (:root, :host { --color-…: … }).
  const root = css.indexOf(":root, :host");
  if (root >= 0) {
    const b = blockAt(css, css.indexOf("{", root));
    if (b) vars.push(...b.body.split(";").map((d) => d.trim()).filter((d) => d.startsWith("--")));
  }
  // Registered properties' starting values (@property --tw-shadow { initial-value: … }).
  for (const m of css.matchAll(/@property\s+(--[\w-]+)\s*\{([^}]*)\}/g)) {
    const init = /initial-value:\s*([^;]+);?/.exec(m[2]);
    if (init) vars.push(`${m[1]}: ${init[1].trim()}`);
  }
  // The element's own rule.
  const at = css.search(new RegExp(`(^|[\\s}])${own.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&")}\\s*\\{`));
  if (at < 0) return "";
  const b = blockAt(css, css.indexOf("{", at));
  if (!b) return "";
  const body = b.body.trim();
  return `${own}{${vars.length ? `${vars.join(";")};` : ""}${body}}`;
}

/** Tailwind classes compiled for the element `id` (errors in words: an unknown class, a bad word). */
export async function tailwindFor(tw: string, id: string): Promise<CodeResult> {
  const classes = classesOf(tw);
  if (!classes) return { error: "bad" };
  if (!classes.length) return { out: "" };
  const [{ compile }, theme, utilities] = await Promise.all([
    import("tailwind4"),
    import("tailwind4/theme.css?raw").then((m) => m.default as string),
    import("tailwind4/utilities.css?raw").then((m) => m.default as string),
  ]);
  const files: Record<string, string> = { "tailwindcss/theme.css": theme, "tailwindcss/utilities.css": utilities };
  const input = `@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n.pt-${id} { @apply ${classes.join(" ")}; }`;
  try {
    const c = await compile(input, { base: "/", loadStylesheet: async (path: string, base: string) => ({ path, base, content: files[path] ?? "" }) });
    return { out: ownTailwind(c.build([]), id) };
  } catch (e) {
    const m = /unknown utility class[^`]*`([^`]+)`/i.exec(String((e as Error)?.message ?? e));
    return { error: m ? `unknown:${m[1]}` : "bad" };
  }
}

/** The element's own CSS from both: Tailwind's rules first, the written CSS after (so it wins), checked. */
export async function buildCode(code: { tw?: string; css?: string }, id: string): Promise<CodeResult> {
  if ((code.tw ?? "").length > CODE_LIMITS.tw || (code.css ?? "").length > CODE_LIMITS.css) return { error: "long" };
  const tw = code.tw?.trim() ? await tailwindFor(code.tw, id) : { out: "" };
  if (tw.error) return tw;
  const written = code.css?.trim() ? wrapCss(code.css, id) : "";
  if (written) {
    const p = cssProblem(written, id, CODE_LIMITS.out);
    if (p) return { error: `css:${p}` };
  }
  const out = `${tw.out ?? ""}${written}`;
  const p = out ? cssProblem(out, id, CODE_LIMITS.out) : null;
  return p ? { error: `css:${p}` } : { out };
}
