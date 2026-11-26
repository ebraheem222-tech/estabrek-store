/**
 * «صورة 3D» for a picture (shared/photo3d.ts; the shop draws it: pageTree/photo3dRun.ts). Its depth picture is made
 * here: by the depth model on the owner's own device (lib/depth.ts: free, no key; the model is downloaded once), or
 * from the picture's light at once. It is saved beside the picture in the media library. Then: a mesh or points, what
 * turns it (the pointer, the scroll, itself), how deep, how far it turns, and how much a light shapes it.
 */
import { useRef, useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { uploadImages } from "../api/uploads.api";
import { DepthError, depthFile, depthPlanHere, estimateDepth, quickDepth, type DepthProgress } from "../lib/depth";
import { megabytes } from "../lib/bgEngine";
import { PHOTO3D_DEFAULT, PHOTO3D_LOOKS, PHOTO3D_MOVES, photo3dOf, type Photo3d } from "../../../shared/photo3d";
import { Range } from "./LookPanels";
import { Choice } from "./StudioTreePanels";
import { say } from "./say";

const box = "space-y-2.5 rounded-xl border border-white/8 p-3";
const btn = "rounded-lg bg-white/6 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40";
const LOOK_NAMES: Record<(typeof PHOTO3D_LOOKS)[number], string> = { mesh: "سطح حقيقي|A real surface|משטח אמיתי", points: "نقاط بالعمق|Dots in depth|נקודות בעומק" };
const MOVE_NAMES: Record<(typeof PHOTO3D_MOVES)[number], string> = {
  pointer: "مع الماوس (وميلان الموبايل)|With the pointer (and a phone's tilt)|עם העכבר (והטיית הטלפון)",
  scroll: "مع السكرول|With the scroll|עם הגלילה",
  auto: "بتلف لحالها|Turns by itself|מסתובבת לבד",
  dolly: "كاميرا سينما بتدخل فيها لحالها|A film camera moves into it by itself|מצלמת קולנוע נכנסת לתוכה לבד",
  dive: "الكاميرا بتغطس فيها مع السكرول|The camera dives into it with the scroll|המצלמה צוללת לתוכה עם הגלילה",
};
const ERRORS: Record<string, string> = {
  MODEL_DOWNLOAD: "ما قدرنا ننزّل الموديل. جرّب كمان مرة، أو استعمل العمق السريع.|The model couldn't be downloaded. Try again, or use the quick depth.|לא הצלחנו להוריד את המודל. נסה שוב, או השתמש בעומק המהיר.",
  MODEL_CHECK: "الملف اللي نزل مش الموديل الصحيح، ما استعملناه.|The downloaded file isn't the right model; it wasn't used.|הקובץ שירד אינו המודל הנכון; לא השתמשנו בו.",
  IMAGE_LOAD: "ما قدرنا نقرا الصورة (موقعها ما بيسمح). جرّب صورة من مكتبتك.|The picture couldn't be read (its site doesn't allow it). Try one from your library.|לא הצלחנו לקרוא את התמונה. נסה תמונה מהספרייה שלך.",
  NO_WORKER: "هالمتصفح ما بيقدر يشغّل الموديل. استعمل العمق السريع.|This browser can't run the model. Use the quick depth.|הדפדפן הזה לא יכול להריץ את המודל. השתמש בעומק המהיר.",
};

export function Photo3dPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const spec = photo3dOf(props.photo3d);
  const src = typeof props.src === "string" ? props.src : "";
  const [work, setWork] = useState<{ step: "model" | "quick" | "save"; p?: DepthProgress } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const stop = useRef<AbortController | null>(null);
  const label = say("صورة 3D|3D picture|תמונת תלת־ממד");
  const save = (next: Photo3d | null) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, photo3d: next ? clean(next) : undefined } }]);
  const set = (patch: Partial<Photo3d>) => spec && save({ ...spec, ...patch });

  const make = async (how: "model" | "quick") => {
    if (!src) return;
    setError(null);
    const ctrl = new AbortController();
    stop.current = ctrl;
    try {
      if (how === "model") {
        const plan = await depthPlanHere().catch(() => null);
        if (plan) setSize(megabytes(plan.model.bytes));
      }
      setWork({ step: how });
      const map = how === "model" ? await estimateDepth(src, { signal: ctrl.signal, onProgress: (p) => setWork({ step: "model", p }) }) : await quickDepth(src);
      setWork({ step: "save" });
      const up = await uploadImages([await depthFile(map, node.id)], { keepAsNew: true, tags: ["depth"] });
      const url = up.files[0]?.url;
      if (!url) throw new Error("upload");
      save({ ...PHOTO3D_DEFAULT, ...(spec ?? {}), map: url } as Photo3d);
    } catch (e) {
      if (e instanceof DepthError && e.code === "ABORTED") setError(null);
      else setError(say(e instanceof DepthError ? ERRORS[e.code] ?? "ما زبط، جرّب كمان مرة.|It didn't work; try again.|זה לא הצליח; נסה שוב." : "ما قدرنا نحفظ صورة العمق.|The depth picture couldn't be saved.|לא הצלחנו לשמור את תמונת העומק."));
    } finally {
      setWork(null);
      stop.current = null;
    }
  };

  const status = work
    ? work.step === "save" ? say("عم نحفظ صورة العمق…|Saving the depth picture…|שומרים את תמונת העומק…")
      : work.step === "quick" ? say("عم نحسب…|Working it out…|מחשבים…")
      : work.p?.phase === "download" ? `${say("عم ننزّل الموديل (مرة وحدة بس)|Downloading the model (only once)|מורידים את המודל (פעם אחת)")} ${work.p.total ? Math.round(((work.p.loaded ?? 0) / work.p.total) * 100) : 0}%`
      : work.p?.phase === "prepare" ? say("عم نجهّز الموديل…|Preparing the model…|מכינים את המודל…")
      : say("الموديل عم يقدّر العمق…|The model is working out the depth…|המודל מעריך את העומק…")
    : null;

  return (
    <div className={box} data-testid="studio-photo3d" data-on={spec ? "" : undefined}>
      <div className="text-xs font-medium text-white/70">🧊 {label}</div>
      <p className="text-[10px] leading-4 text-white/45">{say("الصورة بتطلع بعمق حقيقي: القريب لقدّام والبعيد لورا، وبتلف شوي مع الماوس، وضو بيمشي عليها. العمق بيتعمل هون على جهازك، مجاني وبلا أي مفتاح.|The picture gets real depth: near things forward, far ones back; it turns a little with the pointer and a light moves over it. The depth is made here on your device, free and without any key.|התמונה מקבלת עומק אמיתי: הקרוב קדימה והרחוק אחורה; היא מסתובבת מעט עם העכבר ואור נע עליה. העומק נוצר כאן במכשיר שלך, בחינם ובלי שום מפתח.")}</p>
      {spec ? (
        <div className="flex items-center gap-2">
          <img src={spec.map} alt="" className="h-12 w-12 rounded-md object-cover" data-testid="studio-photo3d-map" />
          <span className="text-[11px] text-white/55">{say("صورة العمق (الأبيض قريب)|The depth picture (white is near)|תמונת העומק (לבן קרוב)")}</span>
        </div>
      ) : null}
      {status ? (
        <div className="flex items-center justify-between gap-2 text-[11px] text-white/70" data-testid="studio-photo3d-status">
          <span>{status}</span>
          {work?.step === "model" ? <button type="button" className={btn} onClick={() => stop.current?.abort()}>{say("وقّف|Stop|עצור")}</button> : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btn} disabled={busy || !src} onClick={() => void make("model")} data-testid="studio-photo3d-model">
            ✨ {spec ? say("اعمل العمق من جديد بالذكاء|Make the depth again with AI|צור את העומק מחדש עם AI") : say("اعمل العمق بالذكاء (على جهازك)|Make the depth with AI (on your device)|צור עומק עם AI (במכשיר שלך)")}
          </button>
          <button type="button" className={btn} disabled={busy || !src} onClick={() => void make("quick")} data-testid="studio-photo3d-quick">⚡ {say("عمق سريع من الإضاءة|Quick depth from the light|עומק מהיר מהאור")}</button>
        </div>
      )}
      {!spec && !status ? <p className="text-[10px] leading-4 text-white/35">{say(`أول مرة بينزل موديل Depth Anything V2 (${size ?? "26–47 MB"})، وبعدها بيضل محفوظ بالمتصفح. العمق السريع ما بيحتاج موديل بس أقل دقة.|The first time, the Depth Anything V2 model is downloaded (${size ?? "26–47 MB"}) and kept in the browser. The quick depth needs no model but is rougher.|בפעם הראשונה מורד המודל Depth Anything V2 (${size ?? "26–47 MB"}) ונשמר בדפדפן. העומק המהיר לא צריך מודל אבל פחות מדויק.`)}</p> : null}
      {error ? <p className="text-[11px] leading-4 text-red-300" data-testid="studio-photo3d-error">{error}</p> : null}
      {spec ? (
        <>
          <Choice label={say("شكلها|Its look|המראה")} value={spec.look as string} busy={busy} options={PHOTO3D_LOOKS.map((k) => [k, say(LOOK_NAMES[k])])} onPick={(look) => set({ look: look as Photo3d["look"] })} testId="studio-photo3d-look" />
          <Choice label={say("شو بيلفّها|What turns it|מה מסובב אותה")} value={spec.move as string} busy={busy} options={PHOTO3D_MOVES.map((k) => [k, say(MOVE_NAMES[k])])} onPick={(move) => set({ move: move as Photo3d["move"] })} testId="studio-photo3d-move" />
          <Range label={say("قديش عميقة|How deep|כמה עמוקה")} value={spec.depth} min={0.1} max={1} step={0.05} busy={busy} onSave={(depth) => set({ depth })} testId="studio-photo3d-depth" />
          <Range label={say("قديش بتلف|How far it turns|כמה היא מסתובבת")} value={spec.turn} min={0.1} max={1} step={0.05} busy={busy} onSave={(turn) => set({ turn })} testId="studio-photo3d-turn" />
          <Range label={say("الضو بيشكّلها|The light shapes it|האור מעצב אותה")} value={spec.light} min={0} max={1} step={0.05} busy={busy} onSave={(light) => set({ light })} testId="studio-photo3d-light" />
          <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(null)} data-testid="studio-photo3d-remove">{say("رجّعها صورة عادية|Make it a flat picture again|החזר לתמונה שטוחה")}</button>
          <p className="text-[10px] leading-4 text-white/35">{say("بيرسمها كرت الشاشة (WebGL). لمين طالب حركة أقل، ولمتصفح ما بيدعمها، بتضل الصورة متل ما هي.|The graphics card draws it (WebGL). For whoever asked for less motion, and in a browser that can't, the picture stays as it is.|כרטיס המסך מצייר אותה (WebGL). למי שביקש פחות תנועה, התמונה נשארת כמו שהיא.")}</p>
        </>
      ) : null}
    </div>
  );
}

/** Only what differs from the defaults is kept. */
function clean(p: Photo3d) {
  const out: Record<string, unknown> = { map: p.map };
  for (const k of ["look", "move", "depth", "turn", "light"] as const) if (p[k] !== PHOTO3D_DEFAULT[k]) out[k] = p[k];
  return out;
}
