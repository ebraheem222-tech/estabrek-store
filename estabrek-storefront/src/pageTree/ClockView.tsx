"use client";
import { useEffect, useState } from "react";
import type { TreeLang } from "./tree";

export function ClockView({ timezone, format, seconds, date, lang, label }: { timezone: string; format: "12" | "24"; seconds: boolean; date: boolean; lang: TreeLang; label?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer = 0;
    const sync = () => {
      window.clearInterval(timer);
      if (document.visibilityState === "hidden") return;
      setNow(new Date()); timer = window.setInterval(() => setNow(new Date()), seconds ? 1000 : 10000);
    };
    sync(); document.addEventListener("visibilitychange", sync);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, [seconds, timezone]);
  let zone = timezone;
  try { new Intl.DateTimeFormat(lang, { timeZone: zone }); } catch { zone = "UTC"; }
  const time = now ? new Intl.DateTimeFormat(lang, { timeZone: zone, hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hourCycle: format === "12" ? "h12" : "h23" }).format(now) : "—";
  return <div data-clock-zone={zone} style={{ fontVariantNumeric: "tabular-nums" }}>
    {label ? <div style={{ fontSize: ".75em", opacity: .7, marginBottom: 8 }}>{label}</div> : null}
    <time dateTime={now?.toISOString()} style={{ fontSize: "clamp(24px,4vw,52px)", lineHeight: 1.2 }} data-clock-time>{time}</time>
    <div style={{ fontSize: ".75em", opacity: .7, marginTop: 8 }}>{date && now ? `${new Intl.DateTimeFormat(lang, { timeZone: zone, dateStyle: "medium" }).format(now)} · ` : ""}{zone}</div>
  </div>;
}
