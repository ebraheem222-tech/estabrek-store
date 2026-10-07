"use client";
import { forwardRef, useEffect } from "react";
import { RoseMascot, type MascotHandle } from "./RoseMascot";
import { watchHeroMascotSpot } from "./phoneSpot";
import { useRazan } from "@/store/razan";
import { SEASON_LINES, pickText, seasonNow } from "@/lib/razanSettings";

/** Rose welcomes the shopper on the home page and cheers at every shop moment. */
export const HeroMascot = forwardRef<MascotHandle, { ar: boolean }>(function HeroMascot({ ar }, ref) {
  // Phones: stand in the free lower corner of the photo, not on the model.
  useEffect(() => watchHeroMascotSpot(), [ar]);
  const razan = useRazan();
  // The owner's hello (admin → رزان); in Ramadan, Eid, summer and winter her season's line.
  const season = seasonNow(razan);
  const hello = season
    ? pickText(razan.seasonal.lines[season], ar, SEASON_LINES[season][ar ? "ar" : "en"])
    : pickText(razan.texts.welcome, ar, ar ? "أهلاً فيكِ في استبرق 🌸" : "Welcome to Estabrek 🌸");
  if (!razan.enabled) return null;
  return (
    <RoseMascot
      ref={ref}
      className="hero-mascot"
      mirrored={!ar}
      ar={ar}
      reactive
      greeting={hello}
      label={ar ? "رَزان، دليلتكِ في استبرق" : "Rose, your Estabrek guide"}
    />
  );
});
