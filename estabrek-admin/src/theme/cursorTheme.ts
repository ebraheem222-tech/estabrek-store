import {
  ALL_CUSTOM_CURSORS,
  ALL_NATIVE_CURSORS,
  getCursorThemeById,
  type CustomCursor,
} from "../cms/style/cursorStyles";

const CURSOR_THEME_ATTR = "data-cursor-theme";
const CURSOR_THEME_STYLE_ID = "estabrek-cursor-theme";

function customCursorValue(cursor: CustomCursor): string {
  const encodedSvg = encodeURIComponent(cursor.svg);
  return `url("data:image/svg+xml,${encodedSvg}") ${cursor.hotspot.x} ${cursor.hotspot.y}, auto`;
}

function resolveCursorValue(ref: string | undefined | null): string | null {
  if (!ref || typeof ref !== "string") return null;
  const value = ref.trim();
  if (!value) return null;

  const native = ALL_NATIVE_CURSORS.find((c) => c.cursor === value);
  if (native) return value.replace(/^cursor-/, "");

  const custom = ALL_CUSTOM_CURSORS.find((c) => c.cssClass === value);
  if (custom) return customCursorValue(custom);

  return null;
}

function buildCursorThemeCss(themeId: string) {
  const theme = getCursorThemeById(themeId);
  if (!theme) return "";

  const defaults = {
    default: "auto",
    pointer: "pointer",
    text: "text",
    grab: "grab",
    grabbing: "grabbing",
    notAllowed: "not-allowed",
  };

  const cursorDefault = resolveCursorValue(theme.cursors.default) ?? defaults.default;
  const cursorPointer = resolveCursorValue(theme.cursors.pointer) ?? defaults.pointer;
  const cursorText = resolveCursorValue(theme.cursors.text) ?? defaults.text;
  const cursorGrab = resolveCursorValue(theme.cursors.grab) ?? defaults.grab;
  const cursorGrabbing = resolveCursorValue(theme.cursors.grabbing) ?? defaults.grabbing;
  const cursorNotAllowed = resolveCursorValue(theme.cursors.notAllowed) ?? defaults.notAllowed;

  const scope = `html[${CURSOR_THEME_ATTR}="${themeId}"]`;

  const pointerSelectors = [
    `${scope} a[href]`,
    `${scope} button`,
    `${scope} summary`,
    `${scope} [role="button"]`,
    `${scope} [role="link"]`,
    `${scope} input[type="button"]`,
    `${scope} input[type="submit"]`,
    `${scope} input[type="reset"]`,
    `${scope} label[for]`,
  ].join(",\n");

  const textSelectors = [
    `${scope} input:not([type])`,
    `${scope} input[type="text"]`,
    `${scope} input[type="email"]`,
    `${scope} input[type="search"]`,
    `${scope} input[type="url"]`,
    `${scope} input[type="tel"]`,
    `${scope} input[type="password"]`,
    `${scope} input[type="number"]`,
    `${scope} textarea`,
    `${scope} [contenteditable="true"]`,
  ].join(",\n");

  const notAllowedSelectors = [
    `${scope} :disabled`,
    `${scope} [aria-disabled="true"]`,
  ].join(",\n");

  const classOverrides = [
    `${scope} .cursor-default { cursor: ${cursorDefault}; }`,
    `${scope} .cursor-pointer { cursor: ${cursorPointer}; }`,
    `${scope} .cursor-text { cursor: ${cursorText}; }`,
    `${scope} .cursor-grab { cursor: ${cursorGrab}; }`,
    `${scope} .cursor-grabbing { cursor: ${cursorGrabbing}; }`,
    `${scope} .cursor-not-allowed { cursor: ${cursorNotAllowed}; }`,
  ].join("\n");

  return [
    `${scope} { cursor: ${cursorDefault}; }`,
    `${pointerSelectors} { cursor: ${cursorPointer}; }`,
    `${textSelectors} { cursor: ${cursorText}; }`,
    `${scope} [draggable="true"] { cursor: ${cursorGrab}; }`,
    `${notAllowedSelectors} { cursor: ${cursorNotAllowed}; }`,
    classOverrides,
  ].join("\n\n");
}

function removeCursorTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.removeAttribute(CURSOR_THEME_ATTR);
  const style = document.getElementById(CURSOR_THEME_STYLE_ID);
  style?.remove();
}

export function applyCursorTheme(themeId?: string | null) {
  if (typeof document === "undefined") return;

  const id = typeof themeId === "string" ? themeId : "default";
  if (!id || id === "default") {
    removeCursorTheme();
    return;
  }

  const theme = getCursorThemeById(id);
  if (!theme) {
    removeCursorTheme();
    return;
  }

  const root = document.documentElement;
  root.setAttribute(CURSOR_THEME_ATTR, id);

  const css = buildCursorThemeCss(id);
  if (!css) {
    removeCursorTheme();
    return;
  }

  let style = document.getElementById(CURSOR_THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = CURSOR_THEME_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

