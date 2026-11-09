/** Ready design variable sets for the Variables panel (pure: the API's tests read them too). */
import type { DesignTokens } from "../../../estabrek-storefront/src/pageTree/designTokens";

/** A set to start from: a brand colour and its friends, two fonts, a spacing scale, corners and shadows. */
export function starterTokens(fonts: string[]): DesignTokens {
  const n = (ar: string, en: string, he: string) => ({ ar, en, he });
  return {
    version: 1,
    colors: [
      { id: "brand", name: n("لون المتجر", "Brand", "מותג"), value: "#c86b98" },
      { id: "brand-dark", name: n("لون المتجر الغامق", "Brand dark", "מותג כהה"), value: "#8e3f68" },
      { id: "ink", name: n("الحبر", "Ink", "דיו"), value: "#1d1a1f" },
      { id: "paper", name: n("الورق", "Paper", "נייר"), value: "#fbf7f4" },
      { id: "sale", name: n("الخصم", "Sale", "מבצע"), value: "#d23c4b" },
    ],
    fonts: fonts.slice(0, 2).map((family, i) => ({ id: i ? "body" : "display", name: i ? n("خط النص", "Body", "גוף") : n("خط العناوين", "Display", "כותרות"), family })),
    spaces: [["xs", 4], ["sm", 8], ["md", 16], ["lg", 32], ["xl", 64]].map(([id, value]) => ({ id: id as string, value: value as number })),
    radii: [["sm", 6], ["md", 12], ["lg", 24], ["pill", 999]].map(([id, value]) => ({ id: id as string, value: value as number })),
    shadows: [
      { id: "soft", name: n("ظل خفيف", "Soft", "רך"), x: 0, y: 8, blur: 24, spread: -8, color: "#00000033" },
      { id: "lift", name: n("ظل مرفوع", "Lifted", "מורם"), x: 0, y: 20, blur: 44, spread: -12, color: "#00000055" },
    ],
  };
}

