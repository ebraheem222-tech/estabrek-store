// ============================================================
// ESTABREK SVG LIBRARY (PATTERNS)
// ============================================================

export const SVG_LIBRARY_PATTERNS = {
  stripes: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="stripes" patternUnits="userSpaceOnUse" width="40" height="40">
      <path d="M0 40L40 0H20L0 20zM40 40V20L20 40z" fill="currentColor" opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#stripes)"/>
</svg>`,

  dots: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
      <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#dots)"/>
</svg>`,

  grid: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" patternUnits="userSpaceOnUse" width="40" height="40">
      <path d="M0 0H40V40" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
</svg>`,

  zigzag: `<svg width="40" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="zigzag" patternUnits="userSpaceOnUse" width="40" height="20">
      <path d="M0 10L10 0L20 10L30 0L40 10" fill="none" stroke="currentColor" stroke-opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#zigzag)"/>
</svg>`,

  waves: `<svg width="100" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="waves" patternUnits="userSpaceOnUse" width="100" height="20">
      <path d="M0 10Q25 0 50 10T100 10" fill="none" stroke="currentColor" stroke-opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#waves)"/>
</svg>`,

  hexagons: `<svg width="56" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="hexagons" patternUnits="userSpaceOnUse" width="56" height="100">
      <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
      <path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#hexagons)"/>
</svg>`,

  triangles: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="triangles" patternUnits="userSpaceOnUse" width="40" height="40">
      <path d="M0 40L20 0L40 40Z" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#triangles)"/>
</svg>`,

  circles: `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="circles" patternUnits="userSpaceOnUse" width="40" height="40">
      <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#circles)"/>
</svg>`,

  crosses: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="crosses" patternUnits="userSpaceOnUse" width="20" height="20">
      <path d="M10 5V15M5 10H15" stroke="currentColor" stroke-opacity="0.1" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#crosses)"/>
</svg>`,

  diagonals: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="diagonals" patternUnits="userSpaceOnUse" width="20" height="20">
      <path d="M0 0L20 20M20 0L0 20" stroke="currentColor" stroke-opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#diagonals)"/>
</svg>`,
} as const;

export type SvgLibraryPatternName = keyof typeof SVG_LIBRARY_PATTERNS;

export const SVG_LIBRARY_PATTERN_CATEGORIES = {
  patterns: ["stripes", "dots", "grid", "zigzag", "waves", "hexagons", "triangles", "circles", "crosses", "diagonals"],
} as const satisfies Record<string, readonly SvgLibraryPatternName[]>;
