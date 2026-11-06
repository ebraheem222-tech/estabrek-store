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

export function ScheduleView({spec, lang, main}: { spec: ScheduleSpec; lang: TreeLang; main: TreeLang }) {
  const say = (value: TreeText) => pickText(value, lang, main);
  const words = WORDS[lang], label = say(spec.label) || words.schedule;
  const [selectedDay, setDay] = useState<string | null>(null);
  const days = scheduleDays(spec.items, say);
  const activeDay = spec.filterDays && selectedDay !== null && days.includes(selectedDay) ? selectedDay : null;
  const visible = filterScheduleItems(spec.items, activeDay, say);
  const base = useId();
  const title = (item: typeof spec.items[number]) => item.href ? <a href={item.href}>{say(item.title)}</a> : say(item.title);
  return <div className={styles.schedule} data-schedule-layout={spec.layout}>
    {spec.filterDays && days.length ? <div className={styles.filters} role="group" aria-label={label}>
      {[null, ...days].map(day => <button key={day ?? "all"} type="button" aria-pressed={activeDay === day} aria-controls={`${base}-sessions`} onClick={() => setDay(day)}>{day ?? words.all}</button>)}
    </div> : null}
    <div id={`${base}-sessions`}>
      {!visible.length ? <p role="status">{words.empty}</p> : spec.layout === "table" ? <div className={styles.scroll} role="region" aria-label={label} tabIndex={0}>
        <table className={styles.table} aria-label={label}><caption>{label}</caption><thead><tr><th scope="col">{words.day}</th><th scope="col">{words.time}</th><th scope="col">{words.session}</th><th scope="col">{words.speaker}</th>{spec.showLocation ? <th scope="col">{words.location}</th> : null}</tr></thead>
          <tbody>{visible.map((item,index) => <tr key={index}><td>{say(item.day)}</td><td className={styles.time}>{item.time}</td><th scope="row"><div>{title(item)}</div>{say(item.text) ? <p>{say(item.text)}</p> : null}</th><td>{say(item.speaker)}</td>{spec.showLocation ? <td>{say(item.location)}</td> : null}</tr>)}</tbody>
        </table>
      </div> : <ol className={spec.layout === "timeline" ? styles.timeline : styles.cards} aria-label={label}>
        {visible.map((item,index) => <li key={index}><div className={styles.eventMeta}><span>{say(item.day)}</span><span className={styles.time}>{item.time}</span></div><h3>{title(item)}</h3>{say(item.text) ? <p>{say(item.text)}</p> : null}{say(item.speaker) ? <p>{say(item.speaker)}</p> : null}{spec.showLocation && say(item.location) ? <p>{say(item.location)}</p> : null}</li>)}
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
      <table className={styles.table} aria-label={label}><caption>{label}</caption>
        <thead><tr><th scope="col">{words.feature}</th>{spec.columns.map((column,index) => <th scope="col" key={index} className={column.highlight ? styles.highlight : undefined}><div>{say(column.title)}</div>{say(column.subtitle) ? <p>{say(column.subtitle)}</p> : null}{column.href ? <a className={styles.cta} href={column.href}>{say(column.cta) || words.choose}</a> : null}</th>)}</tr></thead>
        <tbody>{spec.rows.map((row,index) => <tr key={index}><th scope="row">{say(row.label)}</th>{spec.columns.map((column,c) => { const cell = row.values[c]; return <td key={c} className={column.highlight ? styles.highlight : undefined}>{cell?.state === "yes" ? <span className={styles.yes}>✓ {words.yes}</span> : cell?.state === "no" ? <span className={styles.no}>− {words.no}</span> : say(cell?.text ?? {}) || "—"}</td>; })}</tr>)}</tbody>
      </table>
    </div>
    {say(spec.caption) ? <p className={styles.caption}>{say(spec.caption)}</p> : null}
  </div>;
}
