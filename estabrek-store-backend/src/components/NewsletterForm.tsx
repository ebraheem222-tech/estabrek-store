"use client";

import React, { useState } from "react";
import { TypewriterText } from "@/components/effects/TypewriterText";
import { tokensToClassName } from "@/cms/style/tokensToTw";

const SPLIT_TEXT_EFFECTS = new Set(["wave", "bounce"]);

function splitTextWithEffect(text: string, effect?: string): { content: React.ReactNode; ariaLabel?: string } {
  if (!text || !effect || !SPLIT_TEXT_EFFECTS.has(effect)) {
    return { content: text };
  }
  const delayStep = effect === "wave" ? 0.06 : 0.04;
  const letters = Array.from(text);
  const content = letters.map((ch, idx) => (
    <span key={`${idx}-${ch}`} aria-hidden="true" style={{ animationDelay: `${idx * delayStep}s` }}>
      {ch === " " ? "\u00a0" : ch}
    </span>
  ));
  return { content, ariaLabel: text };
}

function textEffectClass(tokens?: any) {
  return tokensToClassName({ textEffect: tokens?.textEffect } as any);
}

function textContent(text: string, tokens?: any) {
  const value = typeof text === "string" ? text : String(text ?? "");
  const effect = tokens?.textEffect;
  const typewriter = tokens?.typewriter;
  const typewriterTexts = Array.isArray(typewriter?.texts) && typewriter.texts.length
    ? typewriter.texts
    : value
      ? [value]
      : [];
  const useTypewriter = !!(typewriter?.enabled && typewriterTexts.length);

  if (useTypewriter) {
    const allowEffect = effect && effect !== "none" && !SPLIT_TEXT_EFFECTS.has(effect) && effect !== "typewriter";
    const typewriterClass = allowEffect ? textEffectClass(tokens) : "";
    return {
      useTypewriter: true,
      ariaLabel: undefined as string | undefined,
      className: "",
      content: (
        <TypewriterText
          texts={typewriterTexts}
          typeSpeed={typewriter?.speed}
          deleteSpeed={typewriter?.deleteSpeed}
          pauseTime={typewriter?.pauseTime}
          loop={typewriter?.loop ?? true}
          textClassName={typewriterClass || undefined}
        />
      ),
    };
  }

  const split = splitTextWithEffect(value, effect);
  return { useTypewriter: false, ariaLabel: split.ariaLabel, className: textEffectClass(tokens), content: split.content };
}

function cls(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export default function NewsletterForm({
  title,
  text,
  placeholder,
  buttonLabel,
  successMessage,
  textTokens,
}: {
  title?: string;
  text?: string;
  placeholder?: string;
  buttonLabel?: string;
  successMessage?: string;
  textTokens?: any;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [msg, setMsg] = useState<string>("");
  const titleData = title ? textContent(String(title), textTokens) : null;
  const textData = text ? textContent(String(text), textTokens) : null;
  const labelValue = buttonLabel || "اشتراك";
  const buttonData = textContent(String(labelValue), textTokens);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: v, source: "newsletter_section" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok !== true) throw new Error("failed");
      setStatus("ok");
      setMsg(successMessage || "تم الاشتراك ✅");
      setEmail("");
    } catch {
      setStatus("error");
      setMsg("فشل الاشتراك، جرّب مرة ثانية");
    }
  }

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="mx-auto max-w-2xl">
        {titleData ? (
          <h3 className={cls("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
            {titleData.content}
          </h3>
        ) : null}
        {textData ? (
          <p className={cls("mt-1 text-sm opacity-80", textData.className)} aria-label={textData.ariaLabel}>
            {textData.content}
          </p>
        ) : null}

        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="h-11 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 outline-none focus:border-white/30"
            placeholder={placeholder || "اكتب بريدك الإلكتروني"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            type="email"
            required
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className={cls("h-11 rounded-xl bg-white text-black px-4 font-medium disabled:opacity-60", buttonData.className)}
            aria-label={buttonData.ariaLabel}
          >
            {status === "loading" ? "..." : (buttonData.content ?? labelValue)}
          </button>
        </form>

        {msg ? <div className={`mt-3 text-sm ${status === "error" ? "text-red-300" : "text-emerald-300"}`}>{msg}</div> : null}
      </div>
    </section>
  );
}
