// الوثائق (B4): the open tables described by the server itself, from their own fields: an OpenAPI
// document (its address, a copy to download) and TypeScript types to paste into a program.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import * as API from "../../api/dataApi.api";
import { openApiFile } from "./playText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
export const DOCS_KEY = ["data-api", "docs"];

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(say("انتسخ|Copied|הועתק"));
  } catch {
    toast.error(say("ما قدر ينسخ؛ حدّده وانسخه بإيدك|Couldn't copy; select it and copy by hand|ההעתקה נכשלה; סמנו והעתיקו ידנית"));
  }
}

/** Hands the browser a file made here. */
function download(name: string, text: string, type: string) {
  const href = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** `url` is the API's whole address (…/v1/data): the document lives right under it. */
export function ApiDocs({ url }: { url: string }) {
  const q = useQuery({ queryKey: DOCS_KEY, queryFn: API.getDocs });
  const [open, setOpen] = useState(false);
  const d = q.data;
  const address = `${url}/openapi.json`;

  return (
    <section className={box} data-testid="api-docs">
      <h2 className="font-semibold">{say("الوثائق|Documentation|תיעוד")}</h2>
      <p className="mt-1 text-sm text-white/60">
        {say(
          "السيرفر بيكتب وثائق الـ API لحاله من حقول جداولك، وبتتغيّر مع كل تغيير بالجداول. ملف OpenAPI بتفتحه أي أداة (Postman، Swagger، Insomnia)، وأنواع TypeScript بتنلصق ببرنامجك.|The server writes the API's documentation itself, from your tables' fields, and it changes whenever they do. Any tool opens the OpenAPI file (Postman, Swagger, Insomnia), and the TypeScript types paste into your program.|השרת כותב את תיעוד ה-API בעצמו, מתוך שדות הטבלאות, והוא משתנה איתן. כל כלי פותח את קובץ ה-OpenAPI (Postman, Swagger, Insomnia), ואת טיפוסי ה-TypeScript מדביקים בתוכנה.",
        )}
      </p>
      {!d ? (
        <div className="mt-3">{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</div>
      ) : !d.tables ? (
        <p className="mt-3 text-sm text-white/60" data-testid="docs-empty">
          {say("ما في جدول مفتوح لسا: افتح جدول من فوق وبتطلع وثائقه هون.|No table is open yet: open one above and its documentation shows here.|עדיין אין טבלה פתוחה: פתחו אחת למעלה והתיעוד שלה יופיע כאן.")}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-xs text-white/60">{say("عنوان ملف OpenAPI (دايماً آخر نسخة):|The OpenAPI file's address (always the latest):|כתובת קובץ ה-OpenAPI (תמיד העדכני):")}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <bdi dir="ltr" className="break-all font-mono text-white/90" data-testid="docs-address">
                {address}
              </bdi>
              <Button size="sm" variant="ghost" onClick={() => void copy(address)}>
                {say("انسخ|Copy|העתקה")}
              </Button>
            </div>
            <p className="mt-1 text-xs text-white/50">
              {say(
                "اللي بيفتحه بدون مفتاح بيشوف بس الجداول المفتوحة «للجميع»؛ ومع مفتاح بيشوف اللي بيوصله هالمفتاح. الملف اللي بتنزّله من هون فيه كل شي مفتوح.|Opened without a key it shows only the tables open to everyone; with a key, what that key reaches. The file downloaded here has everything that is open.|בלי מפתח הוא מציג רק טבלאות שפתוחות לכולם; עם מפתח, את מה שהמפתח מגיע אליו. הקובץ שמורידים כאן כולל את כל מה שפתוח.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => download("openapi.json", openApiFile(d.openapi, url), "application/json")} data-testid="docs-download-openapi">
              {say("نزّل ملف OpenAPI|Download the OpenAPI file|הורדת קובץ OpenAPI")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => download("data-api.d.ts", d.types, "text/plain")} data-testid="docs-download-types">
              {say("نزّل أنواع TypeScript|Download the TypeScript types|הורדת טיפוסי TypeScript")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void copy(d.types)} data-testid="docs-copy-types">
              {say("انسخ الأنواع|Copy the types|העתקת הטיפוסים")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid="docs-show-types">
              {open ? say("خبّي الأنواع|Hide the types|הסתרת הטיפוסים") : say("شوف الأنواع|Show the types|הצגת הטיפוסים")}
            </Button>
          </div>
          {open ? (
            <pre dir="ltr" className="max-h-96 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-left text-xs" data-testid="docs-types">
              {d.types}
            </pre>
          ) : null}
        </div>
      )}
    </section>
  );
}
