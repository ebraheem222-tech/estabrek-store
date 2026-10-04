export type RosePaletteId = "pearl" | "blush" | "rose" | "lilac" | "berry";
export type RosePresentationOptions = {
  palette?: RosePaletteId;
  motionIntensity?: "subtle" | "cinematic";
};

export const rosePalettes: Record<RosePaletteId, string> = {
  pearl: "#fff8f4", blush: "#f7dce8", rose: "#e8adc5",
  lilac: "#e4d8f0", berry: "#6b2446",
};
export function isRosePalette(value: unknown): value is RosePaletteId {
  return typeof value === "string" && value in rosePalettes;
}
export function sectionPalette(type: string, options?: RosePresentationOptions): RosePaletteId {
  if (isRosePalette(options?.palette)) return options.palette;
  if (type === "HERO") return "blush";
  if (type === "VIDEO" || type === "CTA") return "berry";
  if (type.includes("COLLECTION") || type === "RICH_TEXT") return "lilac";
  if (type === "CONTACT" || type === "FAQ") return "blush";
  return "pearl";
}
export function mixHex(from: string, to: string, t: number): string {
  const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const a = channels(from), b = channels(to);
  return `#${a.map((n, i) => Math.round(n + (b[i] - n) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, "0")).join("")}`;
}
export function openingPalette(p: number): string {
  const stops: [number, RosePaletteId][] = [[0, "blush"], [0.28, "rose"], [0.58, "lilac"], [0.82, "pearl"], [1, "pearl"]];
  const i = Math.max(1, stops.findIndex(([stop]) => stop >= p));
  const [start, a] = stops[i - 1], [end, b] = stops[i];
  return mixHex(rosePalettes[a], rosePalettes[b], (p - start) / (end - start));
}
