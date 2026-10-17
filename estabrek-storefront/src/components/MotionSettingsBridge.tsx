"use client";

import { useEffect, useState } from "react";
import { motionPreviewing, motionSettings } from "@/lib/motionSettings";

/**
 * Applies the admin's motion settings that live on the page itself (phone glass
 * effects), and while the owner previews new settings (?motion-preview=…) shows
 * a small note with a way out. See lib/motionSettings.ts.
 */
export function MotionSettingsBridge() {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    const s = motionSettings();
    document.documentElement.toggleAttribute("data-phone-glass", s.phoneGlass);
    setPreview(motionPreviewing());
  }, []);
  if (!preview) return null;
  const leave = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("motion-preview", "off");
    window.location.href = url.toString();
  };
  return (
    <div className="motion-preview-note" role="status" dir="rtl">
      <span>معاينة إعدادات الحركة (بهالمتصفح بس)</span>
      <button type="button" onClick={leave}>
        إنهاء المعاينة
      </button>
    </div>
  );
}
