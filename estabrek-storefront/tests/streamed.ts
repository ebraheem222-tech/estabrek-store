import type { Page } from "@playwright/test";

/*
 * A page opened without scripts, with the parts the server sent after the page's first part put where they belong.
 *
 * React sends what is ready first, then each part that was still being drawn, later in the same answer, in a hidden
 * box (<div hidden id="S:n">) followed by a one-line script ($RC("B:n","S:n") or $RS("S:n","P:n")) that moves it
 * into its place (<template id="B:n"> or <template id="P:n">). Next 16's dev server draws a page in stages, so a
 * page's content always comes that way there; Next 14's dev server only happened to finish it in time. The live
 * shop sends its page content the same way.
 *
 * What the server drew is all in the answer either way. This does only that move, the way React's own script does,
 * so a check without scripts looks at what the server drew, not at how it travelled.
 */
/** The same move on the server's answer as text (for specs that compare the HTML itself, not a page). */
export function placeStreamedHtml(html: string): string {
  const calls = Array.from(html.matchAll(/\$R([CSR])\("([^"]+)","([^"]+)"/g), (m) => [m[1], m[2], m[3]] as const);
  // A box's end: the </div> that closes it, counting the divs inside (scripts and styles skipped whole).
  const boxAt = (s: string, id: string): [number, number, string] | null => {
    const open = `<div hidden id="${id}">`;
    const start = s.indexOf(open);
    if (start < 0) return null;
    const tag = /<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<div\b|<\/div>/g;
    tag.lastIndex = start + open.length;
    let depth = 0;
    for (let m = tag.exec(s); m; m = tag.exec(s)) {
      if (m[0] === "</div>") {
        if (depth === 0) return [start, m.index + 6, s.slice(start + open.length, m.index)];
        depth--;
      } else if (m[0] === "<div") depth++;
    }
    return null;
  };
  let s = html;
  for (const [kind, a, b] of calls) {
    const box = boxAt(s, kind === "S" ? a : b);
    if (!box) continue;
    const [from, to, inner] = box;
    s = s.slice(0, from) + s.slice(to);
    if (kind === "S") {
      s = s.replace(`<template id="${b}"></template>`, () => inner);
      continue;
    }
    const spot = s.indexOf(`<!--$?--><template id="${a}"></template>`);
    if (spot < 0) continue;
    // What stood in for it runs to the comment that closes its box, counting boxes inside.
    const mark = /<!--(\/?\$[?!]?)-->/g;
    mark.lastIndex = spot + "<!--$?-->".length;
    let depth = 0;
    let end = -1;
    for (let m = mark.exec(s); m; m = mark.exec(s)) {
      if (m[1] === "/$") {
        if (depth === 0) { end = m.index; break; }
        depth--;
      } else depth++;
    }
    if (end < 0) continue;
    s = s.slice(0, spot) + "<!--$-->" + inner + s.slice(end);
  }
  return s;
}

export async function placeStreamed(page: Page): Promise<number> {
  return page.evaluate(() => {
    const calls: [string, string, string][] = [];
    for (const script of Array.from(document.scripts)) {
      for (const m of (script.textContent ?? "").matchAll(/\$R([CSR])\("([^"]+)","([^"]+)"/g)) calls.push([m[1], m[2], m[3]]);
    }
    let moved = 0;
    for (const [kind, a, b] of calls) {
      if (kind === "S") {
        // A part of a part: its box's children go where its template is.
        const box = document.getElementById(a);
        const spot = document.getElementById(b);
        if (!box || !spot?.parentNode) continue;
        box.remove();
        while (box.firstChild) spot.parentNode.insertBefore(box.firstChild, spot);
        spot.remove();
        moved++;
        continue;
      }
      // A waiting part ($RC, or $RR when it waited for its styles): what stood in for it goes, its box takes its place.
      const box = document.getElementById(b);
      const spot = document.getElementById(a);
      if (!box) continue;
      box.remove();
      const start = spot?.previousSibling;
      const parent = start?.parentNode;
      if (!start || !parent) continue;
      let node = start.nextSibling;
      let depth = 0;
      while (node) {
        if (node.nodeType === Node.COMMENT_NODE) {
          const data = (node as Comment).data;
          if (data === "/$") {
            if (depth === 0) break;
            depth--;
          } else if (data === "$" || data === "$?" || data === "$!") depth++;
        }
        const next = node.nextSibling;
        node.remove();
        node = next;
      }
      while (box.firstChild) parent.insertBefore(box.firstChild, node);
      (start as Comment).data = "$";
      moved++;
    }
    return moved;
  });
}
