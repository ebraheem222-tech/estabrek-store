"use client";
/**
 * The shop as an app, on the shopper's side (lib/pwa.ts): while the owner has the app on, the worker
 * (public/sw.js) is registered, and the shop offers to install it the way the owner chose (a banner or a small
 * button; never once it is installed, and not again for a month after the shopper closes it). A phone that can't be
 * asked (an iPhone's Safari) is told the two taps that do it. Switched off, the worker and what it kept go.
 * Nothing of this runs inside the admin's editor frames.
 */
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";
import type { Prompt } from "@/lib/pwa";
import s from "./AppShell.module.css";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const CLOSED_KEY = "shop-app-install-closed";
const MONTH = 30 * 24 * 60 * 60 * 1000;
/** What the worker keeps (public/sw.js): emptied when the app is switched off. */
const KEPT = /^(shell-|pages-v|assets-v)/;

const inFrame = () => {
  try {
    return window.top !== window.self || /\/(studio-frame|design-frame)(\/|$)/.test(window.location.pathname);
  } catch {
    return true;
  }
};
const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
/** An iPhone or iPad's Safari: installing is the shopper's two taps there, never a question the shop can ask. */
const iosSafari = () => /iP(hone|ad|od)/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
const closedLately = () => {
  try {
    return Date.now() - Number(localStorage.getItem(CLOSED_KEY) || 0) < MONTH;
  } catch {
    return false;
  }
};

export function AppShell({ enabled, worker, prompt, lang, name, icon }: { enabled: boolean; worker: string; prompt: Prompt; lang: Lang; name: string; icon: string }) {
  const [asked, setAsked] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [steps, setSteps] = useState(false);

  // The worker: on with the app, gone (with what it kept) without it.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || inFrame()) return;
    if (enabled) {
      navigator.serviceWorker.register(worker, { scope: "/" }).catch(() => {});
      return;
    }
    void (async () => {
      const mine = (await navigator.serviceWorker.getRegistrations()).filter((r) => (r.active ?? r.waiting ?? r.installing)?.scriptURL.includes("/sw.js"));
      if (!mine.length) return;
      await Promise.all(mine.map((r) => r.unregister()));
      if ("caches" in window) for (const key of await caches.keys()) if (KEPT.test(key)) await caches.delete(key);
    })().catch(() => {});
  }, [enabled, worker]);

  // Offering to install.
  useEffect(() => {
    if (!enabled || prompt === "off" || inFrame() || standalone()) return;
    const closed = closedLately();
    const onAsk = (e: Event) => {
      e.preventDefault();
      setAsked(e as InstallEvent);
      if (!closed) setHidden(false);
    };
    const onInstalled = () => {
      setAsked(null);
      setHidden(true);
    };
    window.addEventListener("beforeinstallprompt", onAsk);
    window.addEventListener("appinstalled", onInstalled);
    if (iosSafari()) {
      setIos(true);
      if (!closed) setHidden(false);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onAsk);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [enabled, prompt]);

  if (!enabled || prompt === "off" || hidden || (!asked && !ios)) return null;

  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(CLOSED_KEY, String(Date.now()));
    } catch {
      /* storage blocked: closed for this visit */
    }
  };
  const install = async () => {
    if (!asked) return setSteps((v) => !v);
    await asked.prompt();
    const choice = await asked.userChoice.catch(() => null);
    setAsked(null);
    if (choice?.outcome === "accepted") setHidden(true);
  };
  const how = (
    <p className={s.steps} data-testid="app-install-steps">
      {tr(lang, "على الآيفون: زر المشاركة تحت، وبعدين «أضف إلى الشاشة الرئيسية».", "On an iPhone: the Share button below, then “Add to Home Screen”.")}
    </p>
  );

  if (prompt === "button") {
    return (
      <div className={s.buttonWrap} data-testid="app-install" data-kind="button">
        <button type="button" className={s.pill} onClick={install} data-testid="app-install-go">
          <span aria-hidden="true">⤓</span> {tr(lang, "تثبيت التطبيق", "Install the app")}
        </button>
        {steps ? how : null}
      </div>
    );
  }
  return (
    <div className={s.banner} role="dialog" aria-label={tr(lang, "تثبيت التطبيق", "Install the app")} data-testid="app-install" data-kind="banner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.icon} src={icon} alt="" width={48} height={48} />
      <div className={s.words}>
        <strong>{tr(lang, `${name} على شاشتك`, "{0} on your home screen", [name])}</strong>
        <span>{tr(lang, "بيفتح متل التطبيق، وبيشتغل حتى بدون نت.", "Opens like an app, and works even offline.")}</span>
        {ios || steps ? how : null}
      </div>
      <div className={s.actions}>
        {asked ? (
          <button type="button" className={s.go} onClick={install} data-testid="app-install-go">
            {tr(lang, "تثبيت", "Install")}
          </button>
        ) : null}
        <button type="button" className={s.close} onClick={close} aria-label={tr(lang, "إغلاق", "Close")} data-testid="app-install-close">
          ✕
        </button>
      </div>
    </div>
  );
}
