"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { RoseMascot, type MascotHandle } from "./RoseMascot";
import { watchHeroMascotSpot } from "./phoneSpot";
import { useRazan } from "@/store/razan";
import { SEASON_LINES, pickText, seasonNow } from "@/lib/razanSettings";

/** Rose welcomes the shopper on the home page and cheers at every shop moment. */
export const HeroMascot = forwardRef<MascotHandle, { ar: boolean; holdGreeting?: boolean }>(function HeroMascot({ ar, holdGreeting }, ref) {
  const me = useRef<MascotHandle>(null);
  useImperativeHandle(ref, () => me.current as MascotHandle);
  // Phones: stand in the free lower corner of the photo, not on the model.
  useEffect(() => watchHeroMascotSpot(), [ar]);
  const razan = useRazan();
  // The owner's hello (admin → رزان); in Ramadan, Eid, summer and winter her season's line.
  const season = seasonNow(razan);
  const hello = season
    ? pickText(razan.seasonal.lines[season], ar, SEASON_LINES[season][ar ? "ar" : "en"])
    : pickText(razan.texts.welcome, ar, ar ? "أهلاً فيكِ في استبرق 🌸" : "Welcome to Estabrek 🌸");
  // On the film opening her hello waits until the film is in and the shopper is not
  // scrolling (it landed in the middle of the first scroll, the busiest moment).
  const held = holdGreeting !== undefined;
  const greeted = useRef(false);
  useEffect(() => {
    if (!held || holdGreeting || greeted.current || !razan.enabled) return;
    let t = 0;
    const wait = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        window.removeEventListener("scroll", wait);
        greeted.current = true;
        me.current?.wave();
        me.current?.say(hello, 2800, "greet");
      }, 900);
    };
    window.addEventListener("scroll", wait, { passive: true });
    wait();
    return () => { window.clearTimeout(t); window.removeEventListener("scroll", wait); };
  }, [held, holdGreeting, hello, razan.enabled]);
  if (!razan.enabled) return null;
  return (
    <RoseMascot
      ref={me}
      className="hero-mascot"
      mirrored={!ar}
      ar={ar}
      reactive
      greeting={held ? undefined : hello}
      label={ar ? "رَزان، دليلتكِ في استبرق" : "Rose, your Estabrek guide"}
    />
  );
});
