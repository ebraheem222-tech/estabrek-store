/**
 * Ready games for the games stage (G0): each an original game of a well-known kind, made only of the stage's own
 * pieces (things, rules), so the owner can change any of it. Their words come in Arabic, English and Hebrew; their
 * things are emoji and the theme's colours until the owner puts the store's own pictures in.
 * Pure (no React, no "@/" imports): the admin adds them, the shop's tests play them.
 */

type L = { ar: string; en: string; he: string };
const w = (ar: string, en: string, he: string): L => ({ ar, en, he });
type Raw = Record<string, unknown>;

const WORDS = {
  start: w("ابدأ", "Start", "התחלה"),
  win: w("ربحت! 🎉", "You won! 🎉", "ניצחת! 🎉"),
  lose: w("خلصت اللعبة", "Game over", "המשחק נגמר"),
  again: w("العب كمان مرة", "Play again", "שחקו שוב"),
};
const words = (title: L, help: L, prize?: L) => ({ ...WORDS, title, help, ...(prize ? { prize } : {}) });
const emoji = (e: string) => ({ kind: "emoji", emoji: e, color: "accent" });

export type ReadyGame = { key: string; name: L; line: L; icon: string; game: Raw };

/** Catch: what falls is caught in the bag; what burns takes a life. */
const CATCH: Raw = {
  w: 960, h: 540, bg: "surface", edges: "open", lives: 3, winScore: 25, seed: 11,
  things: [
    { id: "bag", look: emoji("🛍️"), x: 480, y: 480, w: 96, h: 96, body: "kinematic", control: "leftRight", speed: 560, keepIn: true, tags: ["player"] },
    { id: "gift", look: emoji("🎁"), x: 0, y: 0, w: 58, h: 58, body: "kinematic", vy: 230, template: true, tags: ["good"] },
    { id: "fire", look: emoji("🔥"), x: 0, y: 0, w: 54, h: 54, body: "kinematic", vy: 290, template: true, tags: ["bad"] },
  ],
  rules: [
    { when: { on: "every", seconds: 0.8 }, do: [{ act: "spawn", what: "gift", at: "top" }] },
    { when: { on: "every", seconds: 2.1 }, do: [{ act: "spawn", what: "fire", at: "top" }] },
    { when: { on: "hit", a: "#player", b: "#good" }, do: [{ act: "burst", who: "other" }, { act: "destroy", who: "other" }, { act: "score", add: 1 }, { act: "sound", kind: "pop" }] },
    { when: { on: "hit", a: "#player", b: "#bad" }, do: [{ act: "destroy", who: "other" }, { act: "lives", add: -1 }, { act: "shake" }, { act: "sound", kind: "hit" }] },
    { when: { on: "score", at: 10 }, do: [{ act: "faster", by: 1.2 }] },
    { when: { on: "score", at: 18 }, do: [{ act: "faster", by: 1.2 }] },
  ],
  words: words(w("لقّط الهدايا", "Catch the gifts", "תפסו את המתנות"), w("حرّك الكيس بالأسهم أو بإصبعك: الهدايا بتزيد السكور، والنار بتاخد روح.", "Move the bag with the arrows or your finger: gifts add to the score, fire takes a life.", "הזיזו את השקית בחצים או באצבע: מתנות מוסיפות נקודות, אש לוקחת חיים.")),
};

/** Dodge: stay alive under the falling rocks until the clock runs out. */
const DODGE: Raw = {
  w: 960, h: 540, bg: "deep", edges: "open", lives: 3, time: 30, timeWins: true, seed: 23,
  things: [
    { id: "ship", look: emoji("🚀"), x: 480, y: 470, w: 70, h: 70, body: "kinematic", control: "leftRight", speed: 620, keepIn: true, tags: ["player"] },
    { id: "rock", look: emoji("☄️"), x: 0, y: 0, w: 60, h: 60, body: "kinematic", vy: 320, template: true, behave: "spin", tags: ["hazard"] },
  ],
  rules: [
    { when: { on: "every", seconds: 0.45 }, do: [{ act: "spawn", what: "rock", at: "top" }] },
    { when: { on: "time", at: 10 }, do: [{ act: "faster", by: 1.25 }] },
    { when: { on: "time", at: 20 }, do: [{ act: "faster", by: 1.25 }] },
    { when: { on: "hit", a: "#player", b: "#hazard" }, do: [{ act: "burst", who: "other" }, { act: "destroy", who: "other" }, { act: "lives", add: -1 }, { act: "shake" }, { act: "sound", kind: "hit" }] },
  ],
  words: words(w("تفادى النيازك", "Dodge the meteors", "התחמקו מהמטאורים"), w("ضلّك عايش 30 ثانية: حرّك الصاروخ يمين وشمال.", "Stay alive for 30 seconds: move the rocket left and right.", "שרדו 30 שניות: הזיזו את הטיל ימינה ושמאלה.")),
};

/** Tap: stars come and go; tap them before they're gone. */
const TAP: Raw = {
  w: 960, h: 540, bg: "accent-soft", edges: "walls", lives: 0, time: 30, winScore: 20, seed: 37,
  things: [
    { id: "moon", look: emoji("🌙"), x: 60, y: 60, w: 60, h: 60, body: "static", tags: ["decor"] },
    { id: "star", look: emoji("⭐"), x: 0, y: 0, w: 76, h: 76, body: "none", life: 1.3, template: true, behave: "spin", tags: ["target"] },
  ],
  rules: [
    { when: { on: "start" }, do: [{ act: "spawn", what: "star", at: "random" }] },
    { when: { on: "every", seconds: 0.6 }, do: [{ act: "spawn", what: "star", at: "random" }] },
    { when: { on: "tap", who: "#target" }, do: [{ act: "burst" }, { act: "destroy", who: "self" }, { act: "score", add: 1 }, { act: "sound", kind: "pop" }] },
  ],
  words: words(w("نقّر النجوم", "Tap the stars", "הקישו על הכוכבים"), w("20 نجمة بـ30 ثانية: انقر كل نجمة قبل ما تختفي.", "20 stars in 30 seconds: tap each star before it's gone.", "20 כוכבים ב־30 שניות: הקישו על כל כוכב לפני שהוא נעלם.")),
};

/** Jump: run on and jump what comes. */
const JUMP: Raw = {
  w: 960, h: 540, bg: "surface", edges: "floor", gravity: 2600, lives: 3, time: 30, timeWins: true, seed: 41,
  things: [
    { id: "runner", look: emoji("🐰"), x: 170, y: 470, w: 72, h: 72, body: "dynamic", control: "platform", speed: 0, jump: 1000, keepIn: true, tags: ["player"] },
    { id: "cactus", look: emoji("🌵"), x: 0, y: 0, w: 52, h: 74, body: "kinematic", vx: -430, template: true, tags: ["hazard"] },
  ],
  rules: [
    { when: { on: "every", seconds: 1.5 }, do: [{ act: "spawn", what: "cactus", at: "floorRight" }] },
    { when: { on: "time", at: 12 }, do: [{ act: "faster", by: 1.2 }] },
    { when: { on: "time", at: 22 }, do: [{ act: "faster", by: 1.15 }] },
    { when: { on: "hit", a: "#player", b: "#hazard" }, do: [{ act: "burst", who: "other" }, { act: "destroy", who: "other" }, { act: "lives", add: -1 }, { act: "shake" }, { act: "sound", kind: "hit" }] },
    { when: { on: "out", who: "#hazard" }, do: [{ act: "score", add: 1 }] },
  ],
  words: words(w("نطّ فوق الصبّار", "Jump the cactus", "קפצו מעל הקקטוס"), w("المسافة أو السهم لفوق أو كبسة عالشاشة: نطّ. ضلّك 30 ثانية.", "Space, the up arrow or a tap: jump. Last 30 seconds.", "רווח, חץ למעלה או הקשה: קפיצה. שרדו 30 שניות.")),
};

/** Bricks: a ball, a paddle and a wall of bricks to break. */
const BRICKS_COLS = 8, BRICKS_ROWS = 3;
const bricks = Array.from({ length: BRICKS_COLS * BRICKS_ROWS }, (_, i) => {
  const c = i % BRICKS_COLS, r = Math.floor(i / BRICKS_COLS);
  return { id: `brick-${i + 1}`, look: { kind: "box", color: ["accent", "accent-soft", "text"][r] }, x: 105 + c * 107, y: 80 + r * 46, w: 98, h: 36, body: "static", solid: true, tags: ["brick"] };
});
const BRICKS: Raw = {
  w: 960, h: 540, bg: "bg", edges: "sides", lives: 3, winScore: BRICKS_COLS * BRICKS_ROWS, seed: 53,
  things: [
    { id: "paddle", look: { kind: "box", color: "accent" }, x: 480, y: 505, w: 150, h: 20, body: "kinematic", control: "leftRight", speed: 700, keepIn: true, solid: true, tags: ["player"] },
    { id: "ball", look: { kind: "circle", color: "text" }, x: 480, y: 470, w: 22, h: 22, body: "dynamic", gravity: 0, bounce: 1, vx: 250, vy: -330, tags: ["ball"] },
    { id: "ball-new", look: { kind: "circle", color: "text" }, x: 0, y: 0, w: 22, h: 22, body: "dynamic", gravity: 0, bounce: 1, vx: 240, vy: -340, template: true, tags: ["ball"] },
    ...bricks,
  ],
  rules: [
    { when: { on: "hit", a: "#brick", b: "#ball" }, do: [{ act: "burst" }, { act: "destroy", who: "self" }, { act: "score", add: 1 }, { act: "sound", kind: "pop" }] },
    { when: { on: "out", who: "#ball" }, do: [{ act: "lives", add: -1 }, { act: "shake" }, { act: "spawn", what: "ball-new", at: "center" }] },
  ],
  words: words(w("كسّر الحيط", "Break the wall", "שברו את החומה"), w("حرّك اللوح لترجّع الطابة وتكسّر كل الطوب.", "Move the paddle to send the ball back and break every brick.", "הזיזו את המחבט כדי להחזיר את הכדור ולשבור כל לבנה.")),
};

/** Balloons: they rise; pop them before they float away. */
const BALLOONS: Raw = {
  w: 960, h: 540, bg: "accent-soft", edges: "open", lives: 5, winScore: 25, seed: 67,
  things: [
    { id: "cloud", look: emoji("☁️"), x: 880, y: 60, w: 90, h: 70, body: "static", tags: ["decor"] },
    { id: "balloon", look: emoji("🎈"), x: 0, y: 0, w: 70, h: 84, body: "kinematic", vy: -170, template: true, tags: ["balloon"] },
  ],
  rules: [
    { when: { on: "start" }, do: [{ act: "spawn", what: "balloon", at: "bottom" }] },
    { when: { on: "every", seconds: 0.9 }, do: [{ act: "spawn", what: "balloon", at: "bottom" }] },
    { when: { on: "tap", who: "#balloon" }, do: [{ act: "burst" }, { act: "destroy", who: "self" }, { act: "score", add: 1 }, { act: "sound", kind: "pop" }] },
    { when: { on: "out", who: "#balloon" }, do: [{ act: "lives", add: -1 }] },
    { when: { on: "score", at: 12 }, do: [{ act: "faster", by: 1.3 }] },
  ],
  words: words(w("فقّع البالونات", "Pop the balloons", "פוצצו את הבלונים"), w("فقّع البالونات قبل ما تطير لفوق: كل وحدة بتطير بتاخد روح.", "Pop the balloons before they float off: each one that gets away takes a life.", "פוצצו את הבלונים לפני שהם עפים: כל אחד שבורח לוקח חיים.")),
};

/** Adventure (G1, G1b): two levels, each a world three views wide on a tile map, the camera following the fox; pits,
 *  fire, snails, gems, a flag to the next level; on the second a lift across a wide pit and a hedgehog that guards a wall. */
const ADV_COLS = 64, ADV_ROWS = 12, ADV_Z = 45;
const advMap = (() => {
  const g = Array.from({ length: ADV_ROWS }, () => Array<string>(ADV_COLS).fill("."));
  const put = (c: number, r: number, ch: string) => { g[r][c] = ch; };
  const pits = [[14, 16], [30, 32], [47, 49]];
  for (let c = 0; c < ADV_COLS; c++) if (!pits.some(([a, b]) => c >= a && c <= b)) { put(c, 10, "#"); put(c, 11, "#"); }
  const platforms: Array<[number, number, number]> = [[7, 11, 7], [17, 22, 6], [25, 28, 8], [34, 39, 7], [41, 44, 5], [51, 56, 7]];
  for (const [a, b, r] of platforms) for (let c = a; c <= b; c++) { put(c, r, "="); if ((c - a) % 2 === 1) put(c, r - 1, "o"); }
  for (const c of [5, 24, 37, 59]) put(c, 9, "o");
  for (const c of [20, 21, 39, 58]) put(c, 9, "^");
  for (const c of [11, 27, 44, 54]) put(c, 9, "e");
  put(61, 9, "F");
  return g.map((r) => r.join(""));
})();
const advMap2 = (() => {
  const g = Array.from({ length: ADV_ROWS }, () => Array<string>(ADV_COLS).fill("."));
  const put = (c: number, r: number, ch: string) => { g[r][c] = ch; };
  const pits = [[12, 13], [22, 29], [40, 42], [52, 53]];
  for (let c = 0; c < ADV_COLS; c++) if (!pits.some(([a, b]) => c >= a && c <= b)) { put(c, 10, "#"); put(c, 11, "#"); }
  const platforms: Array<[number, number, number]> = [[6, 9, 7], [15, 19, 6], [43, 47, 7], [55, 59, 6]];
  for (const [a, b, r] of platforms) for (let c = a; c <= b; c++) { put(c, r, "="); if ((c - a) % 2 === 0) put(c, r - 1, "o"); }
  // A lift across the wide pit (it goes there and back), gems over the pit, a low wall a hedgehog guards.
  put(23, 10, "L");
  for (const c of [24, 26, 28]) put(c, 7, "o");
  put(34, 9, "#");
  put(37, 9, "h");
  for (const c of [17, 45, 57]) put(c, 9, "e");
  for (const c of [32, 49]) put(c, 9, "^");
  put(61, 9, "F");
  return g.map((r) => r.join(""));
})();
const ADVENTURE: Raw = {
  w: 960, h: 540, bg: "accent-soft", edges: "sides", gravity: 2500, lives: 3, time: 120, seed: 71, transition: "circle",
  camera: { follow: "#player", lerp: 0.14 },
  layers: [
    { kind: "gradient", color: "accent-soft", color2: "surface", factor: 0, y: 0, h: 1 },
    { kind: "gradient", color: "surface", color2: "accent-soft", factor: 0.25, y: 0.55, h: 0.45 },
  ],
  tiles: {
    size: ADV_Z, cols: ADV_COLS, rows: ADV_ROWS, map: advMap, levels: [advMap2],
    kinds: {
      "#": { look: { kind: "box", color: "text" }, solid: true },
      "=": { look: { kind: "box", color: "accent" }, oneWay: true },
      "^": { look: { kind: "emoji", emoji: "🔥", color: "accent" }, tags: ["hazard"] },
      "o": { look: { kind: "emoji", emoji: "💎", color: "accent" }, thing: "gem" },
      "e": { look: { kind: "emoji", emoji: "🐌", color: "accent" }, thing: "snail" },
      "F": { look: { kind: "emoji", emoji: "🏁", color: "accent" }, thing: "flag" },
      "L": { look: { kind: "box", color: "accent" }, thing: "lift" },
      "h": { look: { kind: "emoji", emoji: "🦔", color: "accent" }, thing: "hedgehog" },
    },
  },
  things: [
    { id: "fox", look: emoji("🦊"), x: 2 * ADV_Z + ADV_Z / 2, y: 9 * ADV_Z, w: 52, h: 52, body: "dynamic", control: "platform", speed: 330, jump: 960, tags: ["player"] },
    { id: "gem", look: emoji("💎"), x: 0, y: 0, w: 34, h: 34, body: "none", template: true, behave: "spin", tags: ["gem"] },
    { id: "snail", look: emoji("🐌"), x: 0, y: 0, w: 46, h: 40, body: "dynamic", behave: "patrol", speed: 70, template: true, tags: ["enemy"] },
    { id: "flag", look: emoji("🏁"), x: 0, y: 0, w: 56, h: 70, body: "none", template: true, tags: ["goal"] },
    { id: "lift", look: { kind: "box", color: "accent" }, x: 0, y: 0, w: 135, h: 24, body: "kinematic", solid: true, behave: "path", speed: 110, path: { points: [[225, 0]] }, template: true },
    { id: "hedgehog", look: emoji("🦔"), x: 0, y: 0, w: 48, h: 40, body: "dynamic", behave: "guard", speed: 120, sight: 330, jump: 700, template: true, tags: ["enemy"] },
  ],
  rules: [
    { when: { on: "hit", a: "#player", b: "#gem" }, do: [{ act: "burst", who: "other" }, { act: "destroy", who: "other" }, { act: "score", add: 1 }, { act: "sound", kind: "pop" }] },
    { when: { on: "hit", a: "#player", b: "#hazard" }, do: [{ act: "lives", add: -1 }, { act: "speed", who: "self", vx: 0, vy: -700 }, { act: "shake" }, { act: "sound", kind: "hit" }] },
    { when: { on: "hit", a: "#player", b: "#enemy" }, do: [{ act: "burst", who: "other" }, { act: "destroy", who: "other" }, { act: "lives", add: -1 }, { act: "shake" }, { act: "sound", kind: "hit" }] },
    { when: { on: "hit", a: "#player", b: "#goal" }, do: [{ act: "sound", kind: "chime" }, { act: "next" }] },
    { when: { on: "out", who: "#player" }, do: [{ act: "lives", add: -1 }, { act: "retry" }] },
  ],
  words: words(w("مغامرة الثعلب", "The fox's adventure", "ההרפתקה של השועל"), w("الأسهم بتمشّي والمسافة بتنطّ: لمّ الألماس، تفادى النار والحلازين والقنفذ، ووصل للعلم بالمرحلتين.", "Arrows to run, Space to jump: gather the gems, dodge the fire, the snails and the hedgehog, and reach the flag on both levels.", "חצים לריצה, רווח לקפיצה: אספו יהלומים, התחמקו מהאש, מהחלזונות ומהקיפוד, והגיעו לדגל בשני השלבים.")),
};

/** Maze (G1b): a new maze made from the seed on each of three levels; flowers to gather, spiders that chase the bee
 *  once they see it (along the maze's shortest way), the hive to reach. */
const MAZE_COLS = 27, MAZE_ROWS = 15;
const mazeMarks = (spiders: Array<[number, number]>) => {
  const g = Array.from({ length: MAZE_ROWS }, () => Array<string>(MAZE_COLS).fill("."));
  g[1][1] = "P";
  g[MAZE_ROWS - 2][MAZE_COLS - 2] = "H";
  for (const [c, r] of [[7, 1], [13, 3], [19, 1], [3, 7], [9, 9], [15, 7], [21, 9], [5, 13], [13, 11], [23, 5]] as const) g[r][c] = "o";
  for (const [c, r] of spiders) g[r][c] = "s";
  return g.map((r) => r.join(""));
};
const MAZE: Raw = {
  w: 972, h: 540, bg: "surface", edges: "walls", gravity: 0, lives: 3, seed: 101, transition: "circle",
  tiles: {
    size: 36, cols: MAZE_COLS, rows: MAZE_ROWS, gen: "maze",
    map: mazeMarks([[13, 7], [23, 3]]),
    levels: [mazeMarks([[13, 7], [23, 3], [5, 11]]), mazeMarks([[13, 7], [23, 3], [5, 11], [19, 13]])],
    kinds: {
      "#": { look: { kind: "box", color: "accent" }, solid: true },
      "P": { look: { kind: "emoji", emoji: "🐝", color: "accent" }, thing: "bee" },
      "o": { look: { kind: "emoji", emoji: "🌼", color: "accent" }, thing: "flower" },
      "s": { look: { kind: "emoji", emoji: "🕷️", color: "accent" }, thing: "spider" },
      "H": { look: { kind: "emoji", emoji: "🍯", color: "accent" }, thing: "hive" },
    },
  },
  things: [
    { id: "bee", look: emoji("🐝"), x: 54, y: 54, w: 26, h: 26, body: "dynamic", control: "fourWay", speed: 190, tags: ["player"] },
    { id: "flower", look: emoji("🌼"), x: 0, y: 0, w: 22, h: 22, body: "none", template: true, tags: ["flower"] },
    { id: "spider", look: emoji("🕷️"), x: 0, y: 0, w: 26, h: 26, body: "dynamic", behave: "guard", speed: 110, sight: 220, template: true, tags: ["enemy"] },
    { id: "hive", look: emoji("🍯"), x: 0, y: 0, w: 30, h: 30, body: "none", template: true, tags: ["goal"] },
  ],
  rules: [
    { when: { on: "hit", a: "#player", b: "#flower" }, do: [{ act: "burst", who: "other" }, { act: "destroy", who: "other" }, { act: "score", add: 1 }, { act: "sound", kind: "pop" }] },
    { when: { on: "hit", a: "#player", b: "#enemy" }, do: [{ act: "lives", add: -1 }, { act: "shake" }, { act: "sound", kind: "hit" }, { act: "retry" }] },
    { when: { on: "hit", a: "#player", b: "#goal" }, do: [{ act: "sound", kind: "chime" }, { act: "next" }] },
  ],
  words: words(w("النحلة بالمتاهة", "The bee in the maze", "הדבורה במבוך"), w("حرّك النحلة بالأسهم: لمّ الزهور ووصل للخلية. العناكب بتلحقك إذا شافتك، وكل مرحلة متاهة جديدة.", "Move the bee with the arrows: gather the flowers and reach the hive. The spiders chase you once they see you, and each level is a new maze.", "הזיזו את הדבורה בחצים: אספו פרחים והגיעו לכוורת. העכבישים רודפים אחריכם כשהם רואים אתכם, וכל שלב הוא מבוך חדש.")),
};

/** Cans (G2): a ball slung at ten cans stacked on a table; each knocked off scores, all ten in 45 seconds wins. */
const CAN_ROWS: Array<[number, number[]]> = [[385, [-1.5, -0.5, 0.5, 1.5]], [339, [-1, 0, 1]], [293, [-0.5, 0.5]], [247, [0]]];
const CANS: Raw = {
  w: 960, h: 540, bg: "accent-soft", edges: "sides", gravity: 2000, lives: 0, time: 45, winScore: 10, seed: 131,
  layers: [{ kind: "gradient", color: "surface", color2: "accent-soft", factor: 0, y: 0, h: 1 }],
  things: [
    { id: "ball", look: emoji("🥎"), x: 150, y: 360, w: 40, h: 40, body: "rigid", shape: "circle", control: "sling", speed: 1700, density: 3, bounce: 0.25, friction: 0.6, fast: true, tags: ["ball"] },
    { id: "perch", look: { kind: "box", color: "text" }, x: 150, y: 392, w: 70, h: 24, body: "static", solid: true },
    { id: "table", look: { kind: "box", color: "text" }, x: 720, y: 420, w: 300, h: 24, body: "static", solid: true },
    ...CAN_ROWS.flatMap(([y, xs], r) => xs.map((k, i) => ({ id: `can-${r}-${i}`, look: emoji("🥫"), x: 720 + k * 38, y, w: 36, h: 46, body: "rigid", density: 0.4, friction: 0.5, tags: ["can"] }))),
  ],
  rules: [
    { when: { on: "out", who: "#can" }, do: [{ act: "score", add: 1 }, { act: "sound", kind: "pop" }] },
    { when: { on: "out", who: "#ball" }, do: [{ act: "home", who: "self" }] },
    { when: { on: "rest", who: "#ball" }, do: [{ act: "home", who: "self" }] },
  ],
  words: words(w("وقّع العلب", "Knock the cans down", "הפילו את הפחיות"), w("اسحب الطابة لورا وفلّتها: وقّع العلب العشرة عن الطاولة قبل ما يخلص الوقت.", "Pull the ball back and let go: knock all ten cans off the table before the time runs out.", "משכו את הכדור אחורה ושחררו: הפילו את כל עשר הפחיות מהשולחן לפני שהזמן נגמר.")),
};

/** Mini golf (G2): three holes seen from above; the ball slung, slowed by the grass, bouncing off walls and bumpers,
 *  a block that slides across the way; each shot a stroke. */
const GOLF_HOLES = [
  [
    "#####################",
    "#####################",
    "###...............###",
    "###.P.....X.....O.###",
    "###...............###",
    "###.......#.......###",
    "###...............###",
    "#####################",
    "#####################",
    "#####################",
    "#####################",
    "#####################",
  ],
  [
    "#####################",
    "#.......#############",
    "#.P.....#############",
    "#.......#############",
    "#.......#############",
    "#...................#",
    "#........S..........#",
    "#...................#",
    "#############.....O.#",
    "#############.......#",
    "#############.......#",
    "#####################",
  ],
  [
    "#####################",
    "#.P.....#...........#",
    "#.......#.....X.....#",
    "#.......#...........#",
    "#...X...#.....#######",
    "#.......#...........#",
    "#...........X.......#",
    "#.......#...........#",
    "######..#######.....#",
    "#.......#.........O.#",
    "#.......#...........#",
    "#####################",
  ],
];
const GOLF: Raw = {
  w: 945, h: 540, bg: "accent-soft", edges: "walls", gravity: 0, lives: 0, seed: 151, transition: "wipe",
  tiles: {
    size: 45, cols: 21, rows: 12, map: GOLF_HOLES[0], levels: GOLF_HOLES.slice(1),
    kinds: {
      "#": { look: { kind: "box", color: "text" }, solid: true },
      P: { look: { kind: "circle", color: "white" }, thing: "ball" },
      O: { look: { kind: "circle", color: "black" }, thing: "hole" },
      X: { look: { kind: "circle", color: "accent" }, thing: "bumper" },
      S: { look: { kind: "box", color: "accent" }, thing: "slider" },
    },
  },
  things: [
    { id: "ball", look: { kind: "circle", color: "white" }, x: 200, y: 160, w: 20, h: 20, body: "rigid", shape: "circle", control: "sling", speed: 1100, drag: 1.1, bounce: 0.9, friction: 0.1, fast: true, tags: ["ball"] },
    { id: "hole", look: { kind: "circle", color: "black" }, x: 0, y: 0, w: 26, h: 26, body: "none", template: true, tags: ["hole"] },
    { id: "bumper", look: { kind: "circle", color: "accent" }, x: 0, y: 0, w: 40, h: 40, body: "static", solid: true, shape: "circle", bounce: 1, template: true, tags: ["bumper"] },
    { id: "slider", look: { kind: "box", color: "accent" }, x: 0, y: 0, w: 30, h: 100, body: "kinematic", solid: true, behave: "path", speed: 110, path: { points: [[0, 90]] }, template: true },
  ],
  rules: [
    { when: { on: "shot", who: "#ball" }, do: [{ act: "score", add: 1 }] },
    { when: { on: "hit", a: "#ball", b: "#hole" }, do: [{ act: "sound", kind: "chime" }, { act: "next" }] },
    { when: { on: "hit", a: "#ball", b: "#bumper" }, do: [{ act: "sound", kind: "pop" }] },
  ],
  words: words(w("ميني غولف", "Mini golf", "מיני גולף"), w("اسحب الطابة لورا وفلّتها لتوصل للحفرة. النقاط هي عدد الضربات: كل ما كانت أقل، كان أحسن.", "Pull the ball back and let go to reach the hole. The score is your strokes: the fewer, the better.", "משכו את הכדור אחורה ושחררו כדי להגיע לגומה. הניקוד הוא מספר המכות: כמה שפחות, יותר טוב.")),
};

/** Pinball (G2b): two flippers on pins, lifted while their arrow is held; bumpers that kick the ball off; a bar that
 *  turns by itself in the middle; guides down to the flippers; three balls. */
const PINBALL: Raw = {
  w: 540, h: 960, bg: "surface", edges: "sides", gravity: 1100, lives: 3, seed: 171,
  layers: [{ kind: "gradient", color: "surface", color2: "accent-soft", factor: 0, y: 0, h: 1 }],
  things: [
    { id: "ball", look: { kind: "circle", color: "text" }, x: 270, y: 120, w: 26, h: 26, body: "rigid", shape: "circle", density: 1.2, bounce: 0.35, friction: 0.2, fast: true, tags: ["ball"] },
    { id: "flipper-l", look: { kind: "box", color: "accent" }, x: 205, y: 840, w: 120, h: 22, body: "rigid", density: 4, gravity: 0, tags: ["flipper"] },
    { id: "flipper-r", look: { kind: "box", color: "accent" }, x: 335, y: 840, w: 120, h: 22, body: "rigid", density: 4, gravity: 0, tags: ["flipper"] },
    { id: "bumper-1", look: emoji("🔴"), x: 170, y: 330, w: 64, h: 64, body: "static", solid: true, shape: "circle", bounce: 1, tags: ["bumper"] },
    { id: "bumper-2", look: emoji("🔴"), x: 370, y: 330, w: 64, h: 64, body: "static", solid: true, shape: "circle", bounce: 1, tags: ["bumper"] },
    { id: "bumper-3", look: emoji("🔴"), x: 270, y: 470, w: 64, h: 64, body: "static", solid: true, shape: "circle", bounce: 1, tags: ["bumper"] },
    { id: "guide-l", look: { kind: "box", color: "text" }, x: 75, y: 720, w: 150, h: 160, body: "static", solid: true, shape: "poly", points: [[-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] },
    { id: "guide-r", look: { kind: "box", color: "text" }, x: 465, y: 720, w: 150, h: 160, body: "static", solid: true, shape: "poly", points: [[0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] },
    { id: "spinner", look: { kind: "box", color: "accent" }, x: 270, y: 620, w: 110, h: 14, body: "rigid", density: 1, gravity: 0, tags: ["spinner"] },
  ],
  joints: [
    { kind: "pin", a: "flipper-l", b: "", ax: -60, ay: 0, limits: [-30, 30], motor: { speed: -900, key: "ArrowLeft", power: 200 } },
    { kind: "pin", a: "flipper-r", b: "", ax: 60, ay: 0, limits: [-30, 30], motor: { speed: 900, key: "ArrowRight", power: 200 } },
    { kind: "pin", a: "spinner", b: "", motor: { speed: 200, key: "", power: 40 } },
  ],
  rules: [
    { when: { on: "hit", a: "#ball", b: "#bumper" }, do: [{ act: "explode", who: "other", radius: 80, power: 600 }, { act: "score", add: 10 }, { act: "sound", kind: "pop" }] },
    { when: { on: "hit", a: "#ball", b: "#spinner" }, do: [{ act: "score", add: 1 }, { act: "sound", kind: "click" }] },
    { when: { on: "out", who: "#ball" }, do: [{ act: "lives", add: -1 }, { act: "home", who: "self" }, { act: "sound", kind: "hit" }] },
  ],
  words: words(w("كرة الدبابيس", "Pinball", "פינבול"), w("السهم الشمال والسهم اليمين (أو الأزرار تحت) بيرفعوا المضارب. خلّي الطابة فوق: كل صدّام بيعطيك 10، وعندك تلات طابات.", "The left and right arrows (or the buttons below) lift the flippers. Keep the ball up: each bumper gives 10, and you have three balls.", "החצים שמאלה וימינה (או הכפתורים למטה) מרימים את המחבטים. השאירו את הכדור למעלה: כל פגוש נותן 10, ויש לכם שלושה כדורים.")),
};

/** Night stars (G3): a glowing basket catches falling stars that sparkle, each one a bell's note up the scale (the
 *  catching makes its own tune); comets trailing fire take a life; calm music, twinkling stars, a vignette, confetti. */
const NIGHT: Raw = {
  w: 960, h: 540, bg: "deep", edges: "open", lives: 3, winScore: 20, seed: 191,
  weather: "stars", post: "vignette", music: { mood: "calm", tempo: 84, volume: 0.5 },
  things: [
    { id: "basket", look: emoji("🧺"), x: 480, y: 470, w: 90, h: 80, body: "kinematic", control: "leftRight", speed: 560, keepIn: true, fx: "glow", tags: ["player"] },
    { id: "star", look: emoji("⭐"), x: 0, y: 0, w: 46, h: 46, body: "kinematic", vy: 210, template: true, behave: "spin", trail: "sparkle", tags: ["good"] },
    { id: "comet", look: emoji("☄️"), x: 0, y: 0, w: 52, h: 52, body: "kinematic", vy: 300, template: true, trail: "fire", tags: ["bad"] },
  ],
  rules: [
    { when: { on: "every", seconds: 0.9 }, do: [{ act: "spawn", what: "star", at: "top" }] },
    { when: { on: "every", seconds: 2.4 }, do: [{ act: "spawn", what: "comet", at: "top" }] },
    { when: { on: "hit", a: "#player", b: "#good" }, do: [{ act: "burst", who: "other" }, { act: "destroy", who: "other" }, { act: "score", add: 1 }, { act: "note", instrument: "bell", scale: "pentatonic", step: -1 }] },
    { when: { on: "hit", a: "#player", b: "#bad" }, do: [{ act: "destroy", who: "other" }, { act: "lives", add: -1 }, { act: "shake" }, { act: "sound", kind: "boom" }] },
    { when: { on: "score", at: 10 }, do: [{ act: "faster", by: 1.2 }, { act: "confetti" }, { act: "sound", kind: "power" }] },
  ],
  words: words(w("نجوم الليل", "Night stars", "כוכבי לילה"), w("حرّك السلّة ولقّط النجوم: كل نجمة بتعزف نغمة، والمذنّبات بتاخد روح. لمّ عشرين!", "Move the basket and catch the stars: each one plays a note, and comets take a life. Catch twenty!", "הזיזו את הסל ותפסו כוכבים: כל כוכב מנגן צליל, ושביטים לוקחים חיים. תפסו עשרים!")),
};

/** Beats (G3b): arrows fall in four lanes on the music's beat and reach their bar two beats later, on the beat; the
 *  arrow key (or a tap on the bar) as one is on its bar plays it; one that falls past takes a life; 45 seconds. */
const LANES = [["l", "ArrowLeft", "⬅️", 330], ["d", "ArrowDown", "⬇️", 430], ["u", "ArrowUp", "⬆️", 530], ["r", "ArrowRight", "➡️", 630]] as const;
// Tempo 100: a beat is 0.6 s; an arrow falls 500 px from its lane's top to its bar in two beats.
const BEATS: Raw = {
  w: 960, h: 540, bg: "deep", edges: "open", lives: 5, time: 45, timeWins: true, seed: 211,
  music: { mood: "lively", tempo: 100, volume: 0.6 }, weather: "stars", post: "vignette",
  things: [
    ...LANES.map(([k, , , x]) => ({ id: `bar-${k}`, look: { kind: "box", color: "accent" }, x, y: 470, w: 86, h: 22, body: "static", tags: ["bar"] })),
    ...LANES.map(([k, , e, x]) => ({ id: `arrow-${k}`, look: emoji(e), x, y: -30, w: 56, h: 56, body: "kinematic", vy: 500 / 1.2, template: true, trail: "sparkle", tags: ["arrow", `arrow-${k}`] })),
  ],
  rules: [
    // Each lane its beats: together, a pattern that goes round every eight beats.
    { when: { on: "beat", every: 2, offset: 0 }, do: [{ act: "spawn", what: "arrow-l", at: "own" }] },
    { when: { on: "beat", every: 2, offset: 1 }, do: [{ act: "spawn", what: "arrow-r", at: "own" }] },
    { when: { on: "beat", every: 4, offset: 0.5 }, do: [{ act: "spawn", what: "arrow-u", at: "own" }] },
    { when: { on: "beat", every: 4, offset: 2.5 }, do: [{ act: "spawn", what: "arrow-d", at: "own" }] },
    { when: { on: "beat", every: 8, offset: 3 }, do: [{ act: "spawn", what: "arrow-u", at: "own" }] },
    ...LANES.map(([k, key]) => ({ when: { on: "press", key, a: `bar-${k}`, b: `#arrow-${k}` }, do: [{ act: "destroy", who: "other" }, { act: "burst", who: "other" }, { act: "flash", who: "self" }, { act: "score", add: 1 }, { act: "note", instrument: "pluck", scale: "pentatonic", step: -1 }] })),
    { when: { on: "out", who: "#arrow" }, do: [{ act: "lives", add: -1 }, { act: "sound", kind: "blip" }] },
    { when: { on: "score", at: 30 }, do: [{ act: "confetti" }] },
  ],
  words: words(w("إيقاع", "Beats", "קצב"), w("الأسهم بتنزل عالإيقاع: اكبس نفس السهم (أو انقر عالخط) لما يكون عالخط. كل سهم بيفلت بياخد روح.", "Arrows fall to the beat: press the same arrow (or tap the bar) while it's on its bar. Each one that slips past takes a life.", "חצים נופלים לפי הקצב: לחצו על אותו חץ (או הקישו על הפס) כשהוא על הפס. כל חץ שמחמיץ לוקח חיים.")),
};

/** Pads (G3b): eight keys of a pentatonic piano and four drums to tap; each one played lights up and scores. */
const PADS: Raw = {
  w: 960, h: 540, bg: "surface", edges: "walls", lives: 0, seed: 223, post: "vignette",
  things: [
    ...Array.from({ length: 8 }, (_, i) => ({ id: `key-${i + 1}`, look: { kind: "box", color: i % 2 ? "accent-soft" : "accent" }, x: 165 + i * 90, y: 190, w: 80, h: 200, body: "static", tags: ["key"] })),
    ...([["kick", "🥁", 0], ["snare", "👏", 3], ["hat", "✨", 6], ["boom", "🔔", 1]] as const).map(([id, e], i) => ({ id, look: emoji(e), x: 255 + i * 150, y: 430, w: 110, h: 110, body: "static", tags: ["drum"] })),
  ],
  rules: [
    ...Array.from({ length: 8 }, (_, i) => ({ when: { on: "tap", who: `key-${i + 1}` }, do: [{ act: "note", instrument: "piano", scale: "pentatonic", step: i + 3 }, { act: "flash", who: "self" }, { act: "score", add: 1 }] })),
    ...([["kick", 0], ["snare", 3], ["hat", 6], ["boom", 1]] as const).map(([id, step]) => ({ when: { on: "tap", who: id }, do: [{ act: "note", instrument: id === "boom" ? "bell" : "drum", scale: "pentatonic", step }, { act: "flash", who: "self" }, { act: "burst", who: "self" }, { act: "score", add: 1 }] })),
  ],
  words: words(w("لوحة العزف", "Music pads", "משטח נגינה"), w("انقر على المفاتيح والطبول واعزف: كل نغمة بتلمع.", "Tap the keys and the drums and play: each note lights up.", "הקישו על הקלידים והתופים ונגנו: כל צליל נדלק.")),
};

export const READY_GAMES: ReadyGame[] = [
  { key: "catch", name: w("لقّيط", "Catch", "תופס"), line: w("لقّط اللي بيوقع وتفادى النار", "Catch what falls, dodge the fire", "תפסו מה שנופל, התחמקו מהאש"), icon: "🛍️", game: CATCH },
  { key: "dodge", name: w("تفادي", "Dodge", "התחמקות"), line: w("ضلّك عايش للآخر", "Stay alive to the end", "שרדו עד הסוף"), icon: "🚀", game: DODGE },
  { key: "tap", name: w("نقّير", "Tap", "הקשה"), line: w("انقر قبل ما يختفي", "Tap before it's gone", "הקישו לפני שזה נעלם"), icon: "⭐", game: TAP },
  { key: "jump", name: w("نطّاط", "Jumper", "קופץ"), line: w("اركض ونطّ فوق الحواجز", "Run and jump the obstacles", "רוצו וקפצו מעל המכשולים"), icon: "🐰", game: JUMP },
  { key: "bricks", name: w("كسّارة", "Brick breaker", "שובר לבנים"), line: w("طابة ولوح وحيط طوب", "A ball, a paddle and a wall of bricks", "כדור, מחבט וחומת לבנים"), icon: "🧱", game: BRICKS },
  { key: "adventure", name: w("مغامرة", "Adventure", "הרפתקה"), line: w("منصّات بمرحلتين وعالم أعرض من الشاشة", "Platforms over two levels, in a world wider than the screen", "פלטפורמות בשני שלבים, בעולם רחב מהמסך"), icon: "🦊", game: ADVENTURE },
  { key: "maze", name: w("متاهة", "Maze", "מבוך"), line: w("متاهة جديدة بكل مرحلة، وعناكب بتشوف", "A new maze each level, and spiders that see", "מבוך חדש בכל שלב, ועכבישים שרואים"), icon: "🐝", game: MAZE },
  { key: "cans", name: w("علب", "Cans", "פחיות"), line: w("طابة بالمقلاع على برج علب", "A slung ball at a tower of cans", "כדור מקלע אל מגדל פחיות"), icon: "🥫", game: CANS },
  { key: "golf", name: w("ميني غولف", "Mini golf", "מיני גולף"), line: w("تلات حفر وضربات قليلة", "Three holes, as few strokes as you can", "שלוש גומות, כמה שפחות מכות"), icon: "⛳", game: GOLF },
  { key: "pinball", name: w("دبابيس", "Pinball", "פינבול"), line: w("مضارب وصدّامات وطابة ما بتوقع", "Flippers, bumpers and a ball to keep up", "מחבטים, פגושים וכדור שלא ייפול"), icon: "🔴", game: PINBALL },
  { key: "night", name: w("نجوم الليل", "Night stars", "כוכבי לילה"), line: w("لقّط النجوم وكل وحدة بتعزف", "Catch the stars, each one plays a note", "תפסו כוכבים, כל אחד מנגן"), icon: "🌙", game: NIGHT },
  { key: "beats", name: w("إيقاع", "Beats", "קצב"), line: w("أسهم بتنزل عالموسيقى", "Arrows that fall to the music", "חצים שנופלים לפי המוזיקה"), icon: "🎵", game: BEATS },
  { key: "pads", name: w("لوحة العزف", "Music pads", "משטח נגינה"), line: w("مفاتيح وطبول تعزف عليها", "Keys and drums to play", "קלידים ותופים לנגן"), icon: "🎹", game: PADS },
  { key: "balloons", name: w("بالونات", "Balloons", "בלונים"), line: w("فقّعها قبل ما تطير", "Pop them before they float off", "פוצצו לפני שהם עפים"), icon: "🎈", game: BALLOONS },
];
export const readyGame = (key: string) => READY_GAMES.find((g) => g.key === key) ?? null;
