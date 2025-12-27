"use client";

import React, { useState } from "react";

export default function NewsletterForm({ title, text, placeholder, buttonLabel, successMessage }: { title?: string; text?: string; placeholder?: string; buttonLabel?: string; successMessage?: string; }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [msg, setMsg] = useState<string>("");

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
        {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
        {text ? <p className="mt-1 text-sm opacity-80">{text}</p> : null}

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
            className="h-11 rounded-xl bg-white text-black px-4 font-medium disabled:opacity-60"
          >
            {status === "loading" ? "..." : (buttonLabel || "اشتراك")}
          </button>
        </form>

        {msg ? <div className={`mt-3 text-sm ${status === "error" ? "text-red-300" : "text-emerald-300"}`}>{msg}</div> : null}
      </div>
    </section>
  );
}
