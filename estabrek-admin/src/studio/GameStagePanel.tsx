/**
 * The games stage's settings in the editor (G0 of docs/game-engine-plan.ar.md): a ready game to start from, the
 * game's words in the language being edited, its lives, clock and the score that wins, its ground's colour, each
 * thing's look (an emoji, a shape in a colour, one of the store's pictures, or words) and size, and the prize with
 * its coupon. Placing things and writing rules by hand come next (G0b). The game itself is the shop's
 * (pageTree/gameSpec.ts reads it, gameEngine.ts runs it).
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import type { Lang } from "../lib/lang";
import { READY_GAMES } from "../../../estabrek-storefront/src/pageTree/gameReady";
import { Range } from "./LookPanels";
import { Field } from "./StudioPanels";
import { Choice, ColourPick } from "./StudioTreePanels";
import { say } from "./say";

type Obj = Record<string, unknown>;
type Ops = (label: string, ops: PageDraftOp[]) => void;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const box = "space-y-2.5 rounded-xl border border-white/8 p-3";
const sub = "space-y-2 rounded-lg bg-white/4 p-2";
const head = "text-[11px] font-medium text-white/60";
const CODE = /^[A-Za-z0-9_-]{2,32}$/;
const WORD_KEYS = [
  ["title", "عنوان اللعبة|The game's title|כותרת המשחק", 80],
  ["help", "كيف بتنلعب|How to play|איך משחקים", 300],
  ["start", "زر البداية|The start button|כפתור ההתחלה", 40],
  ["win", "لما يربح|When they win|כשמנצחים", 80],
  ["lose", "لما تخلص|When it's over|כשנגמר", 80],
  ["again", "زر العب كمان|The play again button|כפתור שחקו שוב", 40],
  ["prize", "الجائزة|The prize|הפרס", 120],
] as const;
const LOOK_KINDS = [["emoji", "إيموجي|Emoji|אימוג'י"], ["box", "مربّع|Box|ריבוע"], ["circle", "دائرة|Circle|עיגול"], ["image", "صورة|Picture|תמונה"], ["text", "كلام|Words|מילים"]] as const;

export function GameStagePanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const props = (node.props ?? {}) as Obj;
  const game = obj(props.game);
  const things = (Array.isArray(game.things) ? game.things : []) as Obj[];
  const words = obj(game.words);
  const [picking, setPicking] = useState<number | null>(null);
  const [at, setAt] = useState(0);
  const put = (label: string, next: Obj) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, game: next } }]);
  const set = (label: string, change: Obj) => {
    const next: Obj = { ...game, ...change };
    for (const k of Object.keys(change)) if (change[k] === undefined) delete next[k];
    put(label, next);
  };
  const setWord = (key: string, value: string) => {
    const was = obj(words[key]);
    const nextWord = { ...was, [lang]: value.trim() || undefined };
    if (!value.trim()) delete nextWord[lang];
    set(say("كلام اللعبة|The game's words|מילות המשחק"), { words: { ...words, [key]: nextWord } });
  };
  const setThing = (i: number, change: Obj) => set(say("شكل الشي|A thing's look|מראה הפריט"), { things: things.map((t, j) => (j === i ? { ...t, ...change } : t)) });
  const setLook = (i: number, change: Obj) => setThing(i, { look: { ...obj(things[i]?.look), ...change } });
  const thing = things[Math.min(at, Math.max(0, things.length - 1))];
  const look = obj(thing?.look);
  const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);

  return (
    <div className={box} data-testid="studio-game">
      <div className={head}>{say("🎮 مسرح اللعبة|🎮 The game stage|🎮 במת המשחק")}</div>

      {/* A ready game to start from: its things, rules and words replace this one's. */}
      <div className={sub}>
        <div className="text-[11px] text-white/55">{say("لعبة جاهزة|A ready game|משחק מוכן")}</div>
        <div className="grid grid-cols-3 gap-1.5">
          {READY_GAMES.map((g) => (
            <button key={g.key} type="button" disabled={busy} onClick={() => put(say(`لعبة: ${g.name.ar}|Game: ${g.name.en}|משחק: ${g.name.he}`), { ...structuredClone(g.game), ...(game.coupon ? { coupon: game.coupon } : {}), ...(game.once ? { once: true } : {}) })} className="rounded-lg bg-white/6 px-1.5 py-2 text-center text-[11px] text-white/80 hover:bg-white/12 disabled:opacity-40" title={g.line[lang] || g.line.en} data-testid="studio-game-ready" data-game={g.key}>
              <span className="block text-lg leading-none">{g.icon}</span>
              <span className="mt-1 block truncate">{g.name[lang] || g.name.en}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] leading-4 text-white/35">{say("اللعبة بتتبدّل كلها بأشيائها وقواعدها، والكوبون بيضل.|The whole game is replaced, its things and rules; the coupon stays.|כל המשחק מוחלף, הפריטים והכללים; הקופון נשאר.")}</p>
      </div>

      {/* The game's words, in the language being edited. */}
      <div className={sub}>
        {WORD_KEYS.map(([key, label, max]) => (
          <Field key={key} label={say(label)} value={String(obj(words[key])[lang] ?? "")} maxLength={max} multiline={key === "help"} onSave={(v) => setWord(key, v)} testId={`studio-game-word-${key}`} />
        ))}
      </div>

      {/* How it's won and lost. */}
      <div className={sub}>
        <Range label={say("الأرواح (0 = بلا أرواح)|Lives (0 = none)|חיים (0 = בלי)")} value={num(game.lives, 3)} min={0} max={9} busy={busy} onSave={(v) => set(say("الأرواح|Lives|חיים"), { lives: Math.round(v) })} testId="studio-game-lives" />
        <Range label={say("الوقت بالثواني (0 = بلا ساعة)|Time in seconds (0 = no clock)|זמן בשניות (0 = בלי שעון)")} value={num(game.time, 0)} min={0} max={300} step={5} busy={busy} onSave={(v) => set(say("الوقت|Time|זמן"), { time: Math.round(v) })} testId="studio-game-time" />
        {num(game.time, 0) > 0 ? (
          <label className="flex items-center justify-between gap-2 text-xs text-white/75">
            <span>{say("اللي بيضل للآخر بيربح|Lasting to the end wins|מי ששורד עד הסוף מנצח")}</span>
            <input type="checkbox" disabled={busy} checked={game.timeWins === true} onChange={(e) => set(say("الوقت|Time|זמן"), { timeWins: e.target.checked || undefined })} data-testid="studio-game-timewins" />
          </label>
        ) : null}
        <Range label={say("النقاط اللي بتربّح (0 = بلا)|The score that wins (0 = none)|הניקוד שמנצח (0 = בלי)")} value={num(game.winScore, 0)} min={0} max={200} busy={busy} onSave={(v) => set(say("النقاط|Score|ניקוד"), { winScore: Math.round(v) })} testId="studio-game-winscore" />
        <ColourPick label={say("أرضية اللعبة|The game's ground|רקע המשחק")} value={game.bg} busy={busy} onPick={(v) => set(say("الأرضية|The ground|הרקע"), { bg: v ?? undefined })} testId="studio-game-bg" />
      </div>

      {/* Each thing's look and size. */}
      {things.length ? (
        <div className={sub}>
          <div className="text-[11px] text-white/55">{say("الأشياء باللعبة|The game's things|הפריטים במשחק")}</div>
          <div className="flex flex-wrap gap-1" role="tablist">
            {things.map((t, i) => (
              <button key={String(t.id)} type="button" role="tab" aria-selected={i === at} onClick={() => setAt(i)} className={`rounded-full border px-2 py-0.5 text-[11px] ${i === at ? "border-accent-400 bg-accent-500/20 text-white" : "border-white/12 text-white/65"}`} data-testid="studio-game-thing" data-thing={String(t.id)}>
                {obj(t.look).kind === "emoji" ? String(obj(t.look).emoji ?? "") : ""} {String(t.id)}{t.template ? " ✦" : ""}
              </button>
            ))}
          </div>
          {thing ? (
            <div className="space-y-2" data-testid="studio-game-look">
              {thing.template ? <p className="text-[10px] leading-4 text-white/40">{say("✦ بيطلع باللعبة لما تطلبه قاعدة (متل اللي بيوقع).|✦ Appears when a rule makes it (like what falls).|✦ מופיע כשכלל יוצר אותו (כמו מה שנופל).")}</p> : null}
              <Choice label={say("شكله|Its look|המראה")} value={String(look.kind ?? "box") as (typeof LOOK_KINDS)[number][0]} options={LOOK_KINDS.map(([k, l]) => [k, say(l)])} busy={busy} onPick={(k) => setLook(at, { kind: k, ...(k === "emoji" && !look.emoji ? { emoji: "⭐" } : {}) })} testId="studio-game-look-kind" />
              {look.kind === "emoji" ? <Field label={say("الإيموجي|The emoji|האימוג'י")} value={String(look.emoji ?? "")} maxLength={8} onSave={(v) => { if (v.trim()) setLook(at, { emoji: v.trim() }); }} testId="studio-game-emoji" /> : null}
              {look.kind === "image" ? (
                <div className="flex items-center gap-2">
                  {typeof look.src === "string" ? <img src={look.src} alt="" className="h-10 w-10 rounded object-cover" /> : null}
                  <button type="button" disabled={busy} className="rounded-lg bg-white/6 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40" onClick={() => setPicking(at)} data-testid="studio-game-picture">{say("اختار صورة|Choose a picture|בחרו תמונה")}</button>
                </div>
              ) : null}
              {look.kind === "text" ? <Field label={say("الكلام|The words|המילים")} value={String(obj(look.text)[lang] ?? "")} maxLength={40} onSave={(v) => setLook(at, { text: { ...obj(look.text), [lang]: v.trim() } })} testId="studio-game-text" /> : null}
              {look.kind !== "image" ? <ColourPick label={say("لونه|Its colour|הצבע")} value={look.color} busy={busy} onPick={(v) => setLook(at, { color: v ?? "accent" })} testId="studio-game-colour" /> : null}
              <Range label={say("عرضه|Its width|רוחב")} value={num(thing.w, 48)} min={8} max={400} busy={busy} onSave={(v) => setThing(at, { w: Math.round(v) })} testId="studio-game-w" />
              <Range label={say("طوله|Its height|גובה")} value={num(thing.h, 48)} min={8} max={400} busy={busy} onSave={(v) => setThing(at, { h: Math.round(v) })} testId="studio-game-h" />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* The prize. */}
      <div className={sub}>
        <Field
          label={say("كود الكوبون (من «الخصومات»)|Coupon code (from “Discounts”)|קוד הקופון (מ„הנחות”)")} value={typeof game.coupon === "string" ? game.coupon : ""} testId="studio-game-code"
          onSave={(t) => { const v = t.trim(); if (!v) set(say("الكود|The code|הקוד"), { coupon: undefined }); else if (CODE.test(v)) set(say("الكود|The code|הקוד"), { coupon: v }); }}
        />
        <label className="flex items-center justify-between gap-2 text-xs text-white/75">
          <span>{say("مرة وحدة لكل زبون|Once per shopper|פעם אחת לכל לקוח")}</span>
          <input type="checkbox" disabled={busy} checked={game.once === true} onChange={(e) => set(say("مرة وحدة|Once|פעם אחת"), { once: e.target.checked || undefined })} data-testid="studio-game-once" />
        </label>
        <p className="text-[10px] leading-4 text-white/35">{say("لما يربح، الكود بيبيّن وبينحط بالحقيبة لحاله. استعملي كوبون إله حد استعمال.|When they win, the code shows and goes in their bag by itself. Use a coupon with a usage limit.|כשמנצחים, הקוד מופיע ונכנס לסל לבד. השתמשו בקופון עם הגבלת שימוש.")}</p>
      </div>
      <p className="text-[10px] leading-4 text-white/35">{say("بالمحرر اللعبة بتستنّى؛ جرّبيها بالمعاينة أو بالمتجر. ترتيب الأشياء وكتابة القواعد بإيدك جايين بالخطوة الجاية.|In the editor the game waits; try it in the preview or the store. Placing things and writing rules by hand come next.|בעורך המשחק ממתין; נסו אותו בתצוגה המקדימה או בחנות. מיקום פריטים וכתיבת כללים ידנית יגיעו בשלב הבא.")}</p>
      <MediaLibraryModal open={picking !== null} onClose={() => setPicking(null)} title={say("صورة الشي|The thing's picture|תמונת הפריט")} onSelect={(u) => { const i = picking!; setPicking(null); setLook(i, { kind: "image", src: u }); }} />
    </div>
  );
}
