/**
 * The chart's five new kinds (plan 3.7, learnt from the theme library's data pieces, drawn our own way): the maths
 * only, no React and no page, so the editor imports it too (the city list). ChartKinds.tsx draws them.
 *
 * - sunburst: two rings, the groups inside and their items outside; a group picked fills the circle.
 * - sankey: flows from one name to another (an item's label → its `to`), in columns by how far from the start.
 * - flights: lines from one city (the hub) to the items' cities, over a dotted map of the world.
 * - bars3d: one bar per item in 3D (isometric), a row per group.
 * - live: rows of one of the owner's tables counted per minute, hour or day (the backend's GET /v1/data/<t>/per/<every>).
 */

/** The kinds drawn by ChartKinds.tsx (the first three, bar, line and donut, are ChartView.tsx's). */
export const NEW_CHART_KINDS = ["sunburst", "sankey", "flights", "bars3d", "live"] as const;
export type NewChartKind = (typeof NEW_CHART_KINDS)[number];

export type ChartItem = { label: string; value: number; color: string | null; group: string; to: string; city: string };

/** A colour for the n-th thing when the owner gave none: the store's accent first, then a few that sit well beside it. */
const PALETTE = ["#6366f1", "#06b6d4", "#f59e0b", "#ec4899", "#22c55e", "#a78bfa", "#f97316", "#14b8a6", "#ef4444", "#84cc16"];
export const paletteAt = (n: number) => (n === 0 ? "var(--accent,#86b696)" : PALETTE[(n - 1) % PALETTE.length]);

export const TAU = Math.PI * 2;

/* ── Sunburst ── */

export type SunGroup = { name: string; value: number; color: string; items: Array<{ label: string; value: number; color: string; index: number }> };

/** The groups in the order they first come, each with its items; an item with no group is a group of its own. */
export function sunGroups(items: ChartItem[]): SunGroup[] {
  const out: SunGroup[] = [];
  const at = new Map<string, SunGroup>();
  items.forEach((item, index) => {
    const name = item.group.trim();
    const key = name || `\u0000${index}`;
    let g = at.get(key);
    if (!g) {
      g = { name: name || item.label, value: 0, color: item.color ?? paletteAt(out.length), items: [] };
      at.set(key, g);
      out.push(g);
    }
    g.value += item.value;
    if (name) g.items.push({ label: item.label, value: item.value, color: item.color ?? g.color, index });
  });
  return out;
}

/** Where every slice sits, for the circle as a whole (focus -1) or one group filling it. Angles 0…TAU, radii in a 500 box. */
export type Slice = { key: string; a0: number; a1: number; r0: number; r1: number; color: string; strong: boolean; label: string; value: number; group: number };
export function sunSlices(groups: SunGroup[], focus: number): Slice[] {
  const out: Slice[] = [];
  const INNER: [number, number] = [74, 150];
  const OUTER: [number, number] = [154, 230];
  if (focus >= 0 && groups[focus]) {
    const g = groups[focus];
    const list = g.items.length ? g.items : [{ label: g.name, value: g.value, color: g.color, index: -1 }];
    const sum = list.reduce((s, x) => s + x.value, 0) || 1;
    let a = 0;
    list.forEach((x, i) => {
      const a1 = a + (x.value / sum) * TAU;
      out.push({ key: `${focus}.${i}`, a0: a, a1, r0: INNER[0], r1: OUTER[1], color: x.color, strong: true, label: x.label, value: x.value, group: focus });
      a = a1;
    });
    return out;
  }
  const sum = groups.reduce((s, g) => s + g.value, 0) || 1;
  let a = 0;
  groups.forEach((g, gi) => {
    const a1 = a + (g.value / sum) * TAU;
    if (!g.items.length) out.push({ key: `${gi}`, a0: a, a1, r0: INNER[0], r1: OUTER[1], color: g.color, strong: true, label: g.name, value: g.value, group: gi });
    else {
      out.push({ key: `${gi}`, a0: a, a1, r0: INNER[0], r1: INNER[1], color: g.color, strong: true, label: g.name, value: g.value, group: gi });
      let b = a;
      g.items.forEach((x, i) => {
        const b1 = b + (g.value ? x.value / g.value : 0) * (a1 - a);
        out.push({ key: `${gi}.${i}`, a0: b, a1: b1, r0: OUTER[0], r1: OUTER[1], color: x.color, strong: false, label: x.label, value: x.value, group: gi });
        b = b1;
      });
    }
    a = a1;
  });
  return out;
}

/** A ring's slice as an SVG path around (0,0), with a hair of space between slices. Angle 0 is up, clockwise. */
export function arcPath(a0: number, a1: number, r0: number, r1: number): string {
  if (a1 - a0 < 0.0005 || r1 - r0 < 0.5) return "";
  const da = Math.min(a1 - a0, TAU - 0.0001);
  const gap = Math.min(0.01, da / 4);
  const s = a0 + gap;
  const e = a0 + da - gap;
  const large = e - s > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  return `M${p(r1, s)}A${r1} ${r1} 0 ${large} 1 ${p(r1, e)}L${p(r0, e)}A${r0} ${r0} 0 ${large} 0 ${p(r0, s)}Z`;
}

/** Between two layouts: the same slices (by key) eased from one place to the other; one that's new or gone shrinks to its middle. */
export function blendSlices(from: Slice[], to: Slice[], k: number): Slice[] {
  const was = new Map(from.map((s) => [s.key, s]));
  const mix = (a: number, b: number) => a + (b - a) * k;
  const out = to.map((s) => {
    const f = was.get(s.key) ?? { ...s, a0: (s.a0 + s.a1) / 2, a1: (s.a0 + s.a1) / 2 };
    return { ...s, a0: mix(f.a0, s.a0), a1: mix(f.a1, s.a1), r0: mix(f.r0, s.r0), r1: mix(f.r1, s.r1) };
  });
  const now = new Set(to.map((s) => s.key));
  for (const f of from) if (!now.has(f.key)) { const m = (f.a0 + f.a1) / 2; out.push({ ...f, a0: mix(f.a0, m), a1: mix(f.a1, m) }); }
  return out;
}

/* ── Sankey ── */

export type SankeyNode = { name: string; col: number; value: number; y: number; h: number; color: string; x: number };
export type SankeyLink = { from: number; to: number; value: number; width: number; y0: number; y1: number; index: number; color: string };
export const SANKEY = { W: 900, H: 440, NODE: 14, GAP: 16 } as const;

/**
 * The flows laid out: each name a node, in a column by its longest way from a start (a name nothing flows into);
 * a flow that would go round in a circle is left out. One scale for every column, so a ribbon keeps its width.
 */
export function sankeyLayout(items: ChartItem[]): { nodes: SankeyNode[]; links: SankeyLink[]; dropped: number } {
  const names: string[] = [];
  const idOf = (name: string) => {
    let i = names.indexOf(name);
    if (i < 0) i = names.push(name) - 1;
    return i;
  };
  const edges: Array<{ from: number; to: number; value: number; index: number; color: string | null }> = [];
  let dropped = 0;
  const reaches = (a: number, b: number): boolean => {
    const seen = new Set<number>();
    const walk = (n: number): boolean => n === b || (!seen.has(n) && (seen.add(n), edges.some((e) => e.from === n && walk(e.to))));
    return walk(a);
  };
  items.forEach((item, index) => {
    const a = item.label.trim();
    const b = item.to.trim();
    if (!a || !b || a === b || item.value <= 0) return void (dropped += a && b && a !== b ? 0 : 1);
    const from = idOf(a);
    const to = idOf(b);
    if (reaches(to, from)) return void dropped++;
    edges.push({ from, to, value: item.value, index, color: item.color });
  });
  const col = names.map(() => 0);
  for (let pass = 0; pass < names.length; pass++) for (const e of edges) col[e.to] = Math.max(col[e.to], col[e.from] + 1);
  const cols = Math.max(0, ...col) + 1;
  const value = names.map((_, n) => Math.max(edges.filter((e) => e.from === n).reduce((s, e) => s + e.value, 0), edges.filter((e) => e.to === n).reduce((s, e) => s + e.value, 0)));
  const byCol = Array.from({ length: cols }, (_, c) => names.map((_, n) => n).filter((n) => col[n] === c));
  const { W, H, NODE, GAP } = SANKEY;
  const k = Math.min(...byCol.map((list) => (H - GAP * (list.length - 1)) / Math.max(1e-9, list.reduce((s, n) => s + value[n], 0))));
  const colour = names.map((_, n) => edges.find((e) => e.from === n && e.color)?.color ?? paletteAt(n));
  const nodes: SankeyNode[] = names.map((name, n) => ({ name, col: col[n], value: value[n], y: 0, h: value[n] * k, color: colour[n], x: cols > 1 ? (col[n] * (W - NODE)) / (cols - 1) : 0 }));
  byCol.forEach((list) => {
    let y = (H - (list.reduce((s, n) => s + nodes[n].h, 0) + GAP * (list.length - 1))) / 2;
    for (const n of list) { nodes[n].y = y; y += nodes[n].h + GAP; }
  });
  const out = names.map(() => 0);
  const inn = names.map(() => 0);
  const links = [...edges]
    .sort((p, q) => nodes[p.from].y - nodes[q.from].y || nodes[p.to].y - nodes[q.to].y)
    .map((e) => {
      const width = e.value * k;
      const link = { from: e.from, to: e.to, value: e.value, width, y0: nodes[e.from].y + out[e.from], y1: nodes[e.to].y + inn[e.to], index: e.index, color: colour[e.from] };
      out[e.from] += width;
      inn[e.to] += width;
      return link;
    });
  return { nodes, links, dropped };
}

/** A flow's ribbon, from the right edge of its start to the left edge of its end. */
export function ribbon(l: SankeyLink, nodes: SankeyNode[]): string {
  const x0 = nodes[l.from].x + SANKEY.NODE;
  const x1 = nodes[l.to].x;
  const xm = (x0 + x1) / 2;
  const f = (n: number) => n.toFixed(1);
  return `M${f(x0)} ${f(l.y0)}C${f(xm)} ${f(l.y0)} ${f(xm)} ${f(l.y1)} ${f(x1)} ${f(l.y1)}L${f(x1)} ${f(l.y1 + l.width)}C${f(xm)} ${f(l.y1 + l.width)} ${f(xm)} ${f(l.y0 + l.width)} ${f(x0)} ${f(l.y0 + l.width)}Z`;
}

/* ── Isometric bars ── */

/** A cell of the floor (column x, row y) on the page, in the isometric view. */
export const iso = (x: number, y: number): [number, number] => [(x - y) * 26, (x + y) * 13];
const pts = (...p: Array<[number, number]>) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
/** A bar's three faces (left, right, top) standing `h` high on cell (gx, gy). */
export function isoBar(gx: number, gy: number, h: number): { left: string; right: string; top: string } {
  const pad = 0.16;
  const a = iso(gx + pad, gy + pad);
  const b = iso(gx + 1 - pad, gy + pad);
  const c = iso(gx + 1 - pad, gy + 1 - pad);
  const d = iso(gx + pad, gy + 1 - pad);
  const up = (p: [number, number]): [number, number] => [p[0], p[1] - h];
  return { left: pts(d, c, up(c), up(d)), right: pts(c, b, up(b), up(c)), top: pts(up(a), up(b), up(c), up(d)) };
}
/** The bars in rows (a row per group, in the order they first come; no groups, one row), drawn back to front. */
export function isoGrid(items: ChartItem[]): { rows: string[]; cols: number; cells: Array<{ gx: number; gy: number; item: number }> } {
  const rows: string[] = [];
  const cells: Array<{ gx: number; gy: number; item: number }> = [];
  const used: number[] = [];
  items.forEach((item, index) => {
    const name = item.group.trim();
    let gy = rows.indexOf(name);
    if (gy < 0) { gy = rows.push(name) - 1; used.push(0); }
    cells.push({ gx: used[gy]++, gy, item: index });
  });
  cells.sort((p, q) => p.gx + p.gy - (q.gx + q.gy) || p.gx - q.gx);
  return { rows, cols: Math.max(1, ...used), cells };
}

/* ── Flights: a dotted map of the world ── */

/** Cities a line can go to: [key, latitude, longitude, Arabic, English, Hebrew]. */
export const CITIES: ReadonlyArray<readonly [string, number, number, string, string, string]> = [
  ["jerusalem", 31.78, 35.22, "القدس", "Jerusalem", "ירושלים"],
  ["ramallah", 31.9, 35.2, "رام الله", "Ramallah", "רמאללה"],
  ["nablus", 32.22, 35.26, "نابلس", "Nablus", "שכם"],
  ["hebron", 31.53, 35.1, "الخليل", "Hebron", "חברון"],
  ["gaza", 31.5, 34.47, "غزة", "Gaza", "עזה"],
  ["haifa", 32.79, 34.99, "حيفا", "Haifa", "חיפה"],
  ["nazareth", 32.7, 35.3, "الناصرة", "Nazareth", "נצרת"],
  ["tel-aviv", 32.08, 34.78, "تل أبيب", "Tel Aviv", "תל אביב"],
  ["amman", 31.95, 35.93, "عمّان", "Amman", "עמאן"],
  ["beirut", 33.89, 35.5, "بيروت", "Beirut", "ביירות"],
  ["damascus", 33.51, 36.29, "دمشق", "Damascus", "דמשק"],
  ["baghdad", 33.31, 44.36, "بغداد", "Baghdad", "בגדאד"],
  ["cairo", 30.04, 31.24, "القاهرة", "Cairo", "קהיר"],
  ["alexandria", 31.2, 29.92, "الإسكندرية", "Alexandria", "אלכסנדריה"],
  ["riyadh", 24.71, 46.68, "الرياض", "Riyadh", "ריאד"],
  ["jeddah", 21.49, 39.19, "جدة", "Jeddah", "ג'דה"],
  ["mecca", 21.42, 39.83, "مكة", "Mecca", "מכה"],
  ["dubai", 25.2, 55.27, "دبي", "Dubai", "דובאי"],
  ["abu-dhabi", 24.45, 54.38, "أبوظبي", "Abu Dhabi", "אבו דאבי"],
  ["doha", 25.29, 51.53, "الدوحة", "Doha", "דוחה"],
  ["kuwait", 29.38, 47.99, "الكويت", "Kuwait City", "כווית"],
  ["manama", 26.23, 50.59, "المنامة", "Manama", "מנאמה"],
  ["muscat", 23.59, 58.41, "مسقط", "Muscat", "מסקט"],
  ["istanbul", 41.01, 28.98, "إسطنبول", "Istanbul", "איסטנבול"],
  ["ankara", 39.93, 32.86, "أنقرة", "Ankara", "אנקרה"],
  ["tehran", 35.69, 51.39, "طهران", "Tehran", "טהרן"],
  ["casablanca", 33.57, -7.59, "الدار البيضاء", "Casablanca", "קזבלנקה"],
  ["tunis", 36.81, 10.18, "تونس", "Tunis", "תוניס"],
  ["algiers", 36.75, 3.06, "الجزائر", "Algiers", "אלג'יר"],
  ["tripoli", 32.89, 13.19, "طرابلس", "Tripoli", "טריפולי"],
  ["khartoum", 15.5, 32.56, "الخرطوم", "Khartoum", "חרטום"],
  ["addis-ababa", 9.03, 38.74, "أديس أبابا", "Addis Ababa", "אדיס אבבה"],
  ["nairobi", -1.29, 36.82, "نيروبي", "Nairobi", "ניירובי"],
  ["lagos", 6.52, 3.38, "لاغوس", "Lagos", "לאגוס"],
  ["johannesburg", -26.2, 28.05, "جوهانسبرغ", "Johannesburg", "יוהנסבורג"],
  ["cape-town", -33.92, 18.42, "كيب تاون", "Cape Town", "קייפטאון"],
  ["london", 51.51, -0.13, "لندن", "London", "לונדון"],
  ["paris", 48.86, 2.35, "باريس", "Paris", "פריז"],
  ["berlin", 52.52, 13.4, "برلين", "Berlin", "ברלין"],
  ["madrid", 40.42, -3.7, "مدريد", "Madrid", "מדריד"],
  ["rome", 41.9, 12.5, "روما", "Rome", "רומא"],
  ["athens", 37.98, 23.73, "أثينا", "Athens", "אתונה"],
  ["amsterdam", 52.37, 4.9, "أمستردام", "Amsterdam", "אמסטרדם"],
  ["stockholm", 59.33, 18.07, "ستوكهولم", "Stockholm", "שטוקהולם"],
  ["moscow", 55.76, 37.62, "موسكو", "Moscow", "מוסקבה"],
  ["kyiv", 50.45, 30.52, "كييف", "Kyiv", "קייב"],
  ["new-york", 40.71, -74.01, "نيويورك", "New York", "ניו יורק"],
  ["chicago", 41.88, -87.63, "شيكاغو", "Chicago", "שיקגו"],
  ["los-angeles", 34.05, -118.24, "لوس أنجلوس", "Los Angeles", "לוס אנג'לס"],
  ["toronto", 43.65, -79.38, "تورونتو", "Toronto", "טורונטו"],
  ["mexico-city", 19.43, -99.13, "مكسيكو سيتي", "Mexico City", "מקסיקו סיטי"],
  ["bogota", 4.71, -74.07, "بوغوتا", "Bogotá", "בוגוטה"],
  ["sao-paulo", -23.55, -46.63, "ساو باولو", "São Paulo", "סאו פאולו"],
  ["buenos-aires", -34.6, -58.38, "بوينس آيرس", "Buenos Aires", "בואנוס איירס"],
  ["karachi", 24.86, 67.01, "كراتشي", "Karachi", "קראצ'י"],
  ["mumbai", 19.08, 72.88, "مومباي", "Mumbai", "מומבאי"],
  ["delhi", 28.61, 77.21, "دلهي", "Delhi", "דלהי"],
  ["bangkok", 13.76, 100.5, "بانكوك", "Bangkok", "בנגקוק"],
  ["kuala-lumpur", 3.14, 101.69, "كوالالمبور", "Kuala Lumpur", "קואלה לומפור"],
  ["singapore", 1.35, 103.82, "سنغافورة", "Singapore", "סינגפור"],
  ["jakarta", -6.21, 106.85, "جاكرتا", "Jakarta", "ג'קרטה"],
  ["beijing", 39.9, 116.4, "بكين", "Beijing", "בייג'ינג"],
  ["shanghai", 31.23, 121.47, "شنغهاي", "Shanghai", "שנגחאי"],
  ["seoul", 37.57, 126.98, "سيول", "Seoul", "סיאול"],
  ["tokyo", 35.68, 139.69, "طوكيو", "Tokyo", "טוקיו"],
  ["sydney", -33.87, 151.21, "سيدني", "Sydney", "סידני"],
  ["melbourne", -37.81, 144.96, "ملبورن", "Melbourne", "מלבורן"],
  ["auckland", -36.85, 174.76, "أوكلاند", "Auckland", "אוקלנד"],
];
export const CITY_KEYS = CITIES.map((c) => c[0]);
export const cityOf = (key: string) => CITIES.find((c) => c[0] === key) ?? null;
export const cityName = (key: string, lang: "ar" | "en" | "he") => { const c = cityOf(key); return c ? c[lang === "ar" ? 3 : lang === "he" ? 5 : 4] : ""; };

/** How far apart two cities are, in kilometres (on the sphere). */
export function kmBetween(a: readonly [number, number], b: readonly [number, number]): number {
  const r = Math.PI / 180;
  const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// The land, roughly (longitude, latitude), drawn for a map of dots: fine enough at the size of a dot, no finer.
const LAND: Array<Array<[number, number]>> = [
  // North and Central America
  [[-168, 66], [-162, 70], [-156, 71.3], [-141, 69.6], [-128, 70], [-115, 68.5], [-100, 68], [-94, 72], [-85, 69.5], [-81, 64], [-90, 63.5], [-94, 59], [-92, 57], [-85, 55.3], [-80, 51.5], [-78, 57], [-77, 61], [-72, 62], [-65, 60], [-61, 56], [-56, 52], [-60, 47.5], [-65, 45], [-70, 43.5], [-70, 41.7], [-74, 40.5], [-76, 38], [-76, 35], [-81, 31.5], [-80, 27], [-80.4, 25.2], [-82, 26.5], [-83, 29.8], [-89, 30.2], [-94, 29.5], [-97.4, 27.5], [-97.7, 22], [-95.5, 18.8], [-91, 19], [-90.4, 21], [-87, 21.5], [-88, 16], [-83.5, 15], [-83.6, 11], [-81.7, 9], [-77.5, 8.5], [-79.5, 7.4], [-82.5, 8.2], [-85.7, 10], [-87.5, 13], [-91.5, 14], [-94.5, 16], [-96.5, 15.7], [-101, 17.2], [-105.5, 20], [-105.7, 22.5], [-109.5, 26], [-112.5, 29.5], [-114.7, 31.8], [-112.2, 29], [-110, 23], [-112, 24.8], [-114.3, 28], [-115.7, 30.3], [-117.1, 32.5], [-120.6, 34.5], [-122.5, 37.5], [-124.3, 40.3], [-124, 46], [-124.7, 48.4], [-123, 49], [-127.5, 50.8], [-130.5, 54.5], [-133.5, 57.5], [-137.5, 58.8], [-142, 60.2], [-147, 60.8], [-151.5, 59.3], [-154, 57.5], [-158, 56.5], [-163, 54.9], [-158.5, 58], [-162, 58.8], [-165, 60.4], [-164.7, 63], [-168, 65.5]],
  // Greenland and the islands north of Canada
  [[-73, 78], [-60, 82], [-40, 83.5], [-22, 82.5], [-18, 77], [-20, 72], [-22, 70], [-26, 68.5], [-34, 66], [-40, 65], [-43, 60], [-48, 61], [-51, 64], [-53.5, 67], [-55, 70.5], [-58, 75], [-66, 76.3]],
  [[-62, 67], [-72, 71], [-80, 73.5], [-90, 72], [-85, 70], [-78, 70], [-70, 67], [-65, 64]],
  [[-120, 74], [-110, 77], [-95, 80], [-75, 83], [-62, 82], [-75, 79], [-90, 76], [-105, 73], [-118, 71]],
  [[-84.9, 21.9], [-82.6, 23.2], [-80.3, 23.1], [-77.5, 21.8], [-74.2, 20.2], [-77.7, 19.9], [-78.5, 21.5], [-81.7, 22.2]],
  [[-74.4, 18.5], [-72.8, 19.9], [-69.9, 19.6], [-68.4, 18.6], [-71.3, 17.6], [-74.2, 18.1]],
  // South America
  [[-77.3, 8.5], [-75.5, 10.8], [-71.5, 12.3], [-67, 10.6], [-62, 10.7], [-60, 8.5], [-57, 6], [-52, 5], [-50, 1.5], [-48.5, -0.5], [-44.5, -2.5], [-39, -3.5], [-35, -5.5], [-35, -9], [-37.5, -12], [-39, -15], [-39.7, -19.5], [-41.5, -22.5], [-44.5, -23.3], [-48.5, -26.5], [-48.7, -28.5], [-53, -33.5], [-56, -34.9], [-57.5, -36.5], [-57.6, -38.5], [-62, -39], [-62.3, -41], [-65, -42], [-64.5, -45], [-67.5, -46.5], [-66, -48], [-69, -51], [-68.5, -52.5], [-70, -55], [-73, -53.5], [-75, -50], [-74, -46], [-73.5, -43], [-73.6, -38], [-71.6, -33], [-71.4, -28], [-70.4, -23.5], [-70.3, -18.3], [-72.5, -17], [-76.3, -13.5], [-78.2, -10], [-79.8, -7], [-81.2, -5.5], [-80.3, -3.5], [-80.5, -0.5], [-80, 1], [-78.9, 1.6], [-77.5, 4], [-77.4, 7]],
  // Africa, with Sinai
  [[-5.8, 35.8], [-2, 35.1], [1, 36.5], [5, 36.8], [9.5, 37.3], [11, 37], [10, 35.5], [11, 33.5], [15, 32.3], [19.5, 30.3], [20, 32], [23, 32.7], [25, 31.6], [29.5, 30.9], [32.3, 31.3], [34.2, 31.3], [34.9, 29.5], [34.3, 27.8], [32.6, 29.9], [33.6, 27.3], [35.5, 24], [37.2, 21], [38.5, 18], [39.7, 15.2], [41.5, 13.5], [43.3, 12.3], [44.5, 10.4], [51.2, 11.8], [51, 10.5], [49, 6], [46, 2], [42, -1], [40.2, -3], [39.3, -6.5], [39.7, -10], [40.5, -15], [37, -17.8], [35.3, -22], [35.5, -24], [32.9, -25.9], [32.4, -28.8], [30.2, -31.3], [27, -33.7], [22.5, -34], [20, -34.8], [18.4, -34], [17.8, -31.5], [16.5, -28.6], [15.2, -26.6], [14.4, -22.9], [11.8, -17.2], [13.6, -12], [13.2, -9], [12.2, -6], [11.8, -3.3], [9.5, -1], [9.8, 2.5], [9.5, 4], [8.5, 4.5], [6.5, 4.3], [4.5, 6.3], [1.5, 6.1], [-2, 4.7], [-4.5, 5.2], [-7.5, 4.4], [-9.5, 5.7], [-11.5, 6.9], [-13.2, 8.8], [-15, 11], [-16.8, 12.5], [-17.4, 14.7], [-16.5, 16.2], [-16.5, 19.5], [-17.1, 21], [-15.7, 24], [-14, 26.3], [-12, 28], [-10, 29.6], [-9.7, 31.5], [-8.5, 33.3], [-6.8, 34.1], [-6.3, 35.8]],
  [[49.3, -12], [50.5, -15.5], [49.5, -17.5], [47.2, -25], [45.2, -25.5], [43.8, -23.5], [43.3, -21.5], [44.5, -16.2], [47.5, -14.5]],
  // Europe and Asia
  [[-9.5, 37], [-8.9, 38.7], [-9.5, 40.5], [-8.8, 42.3], [-9.3, 43.2], [-7, 43.6], [-3.8, 43.4], [-1.5, 43.4], [-1.2, 46], [-2.3, 47.2], [-4.7, 48.4], [-1.5, 48.7], [-1.3, 49.7], [0.2, 49.6], [1.6, 50.9], [3.2, 51.3], [4.5, 52.4], [4.8, 53.2], [7, 53.6], [8.6, 53.9], [8.6, 55.4], [8.1, 56.8], [10.6, 57.7], [10.5, 56.2], [10, 54.9], [11, 54], [14, 54.1], [18.4, 54.8], [21.2, 55.2], [21, 56.8], [23.5, 57.2], [24.4, 58.4], [23.5, 59.2], [28, 59.5], [30, 60], [28.5, 60.6], [26, 60.4], [22.8, 60], [21.4, 61], [21.5, 63.2], [25, 65], [25.3, 65.8], [22.3, 65.8], [21.2, 64.8], [19.6, 63.5], [17.5, 62.3], [17.3, 61], [18.9, 60], [18, 59], [16.6, 57.3], [16, 56.1], [14.3, 55.5], [12.9, 55.4], [12.5, 56.5], [11.8, 57.7], [11.1, 59], [10.5, 59.3], [8.3, 58.1], [6, 58.1], [5.5, 59.2], [5, 61.5], [6.5, 62.6], [8.6, 63.4], [10.5, 64.5], [12.5, 66], [14.5, 67.6], [16.5, 68.6], [19, 69.9], [23, 70.8], [28, 71.1], [31, 70], [33, 69.3], [36, 69.1], [41, 67.6], [40.5, 66.5], [37, 66.2], [34.8, 64.7], [37, 63.9], [39.5, 64.6], [44, 66.2], [44, 68.4], [46, 68.3], [53, 68.7], [57, 70.5], [61, 69.8], [66, 69.3], [68.5, 68.2], [72.5, 72.7], [78, 72.4], [80.5, 73.6], [87, 74.5], [96, 76], [104, 77.7], [111, 76.7], [113.5, 73.6], [119, 73], [127, 73.5], [132, 71.5], [140, 72.4], [150, 71.5], [160, 70.6], [170, 70], [180, 69], [180, 65.5], [178, 64.7], [177, 62.5], [172, 61], [164, 59.9], [163, 58], [162, 56], [156.5, 51], [156, 57.5], [155.5, 59.2], [151, 59.5], [143, 59.4], [137, 54], [141, 52.5], [140, 48], [137, 45], [133, 42.8], [130.7, 42.3], [129.5, 40.8], [128.4, 38.6], [129.4, 36], [129, 35.1], [126.5, 34.4], [126.2, 36.7], [126.7, 37.8], [124.7, 39.6], [121.2, 38.8], [122.3, 40.5], [121, 40.9], [119.5, 39.9], [117.8, 39], [118.8, 37.6], [119.7, 37.2], [120.8, 37.8], [122.6, 37.4], [120.3, 36], [119.2, 34.9], [120.8, 32.6], [121.9, 31.5], [121.8, 30], [120.5, 27.8], [119.3, 25.5], [117.2, 23.6], [114.2, 22.3], [112, 21.7], [110.4, 21.4], [108, 21.5], [106.7, 20.7], [105.8, 19], [106.6, 17.5], [108.8, 15.4], [109.2, 12], [107.5, 10.5], [105, 8.6], [104.8, 10.2], [103, 11], [100.9, 12.7], [100, 13.4], [99.2, 10.3], [100.3, 8.4], [101.3, 6.9], [103.4, 4.8], [103.5, 2.5], [104.2, 1.4], [103.4, 1.3], [101.3, 2.9], [100.4, 4.8], [100.2, 6.5], [98.3, 7.9], [98.5, 10.5], [98.6, 13.3], [97.8, 16.5], [97.2, 16.9], [95.4, 15.8], [94.3, 16.2], [94.6, 18.5], [92.4, 20.7], [91.8, 22.4], [90.6, 22.3], [89.3, 21.8], [86.9, 21.3], [86.5, 20.2], [84.9, 19.2], [82.3, 17], [80.3, 15.5], [80.2, 13.2], [79.9, 10.3], [78.4, 8.9], [77.5, 8.1], [76.3, 9.5], [75.7, 11.5], [74.6, 14], [73.4, 16], [72.8, 19], [72.8, 20.9], [72.2, 21.7], [70.5, 20.8], [69, 22.3], [68.4, 23.7], [67.4, 24], [66.6, 25.4], [64.5, 25.2], [61.6, 25.2], [57.3, 25.8], [56.8, 27.1], [54.7, 26.6], [53.5, 26.8], [51.5, 27.9], [50.2, 29.9], [48.9, 30.4], [47.9, 29.4], [48.4, 28.5], [49.6, 27], [50.2, 26.2], [50.8, 24.8], [51.2, 26.1], [51.6, 25.3], [51.6, 24.6], [53, 24.2], [54.5, 24.4], [55.5, 25.5], [56.3, 26.3], [56.4, 24.9], [57.2, 23.9], [58.6, 23.6], [59.8, 22.5], [58.5, 20.5], [57.8, 19], [56.6, 18.2], [55.3, 17.4], [52.2, 15.9], [49, 14.5], [45, 12.8], [43.5, 12.7], [42.8, 14.8], [42.7, 16.4], [41.5, 18.6], [39.2, 21.4], [38.4, 23.7], [37, 25.5], [35.2, 28], [34.9, 29.5], [34.2, 31.3], [34.5, 31.6], [34.9, 32.4], [35.1, 33.1], [35.5, 33.9], [35.9, 34.9], [35.8, 36.2], [36.2, 36.6], [35.5, 36.6], [34.6, 36.8], [32.8, 36.1], [30.6, 36.6], [29.2, 36.6], [27.5, 37], [27.2, 38.3], [26.4, 39.3], [26.2, 40.6], [25, 40.9], [23.8, 40.4], [22.6, 40.3], [23.3, 39.2], [22.9, 37.6], [23.1, 36.5], [21.6, 37], [21.4, 38.2], [20.7, 38.9], [20, 39.6], [19.4, 40.4], [19.5, 41.8], [18.5, 42.5], [17, 43.2], [15.2, 44.3], [13.6, 45.1], [13.8, 45.6], [12.4, 45.4], [12.3, 44.3], [13.5, 43.6], [15.5, 41.9], [18, 40.6], [18.5, 40.1], [17, 40.5], [16.6, 38.9], [15.7, 38], [15.6, 40], [14.3, 40.9], [12.5, 41.6], [11, 42.4], [10.1, 43.9], [8.5, 44.3], [7, 43.6], [5, 43.4], [3.2, 43.2], [3.2, 41.9], [1, 41], [0, 39.7], [-0.6, 38.4], [-0.8, 37.6], [-2.1, 36.7], [-4.4, 36.7], [-5.6, 36], [-6.4, 36.8], [-7.4, 37.2], [-8.9, 37]],
  // Islands of Europe
  [[-5.7, 50.1], [-3.5, 50.4], [1.4, 51.2], [1.7, 52.7], [0.2, 53.5], [-0.3, 54.3], [-1.6, 55.6], [-2.1, 57], [-1.8, 57.6], [-4, 57.6], [-3.1, 58.6], [-5, 58.6], [-5.7, 57.5], [-5.6, 56.3], [-4.9, 55.4], [-5.1, 54.8], [-3.2, 54.8], [-3.1, 53.9], [-3, 53.3], [-4.6, 53.3], [-4.2, 52.3], [-5.2, 51.8], [-3.2, 51.4], [-4.2, 51.1]],
  [[-10, 51.6], [-6.2, 52.2], [-6, 53.9], [-5.6, 54.6], [-7.3, 55.3], [-8.4, 54.6], [-10.2, 54.1], [-9.8, 53], [-10.4, 52.1]],
  [[-24, 65.5], [-22, 66.4], [-16, 66.5], [-13.5, 65.2], [-15, 64.3], [-18, 63.4], [-22.5, 63.8]],
  [[12.4, 38.1], [15.6, 38.3], [15.1, 36.7]],
  [[8.4, 41.1], [9.8, 41], [9.6, 39.1], [8.4, 39]],
  [[23.5, 35.6], [26.3, 35.3], [24.5, 34.9]],
  [[32.3, 35], [34.6, 35.6], [33.9, 34.6], [32.4, 34.7]],
  // Islands of Asia
  [[79.8, 8], [80.2, 9.8], [81.9, 7.4], [81, 6.1], [80, 6.3]],
  [[130, 31.4], [131.3, 31.4], [132, 33.8], [134.7, 33.8], [135.8, 33.5], [137, 34.6], [139, 34.9], [140.3, 35.1], [140.9, 36.9], [141, 38.3], [142, 39.5], [141.4, 41.4], [140, 40.7], [139.8, 39.5], [139.4, 38.2], [138.5, 37.4], [137.3, 36.8], [136.7, 37.3], [135.5, 35.6], [133, 35.5], [131, 34.4], [129.8, 33.2]],
  [[140, 41.5], [141.2, 41.8], [143.3, 42], [145.5, 43.3], [144.4, 44], [142, 45.4], [141.6, 44], [140.4, 43.2]],
  [[120.1, 23], [121, 25.2], [121.9, 24.8], [120.8, 21.9]],
  [[108.6, 19.2], [110.5, 20], [111, 19.6], [109.6, 18.2]],
  [[120.6, 18.5], [122.2, 18.5], [122.3, 16], [124, 13], [121.5, 13.8], [120.6, 14.3], [119.8, 16.4]],
  [[122, 7], [123.5, 8.6], [126.3, 9.3], [126.2, 6.3], [125.4, 5.6], [124, 6.6]],
  [[95.3, 5.6], [97.5, 5.2], [100.3, 2.5], [103.8, 1], [106, -3], [105.8, -5.8], [104.5, -5.9], [102.3, -4], [101, -2.5], [98.7, 1.7]],
  [[105.2, -6.8], [106.8, -6], [110.5, -6.9], [112.7, -6.9], [114.4, -7.7], [114.5, -8.7], [111, -8.2], [106.4, -7.4]],
  [[109, 1.5], [110, 1.7], [111.2, 2.6], [113, 3.2], [115.4, 5.3], [116.7, 7], [118.6, 5], [118, 4.3], [117.7, 2], [119, 1], [117.5, -0.5], [116.5, -1.5], [116.4, -3.8], [114.6, -4], [111.7, -3], [110.2, -2.9], [109.6, -1], [109, 0.3]],
  [[119.4, -5.5], [120.5, -5.6], [120.9, -2.6], [121.5, -1.9], [123.3, -0.9], [124.8, 1.5], [123, 0.9], [120.2, 0.8], [119.6, -0.5], [118.8, -2.8]],
  [[131, -1], [134, -0.9], [138, -1.6], [141, -2.6], [145, -4.5], [147.6, -6.1], [148, -8], [150.6, -10.6], [147, -10.1], [144.2, -7.7], [143.3, -9], [141, -9.2], [138.8, -8.2], [137.8, -5.4], [134.5, -4], [132.8, -4.1], [131.8, -2.8]],
  // Australia and New Zealand
  [[113.4, -22], [114, -26], [115, -30], [115, -33.6], [117.9, -35.1], [121.5, -33.8], [124, -33], [126, -32.2], [131, -31.5], [134, -32.6], [135.8, -34.8], [137.8, -33], [138, -35.6], [140, -37.4], [143.5, -38.8], [146.3, -39.1], [150, -37.5], [150.8, -34.6], [152.5, -32], [153.6, -28.5], [153.1, -25.5], [150.8, -22.6], [149, -20.4], [146.3, -18.9], [145.3, -15], [143.5, -14], [142.5, -10.8], [141.6, -12.8], [141.5, -15.5], [140.5, -17.6], [139, -17], [136, -15.5], [135.8, -13], [136.8, -12.2], [133, -11.3], [130.3, -12.2], [129.5, -15], [127.5, -14], [125, -14.6], [123, -16.5], [121.2, -19.5], [118.7, -20.3], [116.7, -20.6]],
  [[144.6, -40.7], [148.3, -40.9], [148, -43.2], [146.8, -43.6], [145.2, -42.2]],
  [[172.7, -34.4], [174.7, -36.9], [176, -37.7], [178.5, -37.7], [177.9, -39.2], [176.8, -40], [175.3, -41.6], [174.6, -41.3], [175.2, -40.2], [173.8, -39.2], [174.6, -37.9], [173.4, -35.5]],
  [[172.6, -40.5], [174.3, -41.7], [173.2, -43], [171.2, -44.5], [170.6, -45.9], [169, -46.6], [166.5, -46], [167.9, -44.5], [170.9, -42.6]],
];
// Seas inside the land above.
const WATER: Array<Array<[number, number]>> = [
  [[27.5, 42], [28.6, 44], [29.7, 45.3], [30.7, 46.5], [33.5, 46], [32.5, 45.3], [33.6, 44.4], [35.4, 45], [36.6, 45.3], [37.7, 46.6], [39.2, 47.2], [38.3, 46.2], [37.5, 44.7], [39.8, 43.3], [41.6, 41.6], [39, 41], [35, 42], [33, 41.9], [31, 41.1], [29, 41.2]],
  [[47, 44.6], [49, 46.6], [51.5, 47], [53.2, 46.7], [53, 45.3], [51.3, 44.5], [52.7, 42], [54, 39.3], [53.9, 37.4], [51, 36.8], [49, 37.6], [49.5, 40.3], [47.5, 42.8]],
];
const inside = (lon: number, lat: number, poly: Array<[number, number]>) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
export const isLand = (lon: number, lat: number) => LAND.some((p) => inside(lon, lat, p)) && !WATER.some((p) => inside(lon, lat, p));

/** The map's frame: the cities with room around them, never closer than a region, kept to the map's shape (1000 × 560). */
export type MapFrame = { lon0: number; lat1: number; span: number; latSpan: number; w: number; h: number };
export function mapFrame(points: Array<readonly [number, number]>): MapFrame {
  const w = 1000;
  const h = 560;
  if (!points.length) return { lon0: -170, lat1: 80, span: 340, latSpan: 340 * 0.8 * (h / w), w, h };
  const lats = points.map((p) => p[0]);
  const lons = points.map((p) => p[1]);
  let lonA = Math.min(...lons);
  let lonB = Math.max(...lons);
  let latA = Math.min(...lats);
  let latB = Math.max(...lats);
  const midLat = (latA + latB) / 2;
  const squeeze = Math.max(0.35, Math.cos((midLat * Math.PI) / 180));
  // Room around them, at least a region (40° of longitude) wide.
  let span = Math.max(40, (lonB - lonA) * 1.3 + 12, ((latB - latA) * 1.3 + 10) * (w / h) / squeeze);
  span = Math.min(360, span);
  const lonMid = (lonA + lonB) / 2;
  const latSpan = (span * squeeze * h) / w;
  lonA = Math.max(-180, Math.min(180 - span, lonMid - span / 2));
  latB = Math.min(84, Math.max(-56 + latSpan, (latA + latB) / 2 + latSpan / 2));
  return { lon0: lonA, lat1: latB, span, latSpan, w, h };
}
/** A place (latitude, longitude) on the map's frame. */
export function onMap(f: MapFrame, lat: number, lon: number): [number, number] {
  return [((lon - f.lon0) / f.span) * f.w, ((f.lat1 - lat) / f.latSpan) * f.h];
}
/** The dots of the land in the frame, about 70 across. */
export function mapDots(f: MapFrame): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const step = f.w / 72;
  for (let y = step / 2; y < f.h; y += step)
    for (let x = step / 2; x < f.w; x += step) {
      const lon = f.lon0 + (x / f.w) * f.span;
      const lat = f.lat1 - (y / f.h) * f.latSpan;
      if (lat > -58 && lat < 84 && isLand(lon, lat)) out.push([x, y]);
    }
  return out;
}
/** A flight's arc between two places on the map, bowed up by a share of its length. */
export function flightPath(a: [number, number], b: [number, number]): string {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${mx.toFixed(1)} ${(my - d * 0.28).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

/* ── Live ── */

export const LIVE_EVERY = ["minute", "hour", "day"] as const;
export type LiveEvery = (typeof LIVE_EVERY)[number];
export const EVERY_MS: Record<LiveEvery, number> = { minute: 60_000, hour: 3_600_000, day: 86_400_000 };
/** The counts as the server gives them, every bucket of the window in order (a missing one is 0). */
export function liveSeries(raw: unknown, every: LiveEvery, last: number, now = Date.now()): Array<{ at: number; n: number }> {
  const step = EVERY_MS[every];
  const end = Math.floor(now / step) * step;
  const got = new Map<number, number>();
  const list = raw && typeof raw === "object" && Array.isArray((raw as { counts?: unknown }).counts) ? ((raw as { counts: unknown[] }).counts) : [];
  for (const c of list) {
    const row = c && typeof c === "object" ? (c as Record<string, unknown>) : {};
    const at = typeof row.at === "string" ? Date.parse(row.at) : NaN;
    if (Number.isFinite(at) && typeof row.n === "number" && row.n >= 0) got.set(Math.floor(at / step) * step, row.n);
  }
  return Array.from({ length: last }, (_, i) => { const at = end - (last - 1 - i) * step; return { at, n: got.get(at) ?? 0 }; });
}
/** A smooth line through the points (a Catmull-Rom curve as Béziers). */
export function smoothLine(p: Array<[number, number]>): string {
  if (!p.length) return "";
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i];
    const b = p[i];
    const c = p[i + 1];
    const e = p[i + 2] ?? c;
    d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return d;
}
