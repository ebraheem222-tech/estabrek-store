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

export const READY_GAMES: ReadyGame[] = [
  { key: "catch", name: w("لقّيط", "Catch", "תופס"), line: w("لقّط اللي بيوقع وتفادى النار", "Catch what falls, dodge the fire", "תפסו מה שנופל, התחמקו מהאש"), icon: "🛍️", game: CATCH },
  { key: "dodge", name: w("تفادي", "Dodge", "התחמקות"), line: w("ضلّك عايش للآخر", "Stay alive to the end", "שרדו עד הסוף"), icon: "🚀", game: DODGE },
  { key: "tap", name: w("نقّير", "Tap", "הקשה"), line: w("انقر قبل ما يختفي", "Tap before it's gone", "הקישו לפני שזה נעלם"), icon: "⭐", game: TAP },
  { key: "jump", name: w("نطّاط", "Jumper", "קופץ"), line: w("اركض ونطّ فوق الحواجز", "Run and jump the obstacles", "רוצו וקפצו מעל המכשולים"), icon: "🐰", game: JUMP },
  { key: "bricks", name: w("كسّارة", "Brick breaker", "שובר לבנים"), line: w("طابة ولوح وحيط طوب", "A ball, a paddle and a wall of bricks", "כדור, מחבט וחומת לבנים"), icon: "🧱", game: BRICKS },
  { key: "balloons", name: w("بالونات", "Balloons", "בלונים"), line: w("فقّعها قبل ما تطير", "Pop them before they float off", "פוצצו לפני שהם עפים"), icon: "🎈", game: BALLOONS },
];
export const readyGame = (key: string) => READY_GAMES.find((g) => g.key === key) ?? null;
