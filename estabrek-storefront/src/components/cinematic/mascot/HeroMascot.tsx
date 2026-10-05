"use client";
import { forwardRef, useEffect } from "react";
import { RoseMascot, type MascotHandle } from "./RoseMascot";
import { watchHeroMascotSpot } from "./phoneSpot";

/** Rose welcomes the shopper on the home page and cheers at every shop moment. */
export const HeroMascot = forwardRef<MascotHandle, { ar: boolean }>(function HeroMascot({ ar }, ref) {
  // Phones: stand in the free lower corner of the photo, not on the model.
  useEffect(() => watchHeroMascotSpot(), [ar]);
  return (
    <RoseMascot
      ref={ref}
      className="hero-mascot"
      mirrored={!ar}
      ar={ar}
      reactive
      greeting={ar ? "أهلاً فيكِ في استبرق 🌸" : "Welcome to Estabrek 🌸"}
      label={ar ? "رَزان، دليلتكِ في استبرق" : "Rose, your Estabrek guide"}
    />
  );
});
