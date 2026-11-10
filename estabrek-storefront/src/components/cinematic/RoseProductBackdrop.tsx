import type { ReactNode } from "react";
import type { Mood } from "@/lib/categoryMood";
import { RoseWave } from "./RoseWave";

/*
 * Behind a product: a soft panel in its category's mood with small drawings of it (snowflakes for winter,
 * petals for spring, curls of smoke for incense, sparkles and pearls for accessories…) that pop in one after
 * another and then float, and a wave at its foot (rose-showcase.css, "the product's backdrop"). All drawn here.
 */
export const DRAWINGS: Record<Mood, [ReactNode, ReactNode]> = {
  winter: [
    <g key="flake"><path d="M24 4v40M6.7 14l34.6 20M6.7 34l34.6-20" /><path d="M24 11l-4-4M24 11l4-4M24 37l-4 4M24 37l4 4M12.3 17.3l-5.3-1.4M12.3 17.3l1.4-5.3M35.7 30.7l5.3 1.4M35.7 30.7l-1.4 5.3M12.3 30.7l-5.3 1.4M12.3 30.7l1.4 5.3M35.7 17.3l5.3-1.4M35.7 17.3l-1.4-5.3" /></g>,
    <g key="dot"><circle cx="24" cy="24" r="5" className="fill" /><circle cx="24" cy="24" r="11" /></g>,
  ],
  spring: [
    <g key="flower" className="fill"><circle cx="24" cy="13" r="7" /><circle cx="34.5" cy="20.6" r="7" /><circle cx="30.5" cy="33" r="7" /><circle cx="17.5" cy="33" r="7" /><circle cx="13.5" cy="20.6" r="7" /><circle cx="24" cy="24" r="4.5" className="core" /></g>,
    <g key="sun"><circle cx="24" cy="24" r="8" /><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11.3 11.3l4.2 4.2M32.5 32.5l4.2 4.2M11.3 36.7l4.2-4.2M32.5 15.5l4.2-4.2" /></g>,
  ],
  incense: [
    <g key="smoke"><path d="M24 44c-10-8 10-14 0-22s10-12 2-18" /><path d="M14 40c-5-5 5-9 0-14" /></g>,
    <g key="ember" className="fill"><circle cx="24" cy="24" r="4" /><circle cx="33" cy="15" r="2.5" /><circle cx="15" cy="33" r="2" /></g>,
  ],
  accessories: [
    <g key="sparkle" className="fill"><path d="M24 4c2 14 6 18 20 20-14 2-18 6-20 20-2-14-6-18-20-20 14-2 18-6 20-20Z" /></g>,
    <g key="pearl"><circle cx="24" cy="24" r="12" /><circle cx="20" cy="20" r="3.5" className="fill" /></g>,
  ],
  kids: [
    <g key="star" className="fill"><path d="M24 5l5.6 11.9 13 1.6-9.6 8.9 2.5 12.9L24 33.9 12.5 40.3 15 27.4 5.4 18.5l13-1.6Z" /></g>,
    <g key="heart" className="fill"><path d="M24 40S8 30.5 8 19.5A8.5 8.5 0 0 1 24 15a8.5 8.5 0 0 1 16 4.5C40 30.5 24 40 24 40Z" /></g>,
  ],
  prayer: [
    <g key="moon" className="fill"><path d="M31 6a18 18 0 1 0 0 36 14 14 0 1 1 0-36Z" /></g>,
    <g key="star" className="fill"><path d="M24 10l3.4 7.3 8 .9-5.9 5.4 1.6 7.9L24 27.6l-7.1 3.9 1.6-7.9-5.9-5.4 8-.9Z" /></g>,
  ],
  hijab: [
    <g key="fold"><path d="M4 16c8-8 16 8 24 0s12-6 16-2" /><path d="M4 26c8-8 16 8 24 0s12-6 16-2" /><path d="M4 36c8-8 16 8 24 0s12-6 16-2" /></g>,
    <g key="pin"><circle cx="24" cy="12" r="5" className="fill" /><path d="M24 17v25" /></g>,
  ],
  dresses: [
    <g key="arch"><path d="M10 44V22a14 14 0 0 1 28 0v22" /><path d="M16 44V23a8 8 0 0 1 16 0v21" /></g>,
    <g key="sparkle" className="fill"><path d="M24 8c1.5 10 4.5 13 14.5 14.5C28.5 24 25.5 27 24 37c-1.5-10-4.5-13-14.5-14.5C19.5 21 22.5 18 24 8Z" /></g>,
  ],
  default: [
    <g key="star"><path d="M24 6v36M6 24h36M11.3 11.3l25.4 25.4M36.7 11.3L11.3 36.7" /></g>,
    <g key="ring"><circle cx="24" cy="24" r="10" /></g>,
  ],
};

// Where they sit (% of the panel), how big, how turned, and when each pops in.
const SPOTS = [
  { x: 6, y: 10, s: 1.1, r: -12 }, { x: 20, y: 64, s: 0.7, r: 18 }, { x: 34, y: 14, s: 0.8, r: 8 },
  { x: 46, y: 88, s: 1, r: -20 }, { x: 58, y: 26, s: 0.6, r: 30 }, { x: 70, y: 70, s: 1.25, r: -6 },
  { x: 84, y: 12, s: 0.75, r: 22 }, { x: 92, y: 48, s: 0.95, r: -16 }, { x: 12, y: 40, s: 0.55, r: 40 },
  { x: 78, y: 92, s: 0.6, r: 10 },
];

export function RoseProductBackdrop({ mood }: { mood: Mood }) {
  const [one, two] = DRAWINGS[mood];
  return (
    <div className="rose-pdp-backdrop" data-mood={mood} aria-hidden="true">
      {SPOTS.map((spot, i) => (
        <svg
          key={i}
          className="rose-motif"
          viewBox="0 0 48 48"
          style={{ "--x": `${spot.x}%`, "--y": `${spot.y}%`, "--s": spot.s, "--r": `${spot.r}deg`, "--d": `${0.15 + i * 0.09}s` } as React.CSSProperties}
        >
          {i % 2 ? two : one}
        </svg>
      ))}
      <RoseWave className="rose-pdp-backdrop-wave" />
    </div>
  );
}
