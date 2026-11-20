// نسخ الزباين's copies made or being made (backend lib/pressMake.ts): each one step by step as the server makes it
// (the page asks again every second or two while it is being made), what each service made, the step that said no
// in its own words with "try again from here", and once it is made: its addresses, whether they answer yet, and
// its owner's setup link to hand over.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { say } from "../../studio/say";
import * as API from "../../api/copies.api";
import { PRESS_KINDS, type CopyView, type MakeStep } from "../../api/copies.api";
import { kindName } from "../connections/readyText";
import { copyStateName, makeRefusedText, makeStepName, stepStateName, whyText } from "./copiesText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const tone: Record<string, string> = { made: "text-emerald-300", stopped: "text-amber-300", making: "text-sky-300" };
const MARK: Record<MakeStep["state"], string> = { waiting: "○", doing: "◌", done: "✓", failed: "✗" };
const MARK_TONE: Record<MakeStep["state"], string> = { waiting: "text-white/40", doing: "text-sky-300 animate-pulse", done: "text-emerald-300", failed: "text-red-300" };

/** The copies, newest first; the one picked opened below them. */
export function CopyRuns({ open, onOpen }: { open: string | null; onOpen: (id: string | null) => void }) {
  const q = useQuery({
    queryKey: ["copies-made"],
    queryFn: API.listCopies,
    refetchInterval: (query) => (query.state.data?.some((c) => c.state === "making") ? 3000 : false),
  });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>;
  const copies = q.data ?? [];
  if (!copies.length) return null;
  return (
    <section className={`${box} space-y-3`} data-testid="copies-made">
      <h2 className="font-semibold">{say("النسخ اللي انعملت|The copies made|העותקים שנוצרו")}</h2>
      <ul className="divide-y divide-white/10">
        {copies.map((c) => {
          const done = c.steps.filter((s) => s.state === "done").length;
          return (
            <li key={c.id} className="py-2" data-testid={`copies-made-${c.site}`} data-state={c.state}>
              <button type="button" className="flex w-full flex-wrap items-baseline justify-between gap-2 text-start" onClick={() => onOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                <span className="min-w-0">
                  <bdi className="font-medium">{c.label}</bdi> <bdi dir="ltr" className="text-xs text-white/60">{c.site}</bdi>
                </span>
                <span className={`text-sm ${tone[c.state] ?? ""}`}>
                  {copyStateName(c.state)}
                  {c.state !== "made" ? ` · ${done}/${c.steps.length}` : ""}
                </span>
              </button>
              {open === c.id ? <CopyRun id={c.id} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One copy, step by step, followed while it is being made. */
export function CopyRun({ id }: { id: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["copy-made", id],
    queryFn: () => API.getCopy(id),
    refetchInterval: (query) => (query.state.data?.state === "making" ? 1500 : false),
  });
  const [refused, setRefused] = useState<string | null>(null);
  const again = useMutation({
    mutationFn: () => API.copyAgain(id),
    onMutate: () => setRefused(null),
    onSuccess: (v) => {
      qc.setQueryData(["copy-made", id], v);
      void qc.invalidateQueries({ queryKey: ["copies-made"] });
    },
    onError: (e) => setRefused(makeRefusedText((e as { response?: { data?: { error?: string } } })?.response?.data) ?? getApiErrorMessage(e)),
  });
  const v = q.data;
  // The list follows the copy it shows: once it is made or stopped, the list is told.
  const state = v?.state;
  useEffect(() => {
    if (state) void qc.invalidateQueries({ queryKey: ["copies-made"] });
  }, [state, qc]);
  if (q.isLoading) return <Spinner />;
  if (q.isError || !v) return <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>;
  return (
    <div className="mt-3 space-y-3" data-testid="copy-run" data-state={v.state}>
      <ol className="space-y-1.5">
        {v.steps.map((s) => (
          <li key={s.id} className="text-sm" data-testid={`copy-step-${s.id}`} data-state={s.state}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span aria-hidden className={`w-4 shrink-0 text-center ${MARK_TONE[s.state]}`}>
                {MARK[s.state]}
              </span>
              <span className={s.state === "waiting" ? "text-white/60" : ""}>{makeStepName(s.id)}</span>
              <span className="sr-only">{stepStateName(s.state)}</span>
            </div>
            {s.state === "failed" && s.why ? (
              <p className="ms-6 mt-0.5 text-xs text-red-200" role="alert" data-testid={`copy-step-${s.id}-why`}>
                {whyText(s.why)}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      {v.state === "stopped" ? (
        <div className="space-y-1">
          <Button type="button" size="sm" variant="secondary" isLoading={again.isPending} onClick={() => again.mutate()} data-testid="copy-again">
            {say("جرّب كمان مرة من هون|Try again from here|לנסות שוב מכאן")}
          </Button>
          <p className="text-xs text-white/60">{say("اللي انعمل قبل ما بينعمل مرة تانية: بيكمّل من الخطوة اللي وقفت.|What was made isn't made again: it carries on from the step that stopped.|מה שנוצר לא נוצר שוב: הוא ממשיך מהשלב שנעצר.")}</p>
          {refused ? <p className="text-xs text-red-300">{refused}</p> : null}
        </div>
      ) : null}
      {v.state !== "made" ? <SoFar v={v} /> : null}
      <Links v={v} />
      {v.state === "made" ? <Made v={v} /> : null}
    </div>
  );
}

/** While it is being made: each part's address as soon as that part has one (the server's first). */
function SoFar({ v }: { v: CopyView }) {
  const done = (id: string) => v.steps.some((s) => s.id === id && s.state === "done");
  const parts = [
    ["api", "railway.domain", say("السيرفر:|The server:|השרת:")],
    ["shop", "vercel.project", say("المتجر:|The shop:|החנות:")],
    ["admin", "cloudflare.project", say("الإدارة:|The admin:|הניהול:")],
  ] as const;
  const ready = parts.filter(([, step]) => done(step));
  if (!ready.length) return null;
  return (
    <ul className="space-y-0.5 text-sm" data-testid="copy-so-far">
      {ready.map(([key, , name]) => (
        <li key={key} className="flex flex-wrap gap-x-2" data-testid={`copy-so-far-${key}`}>
          <span className="text-white/60">{name}</span>
          <bdi dir="ltr" className="break-all">
            {v.addresses[key]}
          </bdi>
        </li>
      ))}
    </ul>
  );
}

function Links({ v }: { v: CopyView }) {
  const kinds = PRESS_KINDS.filter((k) => v.links[k]);
  if (!kinds.length) return null;
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs" data-testid="copy-links">
      <span className="text-white/60">{say("شوفها عند:|See it at:|ראו אותו ב:")}</span>
      {kinds.map((k) => (
        <a key={k} href={v.links[k]} target="_blank" rel="noreferrer noopener" className="underline">
          {kindName(k)}
        </a>
      ))}
    </p>
  );
}

/** A made copy: where it is, whether it answers yet (its first builds take a few minutes), and its owner's link. */
function Made({ v }: { v: CopyView }) {
  const alive = useMutation({ mutationFn: () => API.copyAlive(v.id) });
  const [copied, setCopied] = useState(false);
  const a = alive.data;
  const part = (name: string, url: string, got?: { ok: boolean; status: number }) => (
    <li className="flex flex-wrap items-baseline gap-x-2" data-testid={`copy-alive-${name}`} data-ok={got ? got.ok : undefined}>
      {got ? (
        <span aria-hidden className={got.ok ? "text-emerald-300" : "text-amber-300"}>
          {got.ok ? "✓" : "…"}
        </span>
      ) : null}
      <span className="text-white/60">{name === "api" ? say("السيرفر:|The server:|השרת:") : name === "shop" ? say("المتجر:|The shop:|החנות:") : say("الإدارة:|The admin:|הניהול:")}</span>
      <a href={url} target="_blank" rel="noreferrer noopener" className="underline">
        <bdi dir="ltr">{url.replace(/^https:\/\//, "")}</bdi>
      </a>
      {got && !got.ok ? <span className="text-xs text-amber-200">{say("لسا ما جاوب|Not answering yet|עוד לא עונה")}</span> : null}
    </li>
  );
  return (
    <div className="space-y-3 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3" data-testid="copy-made">
      <ul className="space-y-1 text-sm">
        {part("api", v.addresses.api, a?.api)}
        {part("shop", v.addresses.shop, a?.shop)}
        {part("admin", v.addresses.admin, a?.admin)}
      </ul>
      <div className="space-y-1">
        <Button type="button" size="sm" variant="secondary" isLoading={alive.isPending} onClick={() => alive.mutate()} data-testid="copy-alive">
          {say("هل صارت شغّالة؟|Is it up yet?|האם הוא כבר עובד?")}
        </Button>
        <p className="text-xs text-white/60">{say("أول نشر لكل جزء بياخد كم دقيقة.|Each part's first deploy takes a few minutes.|הפריסה הראשונה של כל חלק לוקחת כמה דקות.")}</p>
        {a && a.waiting === false ? <p className="text-xs text-emerald-300" data-testid="copy-owner-in">{say("صاحب المتجر عمل حسابه.|The store's owner has made their account.|הבעלים של החנות יצרו את החשבון שלהם.")}</p> : null}
        {alive.isError ? <p className="text-xs text-red-300">{getApiErrorMessage(alive.error)}</p> : null}
      </div>
      {v.owner?.made ? (
        <div className="space-y-1" data-testid="copy-owner">
          <div className="text-sm font-medium">{say("صاحب المتجر الجديد|The new store's owner|הבעלים של החנות החדשה")}</div>
          <p className="text-sm">
            <bdi>{v.owner.name}</bdi> · <bdi dir="ltr">{v.owner.email}</bdi>
          </p>
          <p className="text-xs text-white/70">
            {say("حسابه انعمل: بيفوت على لوحة الإدارة بهالإيميل وكلمة السر اللي كتبتها.|Their account is made: they sign in on the admin with this email and the password you typed.|החשבון שלו נוצר: הוא נכנס ללוח הניהול עם האימייל הזה והסיסמה שכתבתם.")}{" "}
            <a href={v.addresses.admin} target="_blank" rel="noreferrer noopener" className="underline">
              <bdi dir="ltr">{v.addresses.admin.replace(/^https:\/\//, "")}</bdi>
            </a>
          </p>
        </div>
      ) : null}
      {v.welcome ? (
        <div className="space-y-1">
          <div className="text-sm font-medium">{say("رابط صاحب المتجر الجديد|The new store owner's link|הקישור של הבעלים של החנות החדשה")}</div>
          <p className="text-xs text-white/70">
            {say(
              "ابعته للزبون: بيفتح لوحة إدارته على الإعداد، بيعمل حسابه بكلمة سر من عنده، وبعدين بيجهّز متجره. بيشتغل لمرة وحدة: أول ما يعمل حسابه، بينسكّر.|Send it to the client: it opens their admin on its setup, they make their account with a password of their own, then set the store up. It works once: as soon as they make their account, it closes.|שלחו אותו ללקוח: הוא פותח את לוח הניהול שלו על ההגדרה, הוא יוצר את החשבון שלו עם סיסמה משלו, ואז מכין את החנות. הוא עובד פעם אחת: ברגע שהחשבון נוצר, הוא נסגר.",
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-black/30 px-2 py-1.5 text-xs" dir="ltr" data-testid="copy-welcome">
              {v.welcome}
            </code>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(v.welcome!);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              data-testid="copy-welcome-copy"
            >
              {copied ? say("انتسخ|Copied|הועתק") : say("انسخ|Copy|העתקה")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
