"use client";
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import styles from "./ShowcaseView.module.css";

export type ShowcasePanel = { title: string; text: string; image?: string; href?: string; cta: string };
type Props = { items: ShowcasePanel[]; label: string; look?: "clay"; layout: "horizontal" | "vertical"; activation: "click" | "hover"; initial: number; ratio: number; height: number; duration: number; overlay: number };

/** Each panel has one expansion button and a separate, focusable destination link. */
export function ShowcaseView({ items, label, layout, activation, initial, ratio, height, duration, overlay, look }: Props) {
  const [selected, setSelected] = useState(initial);
  const active = Math.max(0, Math.min(items.length - 1, selected));
  const base = useId().replace(/[^\w-]/g, "");
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const keys = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const mobile = window.matchMedia("(max-width: 639.98px)").matches;
    const vertical = layout === "vertical" || mobile;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    const previous = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    let target: number;
    if (event.key === next) target = (index + 1) % items.length;
    else if (event.key === previous) target = (index + items.length - 1) % items.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = items.length - 1;
    else return;
    event.preventDefault();
    setSelected(target);
    buttons.current[target]?.focus();
  };
  const style = { "--showcase-height": `${height}px`, "--showcase-duration": `${duration}s`, "--showcase-ratio": ratio, "--showcase-overlay": overlay, "--showcase-count": items.length } as CSSProperties;
  return (
    <div className={`${styles.gallery} pt-showcase-panels`} data-layout={layout} data-look={look} data-activation={activation} role="group" aria-label={label} style={style}>
      {items.map((item, index) => (
        <article key={index} className="pt-showcase-panel" data-expanded={active === index ? "true" : "false"} onPointerEnter={(event) => {
          // Hover must not hide a link that a keyboard user is currently using.
          const focusedDetails = document.activeElement?.closest(".pt-showcase-details");
          if (focusedDetails && event.currentTarget.parentElement?.contains(focusedDetails)) return;
          if (activation === "hover" && event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) setSelected(index);
        }}>
          {item.image ? <img className="pt-showcase-image" src={item.image} alt="" loading="lazy" decoding="async" draggable={false} /> : null}
          <span className="pt-showcase-shade" aria-hidden="true" />
          <button ref={(button) => { buttons.current[index] = button; }} className="pt-showcase-toggle" type="button" id={`${base}-button-${index}`} aria-expanded={active === index} aria-controls={`${base}-details-${index}`} onClick={() => setSelected(index)} onKeyDown={(event) => keys(event, index)}>
            <span className="pt-showcase-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="pt-showcase-title">{item.title}</span>
          </button>
          <div className="pt-showcase-details" id={`${base}-details-${index}`} aria-labelledby={`${base}-button-${index}`} hidden={active !== index}>
            {item.text ? <p>{item.text}</p> : null}
            {item.href ? <a className="pt-showcase-link" href={item.href}>{item.cta}<span aria-hidden="true"> ↗</span></a> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
