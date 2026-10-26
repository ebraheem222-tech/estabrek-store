// src/lib/eyeDropper.ts
// ColorZilla-like picker using the native EyeDropper API (Chrome/Edge).

export type EyeDropperResult = { sRGBHex: string };

export function isEyeDropperSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as any).EyeDropper !== "undefined";
}

export async function pickScreenColor(): Promise<string | null> {
  if (!isEyeDropperSupported()) return null;
  try {
    const ED = (window as any).EyeDropper as new () => { open: () => Promise<EyeDropperResult> };
    const ed = new ED();
    const res = await ed.open();
    return res?.sRGBHex ?? null;
  } catch {
    // user canceled
    return null;
  }
}
