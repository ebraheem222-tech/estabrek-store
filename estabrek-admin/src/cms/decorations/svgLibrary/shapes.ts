// ============================================================
// ESTABREK SVG LIBRARY (SHAPES)
// ============================================================
// Used by the Admin "Advanced Styling → Decorations" picker.
// Inserted into `decor.before/after.svg` when shape === "custom-svg".
// ============================================================

export const SVG_LIBRARY_SHAPES = {
  // ============================================================
  // WAVES (10)
  // ============================================================

  wave1: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L48 55C96 50 192 40 288 45C384 50 480 70 576 75C672 80 768 70 864 60C960 50 1056 40 1152 45C1248 50 1344 70 1392 80L1440 90V120H0V60Z" fill="currentColor"/>
</svg>`,

  wave2: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0L60 10C120 20 240 40 360 50C480 60 600 60 720 55C840 50 960 40 1080 35C1200 30 1320 30 1380 30L1440 30V120H0V0Z" fill="currentColor"/>
</svg>`,

  wave3: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 80L40 75C80 70 160 60 240 55C320 50 400 50 480 55C560 60 640 70 720 70C800 70 880 60 960 50C1040 40 1120 30 1200 35C1280 40 1360 60 1400 70L1440 80V120H0V80Z" fill="currentColor"/>
</svg>`,

  waveDouble: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 40L48 45C96 50 192 60 288 55C384 50 480 30 576 25C672 20 768 30 864 40C960 50 1056 60 1152 55C1248 50 1344 30 1392 20L1440 10V0H0V40Z" fill="currentColor" opacity="0.5"/>
  <path d="M0 80L48 75C96 70 192 60 288 65C384 70 480 90 576 95C672 100 768 90 864 80C960 70 1056 60 1152 65C1248 70 1344 90 1392 100L1440 110V120H0V80Z" fill="currentColor"/>
</svg>`,

  waveSoft: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60Q360 0 720 60T1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,

  waveSharp: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L180 30L360 70L540 20L720 80L900 40L1080 90L1260 50L1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,

  waveAsym: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 100C240 100 240 20 480 20C720 20 720 80 960 80C1200 80 1200 40 1440 40V120H0V100Z" fill="currentColor"/>
</svg>`,

  waveMultiple: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 20Q180 60 360 20T720 20T1080 20T1440 20V120H0V20Z" fill="currentColor" opacity="0.3"/>
  <path d="M0 40Q180 80 360 40T720 40T1080 40T1440 40V120H0V40Z" fill="currentColor" opacity="0.5"/>
  <path d="M0 60Q180 100 360 60T720 60T1080 60T1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,

  waveThin: `<svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 20Q360 0 720 20T1440 20V40H0V20Z" fill="currentColor"/>
</svg>`,

  waveThick: `<svg viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 100Q360 0 720 100T1440 100V200H0V100Z" fill="currentColor"/>
</svg>`,

  // ============================================================
  // TRIANGLES & ANGLES (10)
  // ============================================================

  triangleUp: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M720 0L1440 120H0L720 0Z" fill="currentColor"/>
</svg>`,

  triangleDown: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H1440L720 120L0 0Z" fill="currentColor"/>
</svg>`,

  triangleLeft: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L1440 0V120L0 60Z" fill="currentColor"/>
</svg>`,

  triangleRight: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1440 60L0 120V0L1440 60Z" fill="currentColor"/>
</svg>`,

  angleUp: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120L720 0L1440 120H0Z" fill="currentColor"/>
</svg>`,

  angleDown: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0L720 120L1440 0V120H0V0Z" fill="currentColor"/>
</svg>`,

  angleAsym: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120L960 0L1440 80V120H0Z" fill="currentColor"/>
</svg>`,

  zigzag: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120L120 60L240 120L360 60L480 120L600 60L720 120L840 60L960 120L1080 60L1200 120L1320 60L1440 120V120H0Z" fill="currentColor"/>
</svg>`,

  zigzagSmall: `<svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L60 30L120 60L180 30L240 60L300 30L360 60L420 30L480 60L540 30L600 60L660 30L720 60L780 30L840 60L900 30L960 60L1020 30L1080 60L1140 30L1200 60L1260 30L1320 60L1380 30L1440 60H0Z" fill="currentColor"/>
</svg>`,

  arrow: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H600L720 60L840 0H1440V120H0V0Z" fill="currentColor"/>
</svg>`,

  // ============================================================
  // CURVES & ARCS (10)
  // ============================================================

  curveUp: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120C0 53.7 322.7 0 720 0C1117.3 0 1440 53.7 1440 120H0Z" fill="currentColor"/>
</svg>`,

  curveDown: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0C0 66.3 322.7 120 720 120C1117.3 120 1440 66.3 1440 0V120H0V0Z" fill="currentColor"/>
</svg>`,

  curveAsym: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 80C480 80 480 0 960 0C1200 0 1440 40 1440 80V120H0V80Z" fill="currentColor"/>
</svg>`,

  arcUp: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120Q720 -40 1440 120H0Z" fill="currentColor"/>
</svg>`,

  arcDown: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0Q720 160 1440 0V120H0V0Z" fill="currentColor"/>
</svg>`,

  semicircle: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="720" cy="120" rx="400" ry="100" fill="currentColor"/>
</svg>`,

  scallop: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120C0 60 80 60 160 120C160 60 240 60 320 120C320 60 400 60 480 120C480 60 560 60 640 120C640 60 720 60 800 120C800 60 880 60 960 120C960 60 1040 60 1120 120C1120 60 1200 60 1280 120C1280 60 1360 60 1440 120H0Z" fill="currentColor"/>
</svg>`,

  scallopInverse: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0C0 60 80 60 160 0C160 60 240 60 320 0C320 60 400 60 480 0C480 60 560 60 640 0C640 60 720 60 800 0C800 60 880 60 960 0C960 60 1040 60 1120 0C1120 60 1200 60 1280 0C1280 60 1360 60 1440 0V120H0V0Z" fill="currentColor"/>
</svg>`,

  bump: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120H520C520 60 620 0 720 0C820 0 920 60 920 120H1440V120H0Z" fill="currentColor"/>
</svg>`,

  dip: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H520C520 60 620 120 720 120C820 120 920 60 920 0H1440V120H0V0Z" fill="currentColor"/>
</svg>`,

  // ============================================================
  // GEOMETRIC (10)
  // ============================================================

  slantLeft: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0L1440 120H0V0Z" fill="currentColor"/>
</svg>`,

  slantRight: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1440 0L0 120H1440V0Z" fill="currentColor"/>
</svg>`,

  slantDouble: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L720 0L1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,

  steps: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120V100H288V80H576V60H864V40H1152V20H1440V120H0Z" fill="currentColor"/>
</svg>`,

  stepsReverse: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 20H288V40H576V60H864V80H1152V100H1440V120H0V20Z" fill="currentColor"/>
</svg>`,

  stepsCenter: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120V80H360V40H540V0H900V40H1080V80H1440V120H0Z" fill="currentColor"/>
</svg>`,

  hexagon: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M360 120L0 60L360 0H1080L1440 60L1080 120H360Z" fill="currentColor"/>
</svg>`,

  diamond: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 0L200 100L100 200L0 100L100 0Z" fill="currentColor"/>
</svg>`,

  parallelogram: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M200 0H1440L1240 120H0L200 0Z" fill="currentColor"/>
</svg>`,

  trapezoid: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M200 0H1240L1440 120H0L200 0Z" fill="currentColor"/>
</svg>`,

  // ============================================================
  // BLOBS & ORGANIC (10)
  // ============================================================

  blob1: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C87,14.6,81.4,29.2,73.1,42.2C64.8,55.2,53.8,66.6,40.5,74.6C27.2,82.6,11.6,87.2,-3.8,92.4C-19.2,97.6,-38.4,103.4,-54.6,98.5C-70.8,93.6,-84,78,-91.3,60.7C-98.6,43.4,-100,24.7,-97.8,7C-95.6,-10.7,-89.8,-27.4,-80.8,-41.8C-71.8,-56.2,-59.6,-68.3,-45.6,-75.6C-31.6,-82.9,-15.8,-85.4,-0.1,-85.2C15.6,-85,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,

  blob2: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M39.9,-65.7C54.3,-60.5,70.2,-54.3,78.4,-42.6C86.6,-30.9,87,-13.5,84.4,2.5C81.8,18.5,76.2,33,67.2,45.2C58.2,57.3,45.8,67,32.1,73.5C18.4,80,-7.6,83.3,-30.6,78.8C-53.6,74.3,-73.6,62,-83.1,45.3C-92.6,28.6,-91.6,7.5,-87.3,-12.1C-83,-31.7,-75.4,-49.8,-62.2,-55.7C-49,-61.6,-30.2,-55.3,-14.4,-51.8C1.4,-48.3,25.5,-70.9,39.9,-65.7Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,

  blob3: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M47.7,-51.2C59.5,-42.5,65.2,-25.2,67.4,-7.6C69.6,10,68.3,28,59.3,41.3C50.3,54.6,33.6,63.2,15.7,69.4C-2.2,75.6,-21.3,79.4,-37.1,73.1C-52.9,66.8,-65.4,50.4,-70.9,32.5C-76.4,14.6,-74.9,-4.8,-68.4,-21.7C-61.9,-38.6,-50.4,-53,-36.6,-61C-22.8,-69,-6.7,-70.6,7.1,-78.3C20.9,-86,35.9,-59.9,47.7,-51.2Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,

  blob4: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M54.2,-67.5C69.7,-56.9,81.3,-39.5,85.4,-20.8C89.5,-2.1,86.1,17.9,77.3,35.1C68.5,52.3,54.3,66.7,37.4,74.4C20.5,82.1,0.9,83.1,-18.7,79.3C-38.3,75.5,-58,66.9,-70.9,52C-83.8,37.1,-89.9,15.9,-87.7,-4.1C-85.5,-24.1,-75,-42.9,-60.5,-53.7C-46,-64.5,-27.5,-67.3,-9.5,-56.3C8.5,-45.3,38.7,-78.1,54.2,-67.5Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,

  blob5: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M41.3,-49.3C54.4,-40.3,66.5,-28.1,71.4,-13.1C76.3,1.9,74,19.7,66.1,35.1C58.2,50.5,44.7,63.5,28.9,70.1C13.1,76.7,-5,76.9,-21.8,72.1C-38.6,67.3,-54.1,57.5,-63.9,43.4C-73.7,29.3,-77.8,10.9,-75.3,-6.3C-72.8,-23.5,-63.7,-39.5,-50.6,-48.6C-37.5,-57.7,-20.4,-59.9,-3.4,-55.8C13.6,-51.7,28.2,-58.3,41.3,-49.3Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,

  blobFlat: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60C160 20 320 100 480 60C640 20 800 100 960 60C1120 20 1280 100 1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,

  cloud: `<svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M170 70C170 70 180 60 170 50C160 40 150 45 150 45C150 35 135 25 120 30C105 20 85 25 80 40C70 35 55 40 55 55C40 50 25 60 30 75C30 90 50 95 70 90H160C175 90 185 80 170 70Z" fill="currentColor"/>
</svg>`,

  cloudWave: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120C80 80 120 100 200 80C280 60 320 100 400 80C480 60 520 100 600 80C680 60 720 100 800 80C880 60 920 100 1000 80C1080 60 1120 100 1200 80C1280 60 1360 100 1440 80V120H0Z" fill="currentColor"/>
</svg>`,

  splatter: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="60" fill="currentColor"/>
  <circle cx="60" cy="60" r="20" fill="currentColor"/>
  <circle cx="150" cy="70" r="15" fill="currentColor"/>
  <circle cx="140" cy="150" r="25" fill="currentColor"/>
  <circle cx="50" cy="140" r="18" fill="currentColor"/>
  <circle cx="100" cy="40" r="12" fill="currentColor"/>
  <circle cx="160" cy="120" r="10" fill="currentColor"/>
</svg>`,

  ink: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 20C60 20 40 60 40 100C40 140 60 180 100 180C140 180 160 140 160 100C160 60 140 20 100 20Z" fill="currentColor"/>
  <ellipse cx="100" cy="100" rx="80" ry="40" fill="currentColor"/>
  <circle cx="40" cy="80" r="15" fill="currentColor"/>
  <circle cx="160" cy="120" r="12" fill="currentColor"/>
</svg>`,

  // ============================================================
  // DECORATIVE (10)
  // ============================================================

  dots: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="5" fill="currentColor"/>
  <circle cx="60" cy="20" r="5" fill="currentColor"/>
  <circle cx="100" cy="20" r="5" fill="currentColor"/>
  <circle cx="140" cy="20" r="5" fill="currentColor"/>
  <circle cx="180" cy="20" r="5" fill="currentColor"/>
  <circle cx="20" cy="60" r="5" fill="currentColor"/>
  <circle cx="60" cy="60" r="5" fill="currentColor"/>
  <circle cx="100" cy="60" r="5" fill="currentColor"/>
  <circle cx="140" cy="60" r="5" fill="currentColor"/>
  <circle cx="180" cy="60" r="5" fill="currentColor"/>
  <circle cx="20" cy="100" r="5" fill="currentColor"/>
  <circle cx="60" cy="100" r="5" fill="currentColor"/>
  <circle cx="100" cy="100" r="5" fill="currentColor"/>
  <circle cx="140" cy="100" r="5" fill="currentColor"/>
  <circle cx="180" cy="100" r="5" fill="currentColor"/>
  <circle cx="20" cy="140" r="5" fill="currentColor"/>
  <circle cx="60" cy="140" r="5" fill="currentColor"/>
  <circle cx="100" cy="140" r="5" fill="currentColor"/>
  <circle cx="140" cy="140" r="5" fill="currentColor"/>
  <circle cx="180" cy="140" r="5" fill="currentColor"/>
  <circle cx="20" cy="180" r="5" fill="currentColor"/>
  <circle cx="60" cy="180" r="5" fill="currentColor"/>
  <circle cx="100" cy="180" r="5" fill="currentColor"/>
  <circle cx="140" cy="180" r="5" fill="currentColor"/>
  <circle cx="180" cy="180" r="5" fill="currentColor"/>
</svg>`,

  grid: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="0" y1="50" x2="200" y2="50" stroke="currentColor" stroke-width="1"/>
  <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" stroke-width="1"/>
  <line x1="0" y1="150" x2="200" y2="150" stroke="currentColor" stroke-width="1"/>
  <line x1="50" y1="0" x2="50" y2="200" stroke="currentColor" stroke-width="1"/>
  <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" stroke-width="1"/>
  <line x1="150" y1="0" x2="150" y2="200" stroke="currentColor" stroke-width="1"/>
</svg>`,

  cross: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M35 0H65V35H100V65H65V100H35V65H0V35H35V0Z" fill="currentColor"/>
</svg>`,

  plus: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="40" y="10" width="20" height="80" rx="5" fill="currentColor"/>
  <rect x="10" y="40" width="80" height="20" rx="5" fill="currentColor"/>
</svg>`,

  star4: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0L60 40L100 50L60 60L50 100L40 60L0 50L40 40L50 0Z" fill="currentColor"/>
</svg>`,

  star6: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0L58 35L93 20L65 50L93 80L58 65L50 100L42 65L7 80L35 50L7 20L42 35L50 0Z" fill="currentColor"/>
</svg>`,

  star8: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0L56 33L85 15L67 44L100 50L67 56L85 85L56 67L50 100L44 67L15 85L33 56L0 50L33 44L15 15L44 33L50 0Z" fill="currentColor"/>
</svg>`,

  sparkle: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0C50 30 70 50 100 50C70 50 50 70 50 100C50 70 30 50 0 50C30 50 50 30 50 0Z" fill="currentColor"/>
</svg>`,

  burst: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0L55 25L75 10L60 30L90 25L65 40L100 50L65 60L90 75L60 70L75 90L55 75L50 100L45 75L25 90L40 70L10 75L35 60L0 50L35 40L10 25L40 30L25 10L45 25L50 0Z" fill="currentColor"/>
</svg>`,

  ring: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="10" fill="none"/>
</svg>`,

  // ============================================================
  // ABSTRACT (10)
  // ============================================================

  layeredWave: `<svg viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 100L1440 50V200H0V100Z" fill="currentColor" opacity="0.3"/>
  <path d="M0 120L1440 80V200H0V120Z" fill="currentColor" opacity="0.5"/>
  <path d="M0 150L1440 120V200H0V150Z" fill="currentColor"/>
</svg>`,

  layeredCurve: `<svg viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 80Q720 0 1440 80V200H0V80Z" fill="currentColor" opacity="0.3"/>
  <path d="M0 120Q720 40 1440 120V200H0V120Z" fill="currentColor" opacity="0.5"/>
  <path d="M0 160Q720 80 1440 160V200H0V160Z" fill="currentColor"/>
</svg>`,

  mesh: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0L100 50L200 0L150 100L200 200L100 150L0 200L50 100L0 0Z" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="100" cy="100" r="30" fill="currentColor" opacity="0.3"/>
</svg>`,

  gradient: `<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:currentColor;stop-opacity:0"/>
      <stop offset="50%" style="stop-color:currentColor;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:currentColor;stop-opacity:0"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="120" fill="url(#grad)"/>
</svg>`,

  noise: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#noise)" opacity="0.5"/>
</svg>`,

  circuit: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 100H60M80 100H120M140 100H200" stroke="currentColor" stroke-width="2"/>
  <path d="M100 0V60M100 80V120M100 140V200" stroke="currentColor" stroke-width="2"/>
  <circle cx="70" cy="100" r="10" fill="currentColor"/>
  <circle cx="130" cy="100" r="10" fill="currentColor"/>
  <circle cx="100" cy="70" r="10" fill="currentColor"/>
  <circle cx="100" cy="130" r="10" fill="currentColor"/>
  <rect x="90" y="90" width="20" height="20" fill="currentColor"/>
</svg>`,

  dna: `<svg viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 0Q80 50 20 100Q80 150 20 200" stroke="currentColor" stroke-width="3" fill="none"/>
  <path d="M80 0Q20 50 80 100Q20 150 80 200" stroke="currentColor" stroke-width="3" fill="none"/>
  <line x1="30" y1="25" x2="70" y2="25" stroke="currentColor" stroke-width="2"/>
  <line x1="25" y1="50" x2="75" y2="50" stroke="currentColor" stroke-width="2"/>
  <line x1="30" y1="75" x2="70" y2="75" stroke="currentColor" stroke-width="2"/>
  <line x1="30" y1="125" x2="70" y2="125" stroke="currentColor" stroke-width="2"/>
  <line x1="25" y1="150" x2="75" y2="150" stroke="currentColor" stroke-width="2"/>
  <line x1="30" y1="175" x2="70" y2="175" stroke="currentColor" stroke-width="2"/>
</svg>`,

  infinity: `<svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 50C50 25 25 25 25 50C25 75 50 75 50 50C50 25 75 25 100 50C125 75 150 75 150 50C150 25 125 25 100 50C75 75 50 75 50 50Z" stroke="currentColor" stroke-width="8" fill="none"/>
</svg>`,

  spiral: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 100C100 90 90 80 80 80C60 80 50 100 50 120C50 150 80 170 110 170C150 170 180 140 180 100C180 50 130 20 80 20C20 20 -10 80 -10 140" stroke="currentColor" stroke-width="3" fill="none"/>
</svg>`,

  vortex: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="100" cy="100" r="60" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="100" cy="100" r="40" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="100" cy="100" r="20" stroke="currentColor" stroke-width="2" fill="none"/>
  <path d="M100 20L100 180M20 100L180 100M35 35L165 165M165 35L35 165" stroke="currentColor" stroke-width="1" opacity="0.5"/>
</svg>`,

  // ============================================================
  // MASKS (5)
  // ============================================================

  maskCircle: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="circleMask">
      <rect width="200" height="200" fill="white"/>
      <circle cx="100" cy="100" r="60" fill="black"/>
    </mask>
  </defs>
  <rect width="200" height="200" fill="currentColor" mask="url(#circleMask)"/>
</svg>`,

  maskDiamond: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="diamondMask">
      <rect width="200" height="200" fill="white"/>
      <path d="M100 30L170 100L100 170L30 100Z" fill="black"/>
    </mask>
  </defs>
  <rect width="200" height="200" fill="currentColor" mask="url(#diamondMask)"/>
</svg>`,

  maskStar: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="starMask">
      <rect width="200" height="200" fill="white"/>
      <path d="M100 20L115 70L170 70L125 100L140 150L100 120L60 150L75 100L30 70L85 70Z" fill="black"/>
    </mask>
  </defs>
  <rect width="200" height="200" fill="currentColor" mask="url(#starMask)"/>
</svg>`,

  cornerCut: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H160L200 40V200H0V0Z" fill="currentColor"/>
</svg>`,

  cornerRound: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H140Q200 0 200 60V200H0V0Z" fill="currentColor"/>
</svg>`,

  // ============================================================
  // FRAMES (5)
  // ============================================================

  frameSimple: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="180" height="180" stroke="currentColor" stroke-width="4" fill="none"/>
  <rect x="20" y="20" width="160" height="160" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>`,

  frameCorner: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 30V0H30" stroke="currentColor" stroke-width="4" fill="none"/>
  <path d="M170 0H200V30" stroke="currentColor" stroke-width="4" fill="none"/>
  <path d="M200 170V200H170" stroke="currentColor" stroke-width="4" fill="none"/>
  <path d="M30 200H0V170" stroke="currentColor" stroke-width="4" fill="none"/>
</svg>`,

  frameOrnate: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="180" height="180" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="10" cy="10" r="5" fill="currentColor"/>
  <circle cx="190" cy="10" r="5" fill="currentColor"/>
  <circle cx="10" cy="190" r="5" fill="currentColor"/>
  <circle cx="190" cy="190" r="5" fill="currentColor"/>
  <circle cx="100" cy="10" r="3" fill="currentColor"/>
  <circle cx="100" cy="190" r="3" fill="currentColor"/>
  <circle cx="10" cy="100" r="3" fill="currentColor"/>
  <circle cx="190" cy="100" r="3" fill="currentColor"/>
</svg>`,

  frameArt: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0H150L200 50V150L150 200H50L0 150V50L50 0Z" stroke="currentColor" stroke-width="3" fill="none"/>
</svg>`,

  frameWavy: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 20Q25 0 50 20T100 20T150 20T200 20V180Q175 200 150 180T100 180T50 180T0 180V20Z" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>`,
} as const;

export type SvgLibraryShapeName = keyof typeof SVG_LIBRARY_SHAPES;

export const SVG_LIBRARY_SHAPE_CATEGORIES = {
  waves: ["wave1", "wave2", "wave3", "waveDouble", "waveSoft", "waveSharp", "waveAsym", "waveMultiple", "waveThin", "waveThick"],
  triangles: ["triangleUp", "triangleDown", "triangleLeft", "triangleRight", "angleUp", "angleDown", "angleAsym", "zigzag", "zigzagSmall", "arrow"],
  curves: ["curveUp", "curveDown", "curveAsym", "arcUp", "arcDown", "semicircle", "scallop", "scallopInverse", "bump", "dip"],
  geometric: ["slantLeft", "slantRight", "slantDouble", "steps", "stepsReverse", "stepsCenter", "hexagon", "diamond", "parallelogram", "trapezoid"],
  blobs: ["blob1", "blob2", "blob3", "blob4", "blob5", "blobFlat", "cloud", "cloudWave", "splatter", "ink"],
  decorative: ["dots", "grid", "cross", "plus", "star4", "star6", "star8", "sparkle", "burst", "ring"],
  abstract: ["layeredWave", "layeredCurve", "mesh", "gradient", "noise", "circuit", "dna", "infinity", "spiral", "vortex"],
  masks: ["maskCircle", "maskDiamond", "maskStar", "cornerCut", "cornerRound"],
  frames: ["frameSimple", "frameCorner", "frameOrnate", "frameArt", "frameWavy"],
} as const satisfies Record<string, readonly SvgLibraryShapeName[]>;

export const SVG_LIBRARY_SHAPE_LABELS_AR: Record<SvgLibraryShapeName, string> = {
  wave1: "موجة 1",
  wave2: "موجة 2",
  wave3: "موجة 3",
  waveDouble: "موجة مزدوجة",
  waveSoft: "موجة ناعمة",
  waveSharp: "موجة حادة",
  waveAsym: "موجة غير متماثلة",
  waveMultiple: "موجات متعددة",
  waveThin: "موجة رفيعة",
  waveThick: "موجة سميكة",

  triangleUp: "مثلث للأعلى",
  triangleDown: "مثلث للأسفل",
  triangleLeft: "مثلث لليسار",
  triangleRight: "مثلث لليمين",
  angleUp: "زاوية للأعلى",
  angleDown: "زاوية للأسفل",
  angleAsym: "زاوية غير متماثلة",
  zigzag: "متعرج",
  zigzagSmall: "متعرج صغير",
  arrow: "سهم",

  curveUp: "منحنى للأعلى",
  curveDown: "منحنى للأسفل",
  curveAsym: "منحنى غير متماثل",
  arcUp: "قوس للأعلى",
  arcDown: "قوس للأسفل",
  semicircle: "نصف دائرة",
  scallop: "صدفي",
  scallopInverse: "صدفي معكوس",
  bump: "نتوء",
  dip: "انخفاض",

  slantLeft: "مائل لليسار",
  slantRight: "مائل لليمين",
  slantDouble: "مائل مزدوج",
  steps: "درجات",
  stepsReverse: "درجات معكوسة",
  stepsCenter: "درجات مركزية",
  hexagon: "سداسي",
  diamond: "ماسة",
  parallelogram: "متوازي أضلاع",
  trapezoid: "شبه منحرف",

  blob1: "بلوب 1",
  blob2: "بلوب 2",
  blob3: "بلوب 3",
  blob4: "بلوب 4",
  blob5: "بلوب 5",
  blobFlat: "بلوب مسطح",
  cloud: "سحابة",
  cloudWave: "سحابة متموجة",
  splatter: "بقعة",
  ink: "حبر",

  dots: "نقاط",
  grid: "شبكة",
  cross: "صليب",
  plus: "زائد",
  star4: "نجمة 4",
  star6: "نجمة 6",
  star8: "نجمة 8",
  sparkle: "تألق",
  burst: "انفجار",
  ring: "حلقة",

  layeredWave: "موجة متعددة الطبقات",
  layeredCurve: "منحنى متعدد الطبقات",
  mesh: "شبكة",
  gradient: "تدرج",
  noise: "تشويش",
  circuit: "دائرة كهربائية",
  dna: "حمض نووي",
  infinity: "لانهاية",
  spiral: "حلزوني",
  vortex: "دوامة",

  maskCircle: "قناع دائري",
  maskDiamond: "قناع ماسي",
  maskStar: "قناع نجمي",
  cornerCut: "زاوية مقطوعة",
  cornerRound: "زاوية مستديرة",

  frameSimple: "إطار بسيط",
  frameCorner: "إطار زوايا",
  frameOrnate: "إطار مزخرف",
  frameArt: "إطار فني",
  frameWavy: "إطار متموج",
};
