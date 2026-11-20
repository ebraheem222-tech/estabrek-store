"use client";
/**
 * A form the owner built (formSpec.ts): its fields with their labels, what is wrong said under each, and one
 * button. What was typed goes to one of the owner's functions or becomes a row of one of their tables, as whoever
 * is signed in (the shop's hands: components/RecipeHands.tsx). After it is taken the form empties, says so, and
 * tells its element (a recipe with the "sent" event runs then).
 *
 * In the editor's frame nothing is sent: the form only says what would happen in the shop.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { TreeLang } from "./tree";
import { FORM_SENT_EVENT, FORM_TEXT_MOST, formWords, problemOf, reachProblem, valuesFor, type FormFieldSpec, type FormSpec, type FormValue } from "./formSpec";
import { submitContactMessage } from "@/lib/contactForm";
import { fillVars, keepAnswer } from "./recipeVars";
import { rowsChanged } from "./rowsSpec";
import { wantHands, whenHands } from "./recipeHands";
import css from "./FormView.module.css";

type State = { is: "idle" | "sending" | "done" | "failed"; text: string; signin?: boolean };
/** What came back from the other end: taken, or why not (a table says which fields). */
type Out = { ok: true; value: unknown } | { ok: false; status: number; error: string; issues?: Array<{ field: string; text: string }> };
const inStudio = () => window.parent !== window && /\/studio-frame/.test(window.location.pathname);

export function FormView({ spec, lang, signin }: { spec: FormSpec; lang: TreeLang; signin: string }) {
  const w = formWords(lang);
  const uid = useId();
  const root = useRef<HTMLFormElement>(null);
  const trap = useRef<HTMLInputElement>(null);
  const blank = () => Object.fromEntries(spec.fields.map((f) => [f.name, f.kind === "check" ? false : ""])) as Record<string, FormValue>;
  const [values, setValues] = useState(blank);
  // The files picked, by field (their names are the field's value for the checks).
  const files = useRef<Record<string, File | null>>({});
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [state, setState] = useState<State>({ is: "idle", text: "" });
  const sending = state.is === "sending";
  // The field to go to once the form is drawn again (while it is being sent its boxes can't take the focus).
  const goTo = useRef<string | null>(null);
  useEffect(() => {
    if (sending || !goTo.current) return;
    root.current?.querySelector<HTMLElement>(`[name="${goTo.current}"]`)?.focus();
    goTo.current = null;
  }, [sending, problems]);

  // A page with a form that goes somewhere asks the shop for its hands (they are loaded only then).
  const goes = spec.send?.to === "fn" || spec.send?.to === "table";
  useEffect(() => {
    if (goes) wantHands();
  }, [goes]);

  const set = (name: string, value: FormValue) => {
    setValues((v) => ({ ...v, [name]: value }));
    if (problems[name]) setProblems(({ [name]: _gone, ...rest }) => rest);
  };

  async function send(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const found: Record<string, string> = {};
    for (const f of spec.fields) {
      const p = problemOf(f, values[f.name], lang);
      if (p) found[f.name] = p;
    }
    // A message to the store says where the answer goes (under the email box when neither is there).
    const reach = reachProblem(spec, values, lang);
    if (reach && !found.email && !found.phone) found.email = reach;
    setProblems(found);
    const first = Object.keys(found)[0];
    if (first) {
      goTo.current = first;
      setState({ is: "idle", text: "" });
      return;
    }
    if (!spec.send) return setState({ is: "failed", text: w.notReady });
    if (inStudio()) return setState({ is: "done", text: w.inShop });
    const done = () => {
      files.current = {};
      root.current?.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((x) => (x.value = ""));
      setValues(blank());
      setProblems({});
      setState({ is: "done", text: fillVars(spec.done) || w.sent });
    };
    // A robot fills every box it finds; no person sees this one. It is told "sent" and nothing goes anywhere.
    if (trap.current?.value) return done();

    setState({ is: "sending", text: "" });
    // The shop's own forms go to the store itself (its messages, its newsletter list), as anyone.
    if (spec.send.to === "contact" || spec.send.to === "newsletter") {
      try {
        if (spec.send.to === "contact") await submitContactMessage({ ...valuesFor(spec.fields, values, "fn"), pageUrl: location.href, source: "page_form" });
        else {
          const res = await fetch("/api/newsletter/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: String(values.email ?? "").trim(), source: "page_form" }) });
          if (!res.ok) throw new Error(String(res.status));
        }
      } catch {
        return setState({ is: "failed", text: w.other });
      }
      done();
      root.current?.closest("[data-tree-node]")?.dispatchEvent(new CustomEvent(FORM_SENT_EVENT));
      return;
    }
    const hands = await whenHands();
    // A form to a table uploads its files first, each into the field of its name; what comes back is the value sent.
    const uploaded: Record<string, string> = {};
    if (hands && spec.send.to === "table") {
      const wrong: Record<string, string> = {};
      for (const f of spec.fields) {
        const file = f.kind === "file" ? files.current[f.name] : null;
        if (!file) continue;
        const up = await hands.upload(spec.send.table, f.name, file);
        if (up.ok) uploaded[f.name] = up.value;
        else if (up.status === 401) return setState({ is: "failed", text: w.signin, signin: true });
        else wrong[f.name] = up.code === "FILE_TOO_BIG" ? w.fileTooBig(up.maxMb ?? null) : up.code === "FILE_KIND" ? w.fileKind : up.status === 429 ? w.busy : w.fileFailed;
      }
      if (Object.keys(wrong).length) {
        setProblems(wrong);
        goTo.current = Object.keys(wrong)[0];
        return setState({ is: "failed", text: "" });
      }
    }
    const out: Out = !hands
      ? { ok: false, status: 0, error: "" }
      : spec.send.to === "fn"
        ? await hands.fn(spec.send.fn, valuesFor(spec.fields, values, "fn"))
        : await hands.row(spec.send.table, { ...valuesFor(spec.fields, values, "table"), ...uploaded }, lang);
    if (out.ok) {
      if (spec.send.to === "fn" && spec.send.as) keepAnswer(spec.send.as, out.value);
      done();
      root.current?.closest("[data-tree-node]")?.dispatchEvent(new CustomEvent(FORM_SENT_EVENT));
      // What it added may show in a list on this page: lists read their rows again.
      rowsChanged();
      return;
    }
    // A table says what is wrong field by field; what isn't about a field of this form is said under the button.
    const issues = out.issues ?? [];
    const mine: Record<string, string> = {};
    const rest: string[] = [];
    for (const i of issues) {
      if (spec.fields.some((f) => f.name === i.field)) mine[i.field] ??= i.text;
      else rest.push(i.text);
    }
    setProblems(mine);
    if (out.status === 401) return setState({ is: "failed", text: w.signin, signin: true });
    const text = out.error || rest[0] || (Object.keys(mine).length ? "" : out.status === 429 ? w.busy : w.other);
    goTo.current = Object.keys(mine)[0] ?? null;
    setState({ is: "failed", text });
  }

  const box = (f: FormFieldSpec, id: string, bad: string | undefined) => {
    const about = [f.hint ? `${id}-hint` : "", bad ? `${id}-bad` : ""].filter(Boolean).join(" ") || undefined;
    const shared = { id, name: f.name, className: "pt-form-box", disabled: sending, "aria-invalid": bad ? true : undefined, "aria-describedby": about, "aria-required": f.required || undefined } as const;
    const value = typeof values[f.name] === "string" ? (values[f.name] as string) : "";
    switch (f.kind) {
      case "long":
        return <textarea {...shared} rows={4} maxLength={Math.min(f.max ?? FORM_TEXT_MOST.long, FORM_TEXT_MOST.long)} value={value} onChange={(e) => set(f.name, e.target.value)} />;
      case "select":
        return (
          <select {...shared} value={value} onChange={(e) => set(f.name, e.target.value)}>
            <option value="">{w.choose}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      case "number":
        return <input {...shared} type="number" inputMode="decimal" min={f.min} max={f.max} value={value} onChange={(e) => set(f.name, e.target.value)} />;
      case "email":
        return <input {...shared} type="email" inputMode="email" autoComplete="email" dir="ltr" maxLength={254} value={value} onChange={(e) => set(f.name, e.target.value)} />;
      case "phone":
        return <input {...shared} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={20} value={value} onChange={(e) => set(f.name, e.target.value)} />;
      case "date":
        return <input {...shared} type="date" value={value} onChange={(e) => set(f.name, e.target.value)} />;
      case "file":
        return (
          <input
            {...shared}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              files.current[f.name] = file;
              set(f.name, file ? file.name : "");
            }}
          />
        );
      default:
        return <input {...shared} type="text" maxLength={Math.min(f.max ?? FORM_TEXT_MOST.text, FORM_TEXT_MOST.text)} value={value} onChange={(e) => set(f.name, e.target.value)} />;
    }
  };

  return (
    <form ref={root} className={css.form} onSubmit={send} noValidate data-pt-form data-state={state.is} data-inline={spec.inline ? "" : undefined}>
      {spec.title ? <h2 data-pt-field="title" className="pt-block-title">{spec.title}</h2> : null}
      {spec.ways?.length ? (
        <ul className={css.ways}>
          {spec.ways.map((way) => (
            <li key={way.href}>
              <a href={way.href} target={/^https?:/.test(way.href) ? "_blank" : undefined} rel={/^https?:/.test(way.href) ? "noopener noreferrer" : undefined}>
                <span>{way.label}</span> <bdi dir="ltr">{way.value}</bdi>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {spec.fields.map((f) => {
        const id = `${uid}-${f.name}`;
        const bad = problems[f.name];
        const star = f.required ? <span aria-hidden="true"> *</span> : null;
        return (
          <div key={f.name} className={css.field} data-field={f.name} data-kind={f.kind} data-bad={bad ? "" : undefined}>
            {f.kind === "check" ? (
              <label className={css.check}>
                <input id={id} name={f.name} type="checkbox" disabled={sending} checked={values[f.name] === true} aria-invalid={bad ? true : undefined} aria-describedby={bad ? `${id}-bad` : undefined} aria-required={f.required || undefined} onChange={(e) => set(f.name, e.target.checked)} />
                <span>{f.label}{star}</span>
              </label>
            ) : (
              <>
                <label htmlFor={id}>{f.label}{star}</label>
                {box(f, id, bad)}
              </>
            )}
            {f.hint ? <small id={`${id}-hint`}>{f.hint}</small> : null}
            {bad ? <p id={`${id}-bad`} role="alert" className={css.bad}>{bad}</p> : null}
          </div>
        );
      })}
      <input ref={trap} className={css.trap} type="text" name="pt-leave-empty" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
      <button type="submit" className={css.send} disabled={sending}>{sending ? w.sending : spec.button || w.send}</button>
      <p className={css.note} role="status" aria-live="polite" data-is={state.is} data-pt-form-note>
        {state.text}
        {state.signin ? <> <a href={signin}>{w.signinLink}</a></> : null}
      </p>
    </form>
  );
}
