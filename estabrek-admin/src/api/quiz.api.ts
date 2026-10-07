// «سؤال وجواب»: the questions quiz with a coupon prize (settings, numbers, questions, winners).
import { api } from "./http";

export type QuizSettings = {
  enabled: boolean;
  mode: "counter" | "chance";
  base: number;
  resetDays: number;
  maxPerPeriod: number;
  percent: number;
  hours: number;
  questions: number;
  startChance: number;
};
export type QuizStats = { period: string; startsAt: string; endsAt: string; visitors: number; chances: number; plays: number; passes: number; wins: number; nextChanceAt: number | null };
export type QuizQuestion = { id: string; text: string; choices: string[]; answer: number; level: number; topic: string; approved: boolean; active: boolean; createdAt: string; updatedAt: string };
export type QuizWinner = { id: string; period: string; phone: string; name: string | null; createdAt: string; code: string; percent: number; used: boolean; endsAt: string | null };
export type QuestionInput = Pick<QuizQuestion, "text" | "choices" | "answer" | "level" | "topic"> & Partial<Pick<QuizQuestion, "approved" | "active">>;

export async function getQuiz() {
  return (await api.get("/admin/quiz")).data as { settings: QuizSettings; defaults: QuizSettings; stats: QuizStats; positions: number[]; approved: number };
}
export async function saveQuiz(s: QuizSettings) {
  return (await api.put("/admin/quiz", s)).data as { settings: QuizSettings };
}
export async function listQuestions() {
  return (await api.get("/admin/quiz/questions")).data as { questions: QuizQuestion[] };
}
export async function createQuestion(q: QuestionInput) {
  return (await api.post("/admin/quiz/questions", q)).data as QuizQuestion;
}
export async function updateQuestion(id: string, patch: Partial<QuestionInput>) {
  return (await api.patch(`/admin/quiz/questions/${encodeURIComponent(id)}`, patch)).data as QuizQuestion;
}
export async function deleteQuestion(id: string) {
  return (await api.delete(`/admin/quiz/questions/${encodeURIComponent(id)}`)).data as { ok: true };
}
export async function listWinners() {
  return (await api.get("/admin/quiz/winners")).data as { winners: QuizWinner[] };
}
