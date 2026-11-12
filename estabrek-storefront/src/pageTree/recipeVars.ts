/**
 * The recipes' variables (pieces.ts StepSpec "set", ConditionSpec "var"): kept for the visit, on every page
 * (sessionStorage, this tab), at most 40 of them. A text shows one with {{name}}, or {{name|what to show before
 * it is set}}: TreeNodeView draws each as a <span data-pt-var>, filled and kept up to date here. Messages and
 * copied words fill them in too.
 */
import { createElement, Fragment, type ReactNode } from "react";
import type { VarValue } from "./pieces";

const KEY = "pt_vars_v1";
const MAX = 40;
/** Sent on window with { name } after a variable changes (wait-until steps listen). */
export const VARS_EVENT = "pt:vars";
/** {{name}} or {{name|default}} in a text. */
export const VAR_TOKEN = /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*(?:\|([^{}]{0,40}))?\}\}/g;

let memory: Record<string, VarValue> | null = null;

function all(): Record<string, VarValue> {
  if (memory) return memory;
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || "{}");
    memory = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, VarValue>) : {};
  } catch {
    memory = {};
  }
  return memory;
}

export function getVar(name: string): VarValue | undefined {
  return all()[name];
}

export function setVar(name: string, value: VarValue | undefined) {
  const vars = all();
  if (value === undefined) delete vars[name];
  else {
    if (!(name in vars) && Object.keys(vars).length >= MAX) return;
    vars[name] = typeof value === "string" ? value.slice(0, 80) : value;
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(vars));
  } catch {
    /* storage blocked: the variable lasts this page */
  }
  showVars(document, name);
  window.dispatchEvent(new CustomEvent(VARS_EVENT, { detail: { name } }));
}

/** A step that changes a variable: to a value, by adding, or flipping yes/no. */
export function changeVar(name: string, op: "set" | "add" | "toggle", value?: VarValue) {
  const now = getVar(name);
  if (op === "add") setVar(name, Math.round(((Number(now) || 0) + (Number(value) || 0)) * 1000) / 1000);
  else if (op === "toggle") setVar(name, !truthy(now));
  else setVar(name, value);
}

const truthy = (v: VarValue | undefined) => v !== undefined && v !== false && v !== 0 && v !== "" && v !== "false" && v !== "0";
const asNumber = (v: VarValue | undefined) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : typeof v === "boolean" ? Number(v) : NaN);

/** Whether a variable's value holds against `value` (numbers as numbers, else as words; yes/no as words too). */
export function compareVar(now: VarValue | undefined, cmp: string, value?: VarValue): boolean {
  if (cmp === "set") return now !== undefined;
  if (cmp === "unset") return now === undefined;
  if (now === undefined) return cmp === "ne" ? value !== undefined : false;
  if (cmp === "eq" || cmp === "ne") {
    const a = asNumber(now), b = asNumber(value);
    const same = Number.isFinite(a) && Number.isFinite(b) && typeof now !== "boolean" && typeof value !== "boolean" ? a === b : String(now) === String(value ?? "");
    return cmp === "eq" ? same : !same;
  }
  const a = asNumber(now), b = asNumber(value);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return cmp === "gt" ? a > b : cmp === "lt" ? a < b : cmp === "gte" ? a >= b : cmp === "lte" ? a <= b : false;
}

/** A text with its {{name}} filled in. */
export function fillVars(text: string): string {
  return text.replace(VAR_TOKEN, (_, name: string, fallback?: string) => {
    const v = getVar(name);
    return v === undefined ? fallback ?? "" : String(v);
  });
}

/** Every text showing a variable (or only `only`) shows its value now. */
export function showVars(root: ParentNode = document, only?: string) {
  root.querySelectorAll<HTMLElement>("[data-pt-var]").forEach((el) => {
    const name = el.dataset.ptVar!;
    if (only && name !== only) return;
    const v = getVar(name);
    const text = v === undefined ? el.dataset.ptVarDefault ?? "" : String(v);
    if (el.textContent !== text) el.textContent = text;
  });
}

/** For tests: forget the variables. */
export function resetVarsForTests() {
  memory = null;
}

/** A text with its {{name}} marks as places the variables show (the page draws them before any is set). */
export function varNodes(text: string): ReactNode {
  if (!text.includes("{{")) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(VAR_TOKEN)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    const fallback = (m[2] ?? "").trim();
    parts.push(createElement("span", { key: `v${m.index}`, "data-pt-var": m[1], ...(fallback ? { "data-pt-var-default": fallback } : {}) }, fallback));
    last = m.index! + m[0].length;
  }
  if (!parts.length) return text;
  if (last < text.length) parts.push(text.slice(last));
  return createElement(Fragment, null, ...parts);
}
