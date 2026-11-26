/**
 * Editing a game by hand (G0b of docs/game-engine-plan.ar.md): what GameEditor.tsx does to a page's raw game
 * (its props.game, as the shop's pageTree/gameSpec.ts reads it): a new thing with its own name, a thing taken out
 * with every rule that named it, the names a rule can pick (each thing and each tag), a new rule's or action's
 * first values, and a rule told in a sentence. The names in Arabic, English and Hebrew. No React.
 */
import { GAME_LIMITS } from "../../../estabrek-storefront/src/pageTree/gameSpec";
import { say } from "./say";

export type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const list = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
export const thingsOf = (game: Obj) => list(game.things);
export const rulesOf = (game: Obj) => list(game.rules);

export const WHEN_NAMES = {
  start: "لما تبلّش اللعبة|When the game starts|כשהמשחק מתחיל",
  every: "كل كم ثانية|Every few seconds|כל כמה שניות",
  hit: "لما شي يلمس شي|When one thing meets another|כשדבר פוגש דבר",
  out: "لما شي يطلع برّا|When a thing leaves the world|כשדבר יוצא מהעולם",
  tap: "لما تنكبس على شي|When a thing is tapped|כשמקישים על דבר",
  key: "لما ينكبس زر|When a key is pressed|כשנלחץ מקש",
  score: "لما النقاط توصل|When the score reaches|כשהניקוד מגיע",
  time: "لما الوقت يوصل|When the time reaches|כשהזמן מגיע",
  see: "لما شي يشوف شي|When one thing sees another|כשדבר רואה דבר",
  level: "لما تبلّش مرحلة|When a level begins|כששלב מתחיל",
  shot: "لما ينضرب شي بالمقلاع|When a thing is slung|כשדבר נורה בקלע",
  rest: "لما يوقف بعد ما انضرب|When a slung thing comes to rest|כשדבר שנורה נעצר",
} as const;
export const ACT_NAMES = {
  spawn: "اعمل نسخة من|Make a copy of|צרו עותק של",
  destroy: "امحي|Remove|הסירו",
  score: "زيد النقاط|Add to the score|הוסיפו לניקוד",
  lives: "غيّر الأرواح|Change the lives|שנו את החיים",
  win: "ربح|Win|ניצחון",
  lose: "خسارة|Lose|הפסד",
  speed: "حط سرعة|Set a speed|קבעו מהירות",
  faster: "خلّي كل شي أسرع|Make everything faster|הכול מהר יותר",
  shake: "هزّ الشاشة|Shake the screen|נערו את המסך",
  sound: "صوت|A sound|צליל",
  burst: "انفجار صغير|A little burst|פיצוץ קטן",
  next: "عالمرحلة الجاية|On to the next level|לשלב הבא",
  retry: "المرحلة من أولها|This level again|השלב מההתחלה",
  home: "رجّعه لمكانه|Back where it started|חזרה למקום ההתחלה",
  explode: "انفجار بيدفع اللي حواليه|An explosion that pushes all round|פיצוץ שדוחף מסביב",
} as const;
export const SPOT_NAMES = {
  top: "من فوق|From the top|מלמעלה", bottom: "من تحت|From the bottom|מלמטה", left: "من الشمال|From the left|משמאל", right: "من اليمين|From the right|מימין",
  random: "بأي مكان|Anywhere|בכל מקום", floorRight: "عالأرض من اليمين|On the floor, from the right|על הרצפה, מימין", floorLeft: "عالأرض من الشمال|On the floor, from the left|על הרצפה, משמאל",
  self: "مكان الأول|Where the first one is|איפה שהראשון", other: "مكان التاني|Where the second one is|איפה שהשני", center: "بالنص|In the middle|באמצע",
} as const;
export const BODY_NAMES = { none: "بلا جسم|No body|בלי גוף", static: "ثابت|Fixed|קבוע", dynamic: "بيوقع ويندفع|Falls and is pushed|נופל ונדחף", kinematic: "بيمشي بسرعته|Moves by its speed|זז במהירותו", rigid: "جسم حقيقي: بيوقع وبيدور وبينكوّم|Rigid: falls, tumbles and stacks|קשיח: נופל, מתגלגל ונערם" } as const;
/** A rigid thing's shapes: its box, a circle, and convex shapes made of points in the box (-0.5…0.5). */
export const SHAPE_PICKS: Array<[string, string, Array<[number, number]> | null]> = [
  ["box", "مربّع|Box|ריבוע", null],
  ["circle", "دائرة|Circle|עיגול", null],
  ["triangle", "مثلّث|Triangle|משולש", [[0, -0.5], [0.5, 0.5], [-0.5, 0.5]]],
  ["ramp", "منحدر|Ramp|רמפה", [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5]]],
  ["diamond", "معيّن|Diamond|מעוין", [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]]],
  ["hexagon", "مسدّس|Hexagon|משושה", Array.from({ length: 6 }, (_, i): [number, number] => [Math.round(Math.cos((i * Math.PI) / 3) * 500) / 1000, Math.round(Math.sin((i * Math.PI) / 3) * 500) / 1000])],
];
/** Which of the picks a thing's shape is. */
export function shapePick(thing: Obj): string {
  if (thing.shape !== "poly") return thing.shape === "circle" ? "circle" : "box";
  const pts = JSON.stringify(thing.points);
  return SHAPE_PICKS.find(([, , p]) => p && JSON.stringify(p) === pts)?.[0] ?? "poly";
}
export const CONTROL_NAMES = { none: "ما حدا بيحرّكه|Nobody moves it|אף אחד לא מזיז", leftRight: "يمين وشمال|Left and right|ימינה ושמאלה", fourWay: "أربع اتجاهات|Four ways|ארבעה כיוונים", platform: "ركض ونط|Run and jump|ריצה וקפיצה", pointer: "بيلحق المؤشر|Follows the pointer|עוקב אחרי הסמן", drag: "بينسحب|Dragged|נגרר", sling: "مقلاع: اسحبه لورا وفلّته|A sling: pull it back and let go|קלע: משכו אחורה ושחררו" } as const;
export const BEHAVE_NAMES = {
  none: "ولا إشي|Nothing|כלום", patrol: "رايح جاي|Back and forth|הלוך ושוב", chase: "بيلحق اللاعب|Chases the player|רודף אחרי השחקן", wander: "بيتجوّل|Wanders|משוטט", spin: "بيدور|Spins|מסתובב",
  guard: "حارس: بيدوّر، وإذا شافك بيلحقك|A guard: goes round, chases you once it sees you|שומר: מסתובב, ורודף כשהוא רואה אתכם",
  flee: "بيهرب إذا شافك|Runs off when it sees you|בורח כשהוא רואה אתכם",
  homing: "بيلفّ صوب اللاعب|Turns toward the player|פונה אל השחקן",
  path: "بيمشي على مساره|Goes along its path|נע לאורך המסלול שלו",
} as const;
export const TRANSITION_NAMES = { circle: "دائرة بتسكّر وبتفتح|A circle closing and opening|עיגול שנסגר ונפתח", wipe: "مسحة من جنب لجنب|A wipe across|מחיקה מצד לצד", fade: "تلاشي|A fade|דהייה", none: "على طول|At once|מיד" } as const;
export const EDGE_NAMES = { walls: "حيطان من كل الجهات|Walls all round|קירות מכל הצדדים", sides: "حيطان إلا تحت|Walls but the bottom|קירות חוץ מלמטה", floor: "أرض بس|A floor only|רק רצפה", open: "مفتوح|Open|פתוח" } as const;
export const SOUND_NAMES = { click: "كبسة|Click|קליק", pop: "فقعة|Pop|פופ", chime: "رنّة|Chime|צלצול", whoosh: "ووش|Whoosh|ווש", success: "نجاح|Success|הצלחה", hit: "ضربة|Hit|מכה" } as const;
export const KEY_NAMES = { Space: "المسافة|Space|רווח", Enter: "Enter|Enter|Enter", ArrowUp: "⬆|⬆|⬆", ArrowDown: "⬇|⬇|⬇", ArrowLeft: "⬅|⬅|⬅", ArrowRight: "➡|➡|➡" } as const;
export const SIZES: Array<[number, number, string]> = [
  [960, 540, "عريض 16:9|Wide 16:9|רחב 16:9"], [800, 600, "4:3|4:3|4:3"], [640, 640, "مربّع|Square|ריבוע"], [540, 960, "طولي للموبايل|Tall, for phones|גבוה, לטלפון"],
];
export const LOOK_STARTS: Array<[string, string, Obj]> = [
  ["emoji", "⭐|⭐|⭐", { kind: "emoji", emoji: "⭐", color: "accent" }],
  ["box", "مربّع|Box|ריבוע", { kind: "box", color: "accent" }],
  ["circle", "دائرة|Circle|עיגול", { kind: "circle", color: "text" }],
  ["text", "كلام|Words|מילים", { kind: "text", text: { ar: "نص", en: "Text", he: "טקסט" }, color: "text" }],
];

/** A name for a new thing ("star-2"), its own in the game. */
export function freshId(game: Obj, base: string): string {
  const taken = new Set(thingsOf(game).map((t) => String(t.id)));
  const stem = base.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 18) || "thing";
  if (!taken.has(stem)) return stem;
  for (let n = 2; ; n++) if (!taken.has(`${stem}-${n}`)) return `${stem}-${n}`;
}
/** The game with a new thing in the middle of its world (null: it holds as many as it may). */
export function withNewThing(game: Obj, look: Obj, base: string): { game: Obj; id: string } | null {
  if (thingsOf(game).length >= GAME_LIMITS.things) return null;
  const id = freshId(game, base);
  const w = Number(game.w) || 960, h = Number(game.h) || 540;
  const thing = { id, look: structuredClone(look), x: Math.round(w / 2), y: Math.round(h / 2), w: 64, h: 64, body: "kinematic" };
  return { game: { ...game, things: [...thingsOf(game), thing] }, id };
}

/** The game without a thing, and without every rule that named it (or a tag only it had), every copy of it made, and
 *  every kind of tile that put it on the map. */
export function withoutThing(game: Obj, id: string): Obj {
  const tileKinds = Object.entries(obj(obj(game.tiles).kinds)).filter(([, k]) => obj(k).thing === id).map(([c]) => c);
  if (tileKinds.length) game = tileKinds.reduce((g, c) => withoutTileKind(g, c), game);
  const things = thingsOf(game).filter((t) => t.id !== id);
  const tags = new Set([...things.flatMap((t) => list(t.tags).map(String)), ...Object.values(obj(obj(game.tiles).kinds)).flatMap((k) => list(obj(k).tags).map(String))]);
  const known = (who: unknown) => typeof who !== "string" || (who.startsWith("#") ? tags.has(who.slice(1)) : things.some((t) => t.id === who));
  const rules = rulesOf(game).flatMap((r) => {
    const w = obj(r.when);
    if (![w.a, w.b, w.who].every(known)) return [];
    const acts = list(r.do).filter((a) => !(a.act === "spawn" && a.what === id));
    return acts.length ? [{ ...r, do: acts }] : [];
  });
  return { ...game, things, rules };
}

/** What a rule can name: each thing (by its id) and each tag ("#tag", every thing that has it). */
export function whoOptions(game: Obj): Array<[string, string]> {
  const things = thingsOf(game);
  const label = (t: Obj) => {
    const lk = obj(t.look);
    return `${lk.kind === "emoji" ? `${String(lk.emoji ?? "")} ` : ""}${String(t.id)}`;
  };
  // Things' tags and the tile map's (a rule meets a tile by its tag).
  const tileTags = Object.values(obj(obj(game.tiles).kinds)).flatMap((k) => list(obj(k).tags).map(String));
  const tags = [...new Set([...things.flatMap((t) => list(t.tags).map(String)), ...tileTags])];
  return [...things.map((t): [string, string] => [String(t.id), label(t)]), ...tags.map((t): [string, string] => [`#${t}`, `#${t} (${say("كل اللي معهم هالعلامة|every thing with this tag|כל מה שיש לו התגית")})`])];
}
export const templatesOf = (game: Obj) => thingsOf(game).filter((t) => t.template === true);

/** A new rule's "when", with its first values. */
export function newWhen(on: keyof typeof WHEN_NAMES, game: Obj): Obj {
  const who = whoOptions(game)[0]?.[0] ?? "";
  switch (on) {
    case "every": return { on, seconds: 1 };
    case "hit": return { on, a: who, b: whoOptions(game)[1]?.[0] ?? who };
    case "out": case "tap": case "shot": case "rest": return { on, who };
    case "key": return { on, key: "Space" };
    case "score": return { on, at: 10 };
    case "time": return { on, at: 10 };
    case "see": return { on, a: who, b: whoOptions(game)[1]?.[0] ?? who };
    case "level": return { on, at: 0 };
    default: return { on: "start" };
  }
}
/** A new action, with its first values. */
export function newAct(act: keyof typeof ACT_NAMES, game: Obj): Obj {
  switch (act) {
    case "spawn": return { act, what: String(templatesOf(game)[0]?.id ?? ""), at: "top" };
    case "destroy": return { act, who: "other" };
    case "score": return { act, add: 1 };
    case "lives": return { act, add: -1 };
    case "speed": return { act, who: "self", vx: 0, vy: -300 };
    case "faster": return { act, by: 1.2 };
    case "sound": return { act, kind: "pop" };
    case "burst": return { act, who: "self" };
    case "home": return { act, who: "self" };
    case "explode": return { act, who: "self", radius: 160, power: 900 };
    default: return { act };
  }
}
/** Can this action be in the game: a copy needs a template to copy. */
export const actPossible = (act: string, game: Obj) => act !== "spawn" || templatesOf(game).length > 0;

/** A rule in a sentence: "When bag meets #good → burst, remove the second, +1 point". */
export function ruleText(rule: Obj): string {
  const w = obj(rule.when);
  const n = (v: unknown) => String(v ?? "");
  const when = (() => {
    switch (w.on) {
      case "every": return say(`كل ${n(w.seconds)} ثانية|Every ${n(w.seconds)} s|כל ${n(w.seconds)} שנ׳`);
      case "hit": return say(`لما ${n(w.a)} يلمس ${n(w.b)}|When ${n(w.a)} meets ${n(w.b)}|כש־${n(w.a)} פוגש ${n(w.b)}`);
      case "out": return say(`لما ${n(w.who)} يطلع برّا|When ${n(w.who)} leaves|כש־${n(w.who)} יוצא`);
      case "tap": return say(`لما تنكبس على ${n(w.who)}|When ${n(w.who)} is tapped|כשמקישים על ${n(w.who)}`);
      case "key": return say(`لما ينكبس ${say(KEY_NAMES[w.key as keyof typeof KEY_NAMES] ?? n(w.key))}|When ${n(w.key)} is pressed|כשנלחץ ${n(w.key)}`);
      case "score": return say(`لما النقاط توصل ${n(w.at)}|When the score reaches ${n(w.at)}|כשהניקוד מגיע ל־${n(w.at)}`);
      case "time": return say(`لما الوقت يوصل ${n(w.at)} ث|At ${n(w.at)} s|ב־${n(w.at)} שנ׳`);
      case "see": return say(`لما ${n(w.a)} يشوف ${n(w.b)}|When ${n(w.a)} sees ${n(w.b)}|כש־${n(w.a)} רואה את ${n(w.b)}`);
      case "shot": return say(`لما ينضرب ${n(w.who)}|When ${n(w.who)} is slung|כש־${n(w.who)} נורה`);
      case "rest": return say(`لما يوقف ${n(w.who)}|When ${n(w.who)} comes to rest|כש־${n(w.who)} נעצר`);
      case "level": return Number(w.at) ? say(`لما تبلّش المرحلة ${n(w.at)}|When level ${n(w.at)} begins|כששלב ${n(w.at)} מתחיל`) : say("لما تبلّش أي مرحلة|When any level begins|כשכל שלב מתחיל");
      default: return say(WHEN_NAMES.start);
    }
  })();
  const acts = list(rule.do).map((a) => {
    switch (a.act) {
      case "spawn": return say(`نسخة من ${n(a.what)}|a copy of ${n(a.what)}|עותק של ${n(a.what)}`);
      case "destroy": return say(`امحي ${a.who === "self" ? "الأول" : a.who === "both" ? "التنين" : "التاني"}|remove ${a.who === "self" ? "the first" : a.who === "both" ? "both" : "the second"}|הסירו ${a.who === "self" ? "את הראשון" : a.who === "both" ? "את שניהם" : "את השני"}`);
      case "score": return `${Number(a.add) >= 0 ? "+" : ""}${n(a.add)} ${say("نقاط|points|נקודות")}`;
      case "lives": return `${Number(a.add) >= 0 ? "+" : ""}${n(a.add)} ${say("أرواح|lives|חיים")}`;
      case "faster": return `${say("أسرع|faster|מהר יותר")} ×${n(a.by)}`;
      case "sound": return `${say("صوت|sound|צליל")} ${say(SOUND_NAMES[a.kind as keyof typeof SOUND_NAMES] ?? n(a.kind))}`;
      default: return say(ACT_NAMES[a.act as keyof typeof ACT_NAMES] ?? n(a.act));
    }
  });
  return `${when} ${say("←|→|←")} ${acts.join(say("، |, |, "))}`;
}

/* ---------------------------------------------------------------- G1: the tile map, the world's size */

/** The letters a kind of tile can be, in the order new kinds take them. */
export const TILE_CHARS = "#=^*+%&$ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const nextTileChar = (game: Obj) => [...TILE_CHARS].find((c) => !(c in obj(obj(game.tiles).kinds))) ?? null;
/** The world's size: its tile map's, else its own, else the view's. */
export function worldSize(game: Obj): [number, number] {
  const w = Number(game.w) || 960, h = Number(game.h) || 540;
  const t = obj(game.tiles);
  if (Object.keys(t).length) return [Math.max(w, (Number(t.cols) || 1) * (Number(t.size) || 48)), Math.max(h, (Number(t.rows) || 1) * (Number(t.size) || 48))];
  return [Math.max(w, Number(game.ww) || w), Math.max(h, Number(game.wh) || h)];
}
/** A tile map for the game: three views wide, a floor along its bottom, and the camera on the player. */
export function withTiles(game: Obj): Obj {
  const w = Number(game.w) || 960, h = Number(game.h) || 540, size = 48;
  const cols = Math.ceil(w / size) * 3, rows = Math.ceil(h / size);
  const map = Array.from({ length: rows }, (_, r) => (r === rows - 1 ? "#" : ".").repeat(cols));
  const player = thingsOf(game).find((t) => (Array.isArray(t.tags) ? t.tags : []).includes("player"));
  return { ...game, tiles: { size, cols, rows, map, kinds: { "#": { look: { kind: "box", color: "text" }, solid: true } } }, camera: { follow: player ? "#player" : "", lerp: 0.14 } };
}
/** The map at a new size: rows and columns kept from the top-left, cut or filled with empty cells. */
export function resizedMap(map: string[], cols: number, rows: number): string[] {
  return Array.from({ length: rows }, (_, r) => (map[r] ?? "").slice(0, cols).padEnd(cols, "."));
}
/** Cells painted with a kind ("." rubs them out). */
export function paintCells(map: string[], cells: Array<[number, number]>, ch: string): string[] {
  const rows = map.map((r) => r.split(""));
  for (const [c, r] of cells) if (rows[r] && c >= 0 && c < rows[r].length) rows[r][c] = ch;
  return rows.map((r) => r.join(""));
}
/** The game without a kind of tile: its cells emptied on every level, and the rules that named a tag only it had. */
export function withoutTileKind(game: Obj, ch: string): Obj {
  const t = obj(game.tiles);
  const kinds = { ...obj(t.kinds) };
  delete kinds[ch];
  const clear = (m: unknown) => (Array.isArray(m) ? (m as string[]) : []).map((r) => r.split(ch).join("."));
  const next = { ...game, tiles: { ...t, kinds, map: clear(t.map), ...(Array.isArray(t.levels) ? { levels: (t.levels as unknown[]).map(clear) } : {}) } };
  const tags = new Set([...thingsOf(next).flatMap((x) => list(x.tags).map(String)), ...Object.values(kinds).flatMap((k) => list(obj(k).tags).map(String))]);
  const known = (who: unknown) => typeof who !== "string" || !who.startsWith("#") || tags.has(who.slice(1));
  return { ...next, rules: rulesOf(next).filter((r) => [obj(r.when).a, obj(r.when).b, obj(r.when).who].every(known)) };
}

/* ---------------------------------------------------------------- G1b: levels, a thing's path */

/** Every level's map, the first (the tile map's own `map`) first. */
export function levelMaps(game: Obj): string[][] {
  const t = obj(game.tiles);
  const map = (Array.isArray(t.map) ? t.map : []) as string[];
  return [map, ...((Array.isArray(t.levels) ? t.levels : []) as string[][])];
}
/** The game with one level's map changed. */
export function withLevelMap(game: Obj, i: number, map: string[]): Obj {
  const t = obj(game.tiles);
  if (i === 0) return { ...game, tiles: { ...t, map } };
  return { ...game, tiles: { ...t, levels: levelMaps(game).slice(1).map((m, j) => (j === i - 1 ? map : m)) } };
}
/** A new level after the last, a copy of level `from` to change (null: as many as there may be). */
export function withNewLevel(game: Obj, from: number): Obj | null {
  const maps = levelMaps(game);
  if (maps.length >= GAME_LIMITS.levels) return null;
  return { ...game, tiles: { ...obj(game.tiles), levels: [...maps.slice(1), [...(maps[from] ?? maps[0])]] } };
}
/** The game without a level (not the first), and without rules for levels that are no more. */
export function withoutLevel(game: Obj, i: number): Obj {
  if (i <= 0) return game;
  const levels = levelMaps(game).slice(1).filter((_, j) => j !== i - 1);
  const t = { ...obj(game.tiles), levels };
  if (!levels.length) delete (t as Obj).levels;
  const count = 1 + levels.length;
  return { ...game, tiles: t, rules: rulesOf(game).filter((r) => obj(r.when).on !== "level" || Number(obj(r.when).at) <= count) };
}
/** Every level's map at a new size. */
export function resizedLevels(game: Obj, cols: number, rows: number): Obj {
  const [first, ...rest] = levelMaps(game);
  return { ...game, tiles: { ...obj(game.tiles), cols, rows, map: resizedMap(first, cols, rows), ...(rest.length ? { levels: rest.map((m) => resizedMap(m, cols, rows)) } : {}) } };
}
/** A thing's path: its points after where it starts (from it), and the path with a point added or moved. */
export const pathPoints = (thing: Obj): Array<[number, number]> => ((Array.isArray(obj(thing.path).points) ? obj(thing.path).points : []) as Array<[number, number]>);
export function withPathPoint(thing: Obj, x: number, y: number, i?: number): Obj {
  const pts = pathPoints(thing);
  const at: [number, number] = [Math.round(x - Number(thing.x ?? 0)), Math.round(y - Number(thing.y ?? 0))];
  const points = i === undefined ? [...pts, at].slice(0, GAME_LIMITS.path) : pts.map((p, j) => (j === i ? at : p));
  return { ...obj(thing.path), points };
}
