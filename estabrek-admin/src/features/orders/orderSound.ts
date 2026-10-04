// Sound preference and the new-order chime.
const SOUND_KEY = "estabrek_admin_order_sound";

export function soundEnabled() {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
}
export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* storage blocked */ }
}

/** A soft two-note chime, made in the browser (no sound file). */
export function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [[880, 0], [1320, 0.16]].forEach(([freq, at]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.45);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.5);
    });
    window.setTimeout(() => void ctx.close(), 1200);
  } catch { /* audio not allowed yet */ }
}

