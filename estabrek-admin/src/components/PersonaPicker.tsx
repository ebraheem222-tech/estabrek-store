// The store assistant's personality (estabrek-storefront/src/lib/personas.ts): 50 characters, the ones that fit
// the store's industry first, found by name or role, with how the picked one greets shoppers. "" is the plain
// assistant. Used by the setup wizard and by Settings → the chat.
import { useMemo, useState } from "react";
import { adminLang } from "../lib/lang";
import { say } from "../studio/say";
import { PERSONAS, personaById, personaFaceUrl, personaLines, personasFor } from "../../../estabrek-storefront/src/lib/personas";

export function PersonaPicker({ value, onChange, industry, testid = "persona" }: { value: string; onChange: (id: string) => void; industry?: string | null; testid?: string }) {
  const lang = adminLang();
  const [q, setQ] = useState("");
  const list = useMemo(() => personasFor(industry ?? null), [industry]);
  const found = q.trim() ? list.filter((p) => [p.name.ar, p.name.en, p.name.he, p.role.ar, p.role.en, p.role.he].some((w) => w.toLowerCase().includes(q.trim().toLowerCase()))) : list;
  const picked = personaById(value);
  return (
    <div className="space-y-3" data-testid={testid}>
      {picked ? (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3" data-testid={`${testid}-picked`}>
          <img src={personaFaceUrl(picked, 72)} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 text-sm">
            <div className="font-semibold">
              <bdi>{picked.name[lang]}</bdi> · <span className="text-white/70">{picked.role[lang]}</span>
            </div>
            <p className="mt-1 text-white/80">«{personaLines(picked, lang).hello}»</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          aria-pressed={!picked}
          className={`rounded-xl border px-3 py-1.5 text-sm ${!picked ? "border-white/40 bg-white/10" : "border-white/10 hover:bg-white/5"}`}
          data-testid={`${testid}-none`}
        >
          {say("بدون شخصية (المساعد العادي)|No personality (the plain assistant)|בלי דמות (העוזר הרגיל)")}
        </button>
        <input
          className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={say(`دوّر بين ${PERSONAS.length} شخصية…|Search ${PERSONAS.length} personalities…|חיפוש בין ${PERSONAS.length} דמויות…`)}
          aria-label={say("دوّر على شخصية|Search for a personality|חיפוש דמות")}
          data-testid={`${testid}-search`}
        />
      </div>
      <ul className="grid max-h-[22rem] grid-cols-2 gap-2 overflow-auto pe-1 sm:grid-cols-3 lg:grid-cols-4" role="listbox" aria-label={say("الشخصيات|Personalities|דמויות")}>
        {found.map((p) => {
          const on = p.id === value;
          const fits = !!industry && p.fits.includes(industry);
          return (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => onChange(p.id)}
                className={`flex w-full items-center gap-2 rounded-xl border p-2 text-start transition ${on ? "border-accent-400 bg-accent-500/15" : "border-white/10 hover:bg-white/5"}`}
                data-testid={`${testid}-${p.id}`}
                data-fits={fits}
              >
                <img src={personaFaceUrl(p, 48)} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0 rounded-full" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    <bdi>{p.name[lang]}</bdi>
                  </span>
                  <span className="block truncate text-[11px] text-white/60">{p.role[lang]}</span>
                  {fits ? <span className="block text-[10px] text-emerald-300">{say("بيناسب متجرك|Fits your store|מתאים לחנות שלך")}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!found.length ? <p className="text-sm text-white/60">{say("ما في شخصية بهالاسم.|No personality by that name.|אין דמות בשם הזה.")}</p> : null}
    </div>
  );
}
