/*
 * A soft wave in three layers that flow slowly sideways (rose-showcase.css, "the waves"): where the page
 * meets the footer, under the shop's opening, between a product and its "you may also like". Its colour is
 * the part it leads into (--wave-fill), so the two parts melt into each other instead of meeting at a line.
 */
const WAVES = [
  // One period every 720 units, drawn twice as wide as the box so a shift by one period loops without a seam.
  "M0 46 Q180 18 360 46 T720 46 T1080 46 T1440 46 T1800 46 T2160 46 T2520 46 T2880 46 V80 H0 Z",
  "M0 52 Q180 30 360 52 T720 52 T1080 52 T1440 52 T1800 52 T2160 52 T2520 52 T2880 52 V80 H0 Z",
  "M0 60 Q180 42 360 60 T720 60 T1080 60 T1440 60 T1800 60 T2160 60 T2520 60 T2880 60 V80 H0 Z",
];

export function RoseWave({ className = "" }: { className?: string }) {
  return (
    <div className={`rose-wave ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" focusable="false">
        {WAVES.map((d, i) => (
          <path key={i} className={`rose-wave-layer rose-wave-${i}`} d={d} />
        ))}
      </svg>
    </div>
  );
}
