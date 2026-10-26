/**
 * «سؤال وجواب» on this device: an anonymous id (so a visitor is counted once a
 * period) and the chance the shop gave this visit.
 */
import { apiBaseClient } from "./apiClient";

const DEVICE_KEY = "estabrek_device";
const CHANCE_KEY = "razan_quiz_chance";

export type QuizChance = { chance: boolean; percent?: number; hours?: number; questions?: number };

export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null; // private mode: no quiz
  }
}

/** Once a visit: is there a chance for this device? (kept for the visit; one request even if asked twice at once) */
let asking: Promise<QuizChance> | null = null;
export function quizVisit(): Promise<QuizChance> {
  asking ??= askVisit().finally(() => { asking = null; });
  return asking;
}

async function askVisit(): Promise<QuizChance> {
  try {
    const kept = sessionStorage.getItem(CHANCE_KEY);
    if (kept) return JSON.parse(kept);
  } catch { /* ignore */ }
  const device = deviceId();
  if (!device) return { chance: false };
  try {
    const res = await fetch(`${apiBaseClient()}/quiz/visit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device }) });
    const out = res.ok ? ((await res.json()) as QuizChance) : { chance: false };
    try { sessionStorage.setItem(CHANCE_KEY, JSON.stringify(out)); } catch { /* ignore */ }
    return out;
  } catch {
    return { chance: false };
  }
}

/** Her chance is spent (played): stop offering it this visit. */
export function quizSpent() {
  try { sessionStorage.setItem(CHANCE_KEY, JSON.stringify({ chance: false })); } catch { /* ignore */ }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBaseClient()}/quiz/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error || String(res.status)), { code: data?.error });
  return data as T;
}

export type QuizQuestion = { id: string; text: string; choices: string[]; level: number };
export const quizStart = () => post<{ token: string; percent: number; hours: number; questions: QuizQuestion[] }>("start", { device: deviceId() });
export const quizAnswer = (token: string, answers: number[]) => post<{ passed: boolean; correct: number; total: number; answers: number[] }>("answer", { token, answers });
export const quizClaim = (token: string, phone: string, name?: string) => post<{ code: string; percent: number; endsAt: string }>("claim", { token, phone, name });
