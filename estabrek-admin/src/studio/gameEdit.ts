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
} as const;
export const SPOT_NAMES = {
  top: "من فوق|From the top|מלמעלה", bottom: "من تحت|From the bottom|מלמטה", left: "من الشمال|From the left|משמאל", right: "من اليمين|From the right|מימין",
  random: "بأي مكان|Anywhere|בכל מקום", floorRight: "عالأرض من اليمين|On the floor, from the right|על הרצפה, מימין", floorLeft: "عالأرض من الشمال|On the floor, from the left|על הרצפה, משמאל",
  self: "مكان الأول|Where the first one is|איפה שהראשון", other: "مكان التاني|Where the second one is|איפה שהשני", center: "بالنص|In the middle|באמצע",
} as const;
export const BODY_NAMES = { none: "بلا جسم|No body|בלי גוף", static: "ثابت|Fixed|קבוע", dynamic: "بيوقع ويندفع|Falls and is pushed|נופל ונדחף", kinematic: "بيمشي بسرعته|Moves by its speed|זז במהירותו" } as const;
export const CONTROL_NAMES = { none: "ما حدا بيحرّكه|Nobody moves it|אף אחד לא מזיז", leftRight: "يمين وشمال|Left and right|ימינה ושמאלה", fourWay: "أربع اتجاهات|Four ways|ארבעה כיוונים", platform: "ركض ونط|Run and jump|ריצה וקפיצה", pointer: "بيلحق المؤشر|Follows the pointer|עוקב אחרי הסמן", drag: "بينسحب|Dragged|נגרר" } as const;
export const BEHAVE_NAMES = { none: "ولا إشي|Nothing|כלום", patrol: "رايح جاي|Back and forth|הלוך ושוב", chase: "بيلحق اللاعب|Chases the player|רודף אחרי השחקן", wander: "بيتجوّل|Wanders|משוטט", spin: "بيدور|Spins|מסתובב" } as const;
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

/** The game without a thing, and without every rule that named it (or a tag only it had) and every copy of it made. */
export function withoutThing(game: Obj, id: string): Obj {
  const things = thingsOf(game).filter((t) => t.id !== id);
  const tags = new Set(things.flatMap((t) => list(t.tags).map(String)));
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
  const tags = [...new Set(things.flatMap((t) => list(t.tags).map(String)))];
  return [...things.map((t): [string, string] => [String(t.id), label(t)]), ...tags.map((t): [string, string] => [`#${t}`, `#${t} (${say("كل اللي معهم هالعلامة|every thing with this tag|כל מה שיש לו התגית")})`])];
}
export const templatesOf = (game: Obj) => thingsOf(game).filter((t) => t.template === true);

/** A new rule's "when", with its first values. */
export function newWhen(on: keyof typeof WHEN_NAMES, game: Obj): Obj {
  const who = whoOptions(game)[0]?.[0] ?? "";
  switch (on) {
    case "every": return { on, seconds: 1 };
    case "hit": return { on, a: who, b: whoOptions(game)[1]?.[0] ?? who };
    case "out": case "tap": return { on, who };
    case "key": return { on, key: "Space" };
    case "score": return { on, at: 10 };
    case "time": return { on, at: 10 };
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
