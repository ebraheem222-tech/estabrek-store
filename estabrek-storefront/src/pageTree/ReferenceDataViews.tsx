"use client";
import { useId, useState } from "react";
import { filterScheduleItems, scheduleDays, type ScheduleSpec, type ComparisonSpec } from "./referenceData";
import { pickText, type TreeLang, type TreeText } from "./tree";
import styles from "./ReferenceDataViews.module.css";

const WORDS = {
  ar: {all: "كل الأيام", schedule: "البرنامج", day: "اليوم", time: "الوقت", session: "الفقرة", speaker: "المتحدث", location: "المكان", empty: "لا توجد فقرات", compare: "المقارنة", feature: "الميزة", yes: "نعم", no: "لا", choose: "اختر"},
  en: {all: "All days", schedule: "Programme", day: "Day", time: "Time", session: "Session", speaker: "Speaker", location: "Location", empty: "No sessions", compare: "Comparison", feature: "Feature", yes: "Yes", no: "No", choose: "Choose"},
  he: {all: "כל הימים", schedule: "תכנית", day: "יום", time: "שעה", session: "מפגש", speaker: "דובר", location: "מקום", empty: "אין מפגשים", compare: "השוואה", feature: "תכונה", yes: "כן", no: "לא", choose: "בחירה"},
};

/** Where a word is saved, for writing it in place in the editor (selectionParts reads data-pt-field): only words of its own. */
const own = (value: TreeText, lang: TreeLang, main: TreeLang, path: string) => (pickText(value, lang, main) ? path : undefined);

export function ScheduleView({spec, lang, main}: { spec: ScheduleSpec; lang: TreeLang; main: TreeLang }) {
  const say = (value: TreeText) => pickText(value, lang, main);
  const at = (item: ScheduleSpec["items"][number], key: "day" | "title" | "text" | "speaker" | "location") => own(item[key], lang, main, `items.${item.source}.${key}`);
  const words = WORDS[lang], label = say(spec.label) || words.schedule;
  const [selectedDay, setDay] = useState<string | null>(null);
  const days = scheduleDays(spec.items, say);
  const activeDay = spec.filterDays && selectedDay !== null && days.includes(selectedDay) ? selectedDay : null;
  const visible = filterScheduleItems(spec.items, activeDay, say);
  // A column for who speaks, and one for where, only when an item says so (opening hours have neither): judged on every
  // item, not only the day shown, so the table keeps its columns from day to day.
  const speakers = spec.items.some(item => Boolean(say(item.speaker)));
  const places = spec.showLocation && spec.items.some(item => Boolean(say(item.location)));
  const base = useId();
  const title = (item: typeof spec.items[number]) => item.href ? <a href={item.href} data-pt-field={at(item, "title")}>{say(item.title)}</a> : say(item.title);
  return <div className={styles.schedule} data-schedule-layout={spec.layout}>
    {spec.filterDays && days.length ? <div className={styles.filters} role="group" aria-label={label}>
      {[null, ...days].map(day => <button key={day ?? "all"} type="button" aria-pressed={activeDay === day} aria-controls={`${base}-sessions`} onClick={() => setDay(day)}>{day ?? words.all}</button>)}
    </div> : null}
    <div id={`${base}-sessions`}>
      {!visible.length ? <p role="status">{words.empty}</p> : spec.layout === "table" ? <div className={styles.scroll} role="region" aria-label={label} tabIndex={0}>
        <table className={styles.table} aria-label={label}><caption data-pt-field={own(spec.label, lang, main, "label")}>{label}</caption><thead><tr><th scope="col">{words.day}</th><th scope="col">{words.time}</th><th scope="col">{words.session}</th>{speakers ? <th scope="col">{words.speaker}</th> : null}{places ? <th scope="col">{words.location}</th> : null}</tr></thead>
          <tbody>{visible.map((item,index) => <tr key={index}><td data-pt-field={at(item, "day")}>{say(item.day)}</td><td className={styles.time}>{item.time}</td><th scope="row"><div data-pt-field={item.href ? undefined : at(item, "title")}>{title(item)}</div>{say(item.text) ? <p data-pt-field={at(item, "text")}>{say(item.text)}</p> : null}</th>{speakers ? <td data-pt-field={at(item, "speaker")}>{say(item.speaker)}</td> : null}{places ? <td data-pt-field={at(item, "location")}>{say(item.location)}</td> : null}</tr>)}</tbody>
        </table>
      </div> : <ol className={spec.layout === "timeline" ? styles.timeline : styles.cards} aria-label={label}>
        {visible.map((item,index) => <li key={index}><div className={styles.eventMeta}><span data-pt-field={at(item, "day")}>{say(item.day)}</span><span className={styles.time}>{item.time}</span></div><h3 data-pt-field={item.href ? undefined : at(item, "title")}>{title(item)}</h3>{say(item.text) ? <p data-pt-field={at(item, "text")}>{say(item.text)}</p> : null}{say(item.speaker) ? <p data-pt-field={at(item, "speaker")}>{say(item.speaker)}</p> : null}{spec.showLocation && say(item.location) ? <p data-pt-field={at(item, "location")}>{say(item.location)}</p> : null}</li>)}
      </ol>}
    </div>
  </div>;
}

export function ComparisonView({spec, lang, main}: { spec: ComparisonSpec; lang: TreeLang; main: TreeLang }) {
  const say = (value: TreeText) => pickText(value, lang, main);
  const words = WORDS[lang], label = say(spec.label) || words.compare;
  if (!spec.columns.length) return null;
  return <div className={styles.comparison}>
    <div className={styles.scroll} role="region" aria-label={label} tabIndex={0} data-sticky={spec.stickyHeader}>
      <table className={styles.table} aria-label={label}><caption data-pt-field={own(spec.label, lang, main, "label")}>{label}</caption>
        <thead><tr><th scope="col">{words.feature}</th>{spec.columns.map((column,index) => <th scope="col" key={index} className={column.highlight ? styles.highlight : undefined}><div data-pt-field={own(column.title, lang, main, `columns.${column.source}.title`)}>{say(column.title)}</div>{say(column.subtitle) ? <p data-pt-field={`columns.${column.source}.subtitle`}>{say(column.subtitle)}</p> : null}{column.href ? <a className={styles.cta} href={column.href} data-pt-field={own(column.cta, lang, main, `columns.${column.source}.cta`)}>{say(column.cta) || words.choose}</a> : null}</th>)}</tr></thead>
        <tbody>{spec.rows.map((row,index) => <tr key={index}><th scope="row" data-pt-field={own(row.label, lang, main, `rows.${row.source}.label`)}>{say(row.label)}</th>{spec.columns.map((column,c) => { const cell = row.values[c]; return <td key={c} className={column.highlight ? styles.highlight : undefined} data-pt-field={cell?.state === "text" ? own(cell.text, lang, main, `rows.${row.source}.values.${column.source}.text`) : undefined}>{cell?.state === "yes" ? <span className={styles.yes}>✓ {words.yes}</span> : cell?.state === "no" ? <span className={styles.no}>− {words.no}</span> : say(cell?.text ?? {}) || "—"}</td>; })}</tr>)}</tbody>
      </table>
    </div>
    {say(spec.caption) ? <p className={styles.caption} data-pt-field="caption">{say(spec.caption)}</p> : null}
  </div>;
}
