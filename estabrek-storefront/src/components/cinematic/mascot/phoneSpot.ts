/**
 * Where Rose stands in the pinned scenes (seasons, collection worlds) on phones.
 *
 * On a computer she has the whole side of the scene. On a phone the copy and
 * the product rack fill most of the screen, and a fixed spot put her on top of
 * the first product card. Here she is measured into the free corner instead:
 * feet just above the rack, as tall as the space allows, and narrow enough to
 * stay clear of the title, text and button beside her.
 */
const ASPECT = 300 / 420; // the character's width / height
const MAX_H = 170;
const MIN_H = 84;
const HEADER = 78; // the fixed header over the top of the scene

/** Rectangles of the actual text lines (a block can be wider than its words). */
function textRects(el: Element | null): DOMRect[] {
  if (!el) return [];
  const range = document.createRange();
  range.selectNodeContents(el);
  return Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
}

export function placeMascotOnPhone(section: HTMLElement | null) {
  if (!section) return;
  const mascot = section.querySelector<HTMLElement>(".season-mascot, .story-mascot");
  if (!mascot) return;
  if (!window.matchMedia("(max-width: 899px)").matches) {
    mascot.style.removeProperty("--mascot-bottom");
    mascot.style.removeProperty("--mascot-h");
    return;
  }
  const sticky = section.querySelector<HTMLElement>(".rose-seasons-sticky, .stories-sticky");
  const layers = Array.from(section.querySelectorAll<HTMLElement>(".season-layer, .story-layer"));
  const layer = layers.find((l) => !l.inert) ?? layers[0];
  if (!sticky || !layer) return;
  const box = sticky.getBoundingClientRect();
  const rack = layer.querySelector(".season-rack")?.getBoundingClientRect();
  const button = layer.querySelector(".atelier-button")?.getBoundingClientRect();
  const floor = rack?.top ?? button?.bottom ?? box.bottom - 120;
  const feet = floor - 6;
  const rtl = getComputedStyle(sticky).direction === "rtl";
  const obstacles = [
    ...textRects(layer.querySelector(".season-copy h2")),
    ...textRects(layer.querySelector(".season-copy p")),
    ...textRects(layer.querySelector(".season-copy .atelier-eyebrow")),
    ...(button ? [button] : []),
  ];
  let h = Math.min(MAX_H, feet - (box.top + HEADER));
  for (let i = 0; i < 4; i++) {
    const top = feet - h;
    // Free width on Rose's side, at the height she would take.
    let free = box.width;
    for (const r of obstacles) {
      if (r.bottom < top || r.top > feet) continue;
      free = Math.min(free, rtl ? r.left - box.left : box.right - r.right);
    }
    const fit = (free - 22) / ASPECT;
    if (fit >= h) break;
    h = fit;
  }
  h = Math.max(MIN_H, Math.min(MAX_H, h));
  mascot.style.setProperty("--mascot-bottom", `${Math.round(box.bottom - feet)}px`);
  mascot.style.setProperty("--mascot-h", `${Math.round(h)}px`);
}

/** Keep her in the free corner as the screen turns or resizes. */
export function watchMascotSpot(section: HTMLElement | null) {
  if (!section) return () => {};
  let frame = 0;
  const place = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => placeMascotOnPhone(section));
  };
  place();
  // Fonts and product photos settle a moment later and can move the rack.
  const late = window.setTimeout(place, 700);
  window.addEventListener("resize", place);
  document.fonts?.ready.then(place).catch(() => {});
  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(late);
    window.removeEventListener("resize", place);
  };
}

/**
 * The hero on phones: the campaign photo fills the screen and her old spot was
 * on the model's face. She now stands in the soft lower corner of the photo,
 * feet just above the buttons, below the title and text.
 */
export function placeHeroMascotOnPhone() {
  const mascot = document.querySelector<HTMLElement>(".hero-mascot");
  if (!mascot) return;
  if (mascot.closest(".rose-film")) return placeFilmMascotOnPhone(mascot);
  const hero = mascot.closest<HTMLElement>(".atelier-hero");
  if (!hero) return;
  if (!window.matchMedia("(max-width: 899px)").matches) {
    ["--mascot-bottom", "--mascot-h", "--mascot-side"].forEach((v) => mascot.style.removeProperty(v));
    return;
  }
  const frame = (mascot.offsetParent as HTMLElement | null) ?? hero;
  const actions = hero.querySelector(".hero-actions")?.getBoundingClientRect();
  if (!actions || !actions.height) return;
  const box = frame.getBoundingClientRect();
  const rtl = getComputedStyle(hero).direction === "rtl";
  const feet = actions.top - 10;
  const words = [
    ...textRects(hero.querySelector(".hero-headline")),
    ...textRects(hero.querySelector(".hero-description")),
  ];
  // Room under the text (plus space for her speech bubble above her head).
  const textBottom = Math.max(0, ...words.map((r) => r.bottom));
  let h = Math.min(150, feet - (textBottom + 40));
  if (h < 96) h = Math.min(150, Math.max(96, feet - (textBottom + 4)));
  const side = 14; // px from the screen edge
  const edge = rtl ? box.left : window.innerWidth - box.right; // frame offset from that edge
  mascot.style.setProperty("--mascot-bottom", `${Math.round(box.bottom - feet)}px`);
  mascot.style.setProperty("--mascot-h", `${Math.round(h)}px`);
  mascot.style.setProperty("--mascot-side", `${Math.round(side - edge)}px`);
}

/**
 * The opening film on phones: the scarf fills the top of the screen, so Rose
 * steps down beside the words — feet on the buttons' line, in the free corner
 * next to the short description, never over the scarf.
 */
function placeFilmMascotOnPhone(mascot: HTMLElement) {
  const film = mascot.closest<HTMLElement>(".rose-film")!;
  const clear = () => ["--mascot-bottom", "--mascot-h", "--mascot-side"].forEach((v) => mascot.style.removeProperty(v));
  if (!window.matchMedia("(max-width: 760px)").matches) return clear();
  const frame = (mascot.offsetParent as HTMLElement | null) ?? film;
  const actions = film.querySelector(".hero-actions");
  const row = actions?.getBoundingClientRect();
  if (!actions || !row || !row.height) return;
  const box = frame.getBoundingClientRect();
  const rtl = getComputedStyle(film).direction === "rtl";
  const feet = row.bottom - 2;
  const top = Math.max(0, ...textRects(film.querySelector(".hero-headline")).map((r) => r.bottom)) + 8;
  const obstacles = [
    ...textRects(film.querySelector(".hero-description")),
    ...Array.from(actions.children).map((c) => c.getBoundingClientRect()),
  ];
  const side = 12;
  let h = Math.min(150, feet - top);
  for (let i = 0; i < 4; i++) {
    let free = window.innerWidth;
    for (const r of obstacles) {
      if (r.bottom < feet - h || r.top > feet) continue;
      free = Math.min(free, rtl ? r.left : window.innerWidth - r.right);
    }
    const fit = (free - side - 8) / ASPECT;
    if (fit >= h) break;
    h = fit;
  }
  h = Math.max(MIN_H, Math.min(150, h));
  const edge = rtl ? box.left : window.innerWidth - box.right;
  mascot.style.setProperty("--mascot-bottom", `${Math.round(box.bottom - feet)}px`);
  mascot.style.setProperty("--mascot-h", `${Math.round(h)}px`);
  mascot.style.setProperty("--mascot-side", `${Math.round(side - edge)}px`);
}

export function watchHeroMascotSpot() {
  let frame = 0;
  const place = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(placeHeroMascotOnPhone);
  };
  place();
  const late = window.setTimeout(place, 700);
  window.addEventListener("resize", place);
  document.fonts?.ready.then(place).catch(() => {});
  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(late);
    window.removeEventListener("resize", place);
  };
}
