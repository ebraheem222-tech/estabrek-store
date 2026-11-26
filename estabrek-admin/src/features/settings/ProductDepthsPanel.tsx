/**
 * Settings → the product pictures in 3D (the card's «3D» hover, the product page's «3D» picture): how many of the
 * store's product pictures have their depth picture, and a button that makes the missing ones here, one after another,
 * by the depth model on this device (lib/productDepths.ts). Until a picture has its own, the shop lifts it by a quick
 * depth from its light; new products get theirs by themselves after they are saved.
 */
import { useEffect, useRef, useState } from "react";
import { DepthError } from "../../lib/depth";
import { listDepthImages, makeDepths, type DepthList, type DepthsProgress } from "../../lib/productDepths";
import { say } from "../../studio/say";

const btn = "rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:border-white/40 disabled:opacity-40";
const WHY: Record<string, string> = {
  MODEL_DOWNLOAD: "ما قدرنا ننزّل الموديل. جرّب كمان مرة.|The model couldn't be downloaded. Try again.|לא הצלחנו להוריד את המודל. נסה שוב.",
  MODEL_CHECK: "الملف اللي نزل مش الموديل الصحيح، ما استعملناه.|The downloaded file isn't the right model; it wasn't used.|הקובץ שירד אינו המודל הנכון; לא השתמשנו בו.",
  NO_WORKER: "هالمتصفح ما بيقدر يشغّل الموديل. جرّب Chrome أو Edge.|This browser can't run the model. Try Chrome or Edge.|הדפדפן הזה לא יכול להריץ את המודל. נסה Chrome או Edge.",
};

export function ProductDepthsPanel() {
  const [list, setList] = useState<DepthList | null>(null);
  const [failed, setFailed] = useState(false);
  const [work, setWork] = useState<DepthsProgress | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const stop = useRef<AbortController | null>(null);
  const load = () => listDepthImages().then((l) => { setList(l); setFailed(false); }).catch(() => setFailed(true));
  useEffect(() => {
    void load();
    return () => stop.current?.abort();
  }, []);
  const missing = list ? list.images.filter((im) => !im.depthUrl) : [];

  const run = async () => {
    if (!missing.length) return;
    const ctrl = new AbortController();
    stop.current = ctrl;
    setNote(null);
    setWork({ done: 0, total: missing.length });
    try {
      const { made, failed: passed } = await makeDepths(missing, { signal: ctrl.signal, onProgress: setWork });
      setNote(say(`خلصنا: ${made} صورة صار إلها عمق${passed ? `، و${passed} ما قدرنا نقراها` : ""}.|Done: ${made} pictures have their depth${passed ? `; ${passed} couldn't be read` : ""}.|סיימנו: ל־${made} תמונות יש עומק${passed ? `; ${passed} לא נקראו` : ""}.`));
    } catch (e) {
      if (!(e instanceof DepthError && e.code === "ABORTED")) setNote(say(e instanceof DepthError ? WHY[e.code] ?? "ما زبط، جرّب كمان مرة.|It didn't work; try again.|זה לא הצליח; נסה שוב." : "ما زبط، جرّب كمان مرة.|It didn't work; try again.|זה לא הצליח; נסה שוב."));
    } finally {
      stop.current = null;
      setWork(null);
      void load();
    }
  };

  const status = work
    ? work.model?.phase === "download"
      ? `${say("عم ننزّل الموديل (مرة وحدة بس)|Downloading the model (only once)|מורידים את המודל (פעם אחת)")} ${work.model.total ? Math.round(((work.model.loaded ?? 0) / work.model.total) * 100) : 0}%`
      : `${say("عم نعمل العمق|Making the depth|מכינים את העומק")} ${Math.min(work.done + 1, work.total)} / ${work.total}${work.current ? ` · ${work.current.title}` : ""}`
    : null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-white/10 p-3" data-testid="product-depths">
      <div className="text-xs font-medium">🧊 {say("صور المنتجات بالـ 3D|Product pictures in 3D|תמונות המוצרים בתלת־ממד")}</div>
      <p className="text-[11px] leading-5 text-white/55">
        {say("كل صورة بتنرسم 3D من عمقها. العمق بينعمل هون على جهازك بموديل مجاني بلا أي مفتاح (بينزل مرة وحدة)، وصور المنتجات الجديدة بياخدوا عمقهن لحالهن بعد ما تحفظ. لحد ما يصير لصورة عمق، المتجر بيعمللها عمق سريع من ضوها.|Each picture is drawn in 3D from its depth. The depth is made here on your device by a free model, no key (downloaded once), and new products' pictures get theirs by themselves after you save. Until a picture has one, the shop gives it a quick depth from its light.|כל תמונה מצוירת בתלת־ממד מהעומק שלה. העומק נוצר כאן במכשיר שלך במודל חינמי, בלי מפתח (יורד פעם אחת), ותמונות של מוצרים חדשים מקבלות את שלהן לבד אחרי השמירה. עד אז החנות נותנת לתמונה עומק מהיר מהאור שלה.")}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span data-testid="product-depths-count">
          {failed ? say("ما قدرنا نقرا الصور.|The pictures couldn't be read.|לא הצלחנו לקרוא את התמונות.") : list ? say(`${list.done} من ${list.total} صورة إلها عمق|${list.done} of ${list.total} pictures have their depth|ל־${list.done} מתוך ${list.total} תמונות יש עומק`) : "…"}
        </span>
        {work ? (
          <button type="button" className={btn} data-testid="product-depths-stop" onClick={() => stop.current?.abort()}>{say("وقّف|Stop|עצור")}</button>
        ) : (
          <button type="button" className={btn} data-testid="product-depths-make" disabled={!missing.length} onClick={() => void run()}>
            {missing.length ? say(`اعمل العمق للصور الناقصة (${missing.length})|Make the missing depths (${missing.length})|צור את העומקים החסרים (${missing.length})`) : say("كل الصور إلها عمق ✓|Every picture has its depth ✓|לכל התמונות יש עומק ✓")}
          </button>
        )}
      </div>
      {work ? <progress className="h-1.5 w-full" max={work.total} value={work.done} data-testid="product-depths-progress" /> : null}
      {status ? <div className="text-[11px] text-white/60" data-testid="product-depths-status">{status}</div> : null}
      {note ? <div className="text-[11px] text-white/70" data-testid="product-depths-note">{note}</div> : null}
    </div>
  );
}
