"use client";
import styles from "./AccordionControls.module.css";

/** Native details remain independently usable; these buttons only affect this group. */
export function AccordionControls({ expand, collapse }: { expand: string; collapse: string }) {
  return <div className={`${styles.controls} pt-acc-controls`}>
    <button type="button" onClick={(event) => event.currentTarget.closest(".pt-acc")?.querySelectorAll<HTMLDetailsElement>(":scope > .pt-acc-item").forEach((item) => { item.open = true; })}>{expand}</button>
    <button type="button" onClick={(event) => event.currentTarget.closest(".pt-acc")?.querySelectorAll<HTMLDetailsElement>(":scope > .pt-acc-item").forEach((item) => { item.open = false; })}>{collapse}</button>
  </div>;
}
