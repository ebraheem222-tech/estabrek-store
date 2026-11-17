// الـ Functions: an input's rules (backend lib/fnInputs.ts). A number's least and most; words'
// least and most letters, a list of choices or a format (an email, a phone number, a web
// address, a day); a list's least and most things. Every run checks them; an own address says
// what isn't right to its caller (400) before the function runs. (The page opens it afresh for
// an input whose kind changed: what is typed starts from the input's own rules.)
import { useState } from "react";
import type { FnInput, InputFormat } from "../../api/functions.api";
import { say } from "../../studio/say";
import { INPUT_FORMAT_NAME } from "./fnText";
import { boundOf, choicesOf, choicesText, withRules } from "./fnInputRules";

const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const label = "text-xs text-white/60";
const FORMATS: InputFormat[] = ["email", "phone", "url", "date"];

export function InputRules({ input, onChange, canWrite, testId }: { input: FnInput; onChange: (next: FnInput) => void; canWrite: boolean; testId: string }) {
  const [min, setMin] = useState(input.min === undefined ? "" : String(input.min));
  const [max, setMax] = useState(input.max === undefined ? "" : String(input.max));
  const [choices, setChoices] = useState(choicesText(input.choices));

  if (input.type === "bool" || input.type === "any") {
    return (
      <p className="text-xs text-white/55" data-testid={`${testId}-none`}>
        {say("ما في قواعد لهالنوع: «نعم/لا» و«أي شي» بيتاخدوا متل ما هم.|No rules for this kind: yes/no and “anything” are taken as they come.|אין כללים לסוג הזה: כן/לא ו«כל דבר» מתקבלים כמו שהם.")}
      </p>
    );
  }
  const words = input.type === "text";
  const [least, most] =
    input.type === "number"
      ? ["أقل قيمة|The least|ערך מינימלי", "أكتر قيمة|The most|ערך מקסימלי"]
      : words
        ? ["أقل عدد أحرف|Fewest letters|מינימום תווים", "أكتر عدد أحرف|Most letters|מקסימום תווים"]
        : ["أقل عدد بالقائمة|Fewest things|מינימום פריטים", "أكتر عدد بالقائمة|Most things|מקסימום פריטים"];
  const bound = (text: string, key: "min" | "max") => {
    const n = boundOf(text);
    if (n !== input[key]) onChange(withRules(input, { [key]: n }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/10 p-2" data-testid={testId}>
      <span className={label}>{say(least)}</span>
      <input className={`${field} w-24`} dir="ltr" inputMode="decimal" value={min} disabled={!canWrite} onChange={(e) => setMin(e.target.value)} onBlur={() => bound(min, "min")} data-testid={`${testId}-min`} />
      <span className={label}>{say(most)}</span>
      <input className={`${field} w-24`} dir="ltr" inputMode="decimal" value={max} disabled={!canWrite} onChange={(e) => setMax(e.target.value)} onBlur={() => bound(max, "max")} data-testid={`${testId}-max`} />
      {words ? (
        <>
          <span className={label}>{say("واحد من|One of|אחד מ")}</span>
          <input
            className={`${field} w-48`}
            value={choices}
            placeholder="S, M, L"
            disabled={!canWrite || !!input.format}
            onChange={(e) => setChoices(e.target.value)}
            onBlur={() => {
              const next = choicesOf(choices);
              if (choicesText(next) !== choicesText(input.choices)) onChange(withRules(input, { choices: next }));
            }}
            title={say("الخيارات مفصولة بفاصلة|Choices, separated by commas|אפשרויות, מופרדות בפסיקים")}
            data-testid={`${testId}-choices`}
          />
          <span className={label}>{say("شكله|Its form|תבנית")}</span>
          <select className={field} value={input.format ?? ""} disabled={!canWrite || !!input.choices?.length} onChange={(e) => onChange(withRules(input, { format: (e.target.value || undefined) as InputFormat | undefined }))} data-testid={`${testId}-format`}>
            <option value="">{say("أي كلام|Any words|כל טקסט")}</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {say(INPUT_FORMAT_NAME[f])}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </div>
  );
}
