"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function getSpeechRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

type Props = {
  className?: string;
  withLabel?: boolean;
  label?: string;
};

export function VoiceSearchButton({ className, withLabel, label }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const speechRef = useRef<any>(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognitionCtor());
    return () => {
      try {
        if (speechRef.current) {
          speechRef.current.onresult = null;
          speechRef.current.onerror = null;
          speechRef.current.onend = null;
          speechRef.current.stop();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  function stopVoice() {
    try {
      speechRef.current?.stop?.();
    } catch {
      // ignore
    }
    setActive(false);
  }

  function onToggle() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      setError("Voice search is not supported in this browser.");
      return;
    }
    if (active) {
      stopVoice();
      return;
    }

    let recognition = speechRef.current;
    if (!recognition) {
      recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      speechRef.current = recognition;
    }

    const lang =
      (typeof document !== "undefined" && document.documentElement?.lang) ||
      (typeof navigator !== "undefined" && navigator.language) ||
      "en-US";
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ? String(event.results[0][0].transcript).trim() : "";
      if (transcript) {
        router.push(`/search?q=${encodeURIComponent(transcript)}`);
      }
      setActive(false);
    };
    recognition.onerror = (event: any) => {
      const code = String(event?.error || "").toLowerCase();
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone permission denied.");
      } else if (code === "no-speech") {
        setError("No speech detected. Try again.");
      } else {
        setError("Voice search failed.");
      }
      setActive(false);
    };
    recognition.onend = () => {
      setActive(false);
    };

    setError(null);
    setActive(true);
    try {
      recognition.start();
    } catch {
      setActive(false);
      setError("Voice search failed to start.");
    }
  }

  const ar = typeof document !== "undefined" && document.documentElement?.lang?.startsWith("ar");
  const title = error || (supported ? (ar ? "بحث بالصوت" : "Voice search") : ar ? "البحث بالصوت غير مدعوم" : "Voice search not supported");

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={className}
        aria-label={ar ? "بحث بالصوت" : "Voice search"}
        aria-pressed={active}
        disabled={!supported}
        title={title}
      >
        {/* A microphone (filled while listening), never the letters "MIC"/"REC". */}
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" />
        </svg>
        {withLabel ? <span>{label ?? "Voice"}</span> : null}
      </button>
      {error ? <span className="sr-only" aria-live="polite">{error}</span> : null}
    </>
  );
}
