// Very small CSS scoper for the CMS preview.
// It prefixes selectors so customCss cannot affect the admin UI.
// Note: This is not a full CSS parser, but covers typical page CSS well.

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function scopeSelectors(selectorList: string, scope: string) {
  return selectorList
    .split(",")
    .map((raw) => {
      const s = raw.trim();
      if (!s) return s;
      if (s.includes(scope)) return s;

      // Avoid breaking common globals
      if (s === ":root" || s === "html" || s === "body") return scope;

      // If user targets html/body descendants
      if (s.startsWith("html ") || s.startsWith("body ")) return `${scope} ${s.replace(/^(html|body)\s+/, "")}`.trim();

      return `${scope} ${s}`.trim();
    })
    .join(", ");
}

function scopeBlock(css: string, scope: string): string {
  let out = "";
  let i = 0;

  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) {
      out += css.slice(i);
      break;
    }

    const prelude = css.slice(i, open);

    // find matching closing brace
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      const ch = css[j];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      j++;
    }

    const body = css.slice(open + 1, j - 1);
    const trimmedPrelude = prelude.trim();

    if (trimmedPrelude.startsWith("@")) {
      const at = trimmedPrelude.split(/\s+/)[0].toLowerCase();
      const recurse = at === "@media" || at === "@supports" || at === "@container" || at === "@layer";
      out += `${prelude}{${recurse ? scopeBlock(body, scope) : body}}`;
    } else {
      const scoped = scopeSelectors(prelude, scope);
      out += `${scoped}{${body}}`;
    }

    i = j;
  }

  return out;
}

export function scopeCss(css: string, scopeSelector: string) {
  const cleaned = stripComments(css || "");
  if (!cleaned.trim()) return "";
  return scopeBlock(cleaned, scopeSelector);
}
