/**
 * After the opening film: the finished hijab (in the shopper's colour) flies
 * down into the first piece of the products row and lands with a little
 * sparkle. It happens once a visit, when that product comes into view, and
 * never with reduced motion or without the cut-out film.
 */
const SEEN_KEY = "estabrek_scarf_flown";
const HIJAB = /حجاب|شال|شيلة|طرح|لفّ?ة|hijab|scarf|shawl/i;
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12C6.6 11.1 11.1 6.6 12 0Z"/></svg>';

let flown = false;
function alreadyFlown() {
  if (flown) return true;
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markFlown() {
  flown = true;
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode: once per page load is still fine.
  }
}

/** The first products row after the film; a hijab among its first pieces if there is one. */
function findTarget(film: HTMLElement): HTMLElement | null {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".editorial-product")).filter(
    (c) => film.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  if (!cards.length) return null;
  const grid = cards[0].parentElement;
  const first = cards.filter((c) => c.parentElement === grid).slice(0, 4);
  return first.find((c) => HIJAB.test(c.querySelector(".product-info")?.textContent ?? "")) ?? cards[0];
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const DURATION = 1500;

function star(layer: HTMLElement, x: number, y: number, size: number, cls: string, delay: number) {
  const s = document.createElement("i");
  s.className = cls;
  s.innerHTML = STAR;
  s.style.cssText = `left:${x}px;top:${y}px;--s:${size}px;animation-delay:${Math.round(delay)}ms`;
  layer.appendChild(s);
}

/**
 * The flight is drawn in page coordinates (so it still lands on the card if she
 * keeps scrolling) and runs as one Web Animation on the graphics card.
 */
function fly(film: HTMLElement, card: HTMLElement, picture: HTMLCanvasElement) {
  const image = card.querySelector<HTMLElement>(".editorial-product-image") ?? card;
  const rtl = getComputedStyle(film).direction === "rtl";
  const vw = document.documentElement.clientWidth;
  const layer = document.createElement("div");
  layer.className = "scarf-flight-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.style.height = `${document.documentElement.scrollHeight}px`;
  document.body.appendChild(layer);
  const origin = layer.getBoundingClientRect();
  const scarf = document.createElement("div");
  scarf.className = "scarf-flight";
  picture.className = "scarf-flight-picture";
  scarf.appendChild(picture);
  layer.appendChild(scarf);

  const ratio = picture.height / picture.width;
  const w0 = Math.min(250, vw * 0.4);
  const h0 = w0 * ratio;
  scarf.style.width = `${w0}px`;
  const r = image.getBoundingClientRect();
  // Everything relative to the layer, which sits at the top of the page.
  const from = { x: (rtl ? vw * 0.27 : vw * 0.73) - origin.left, y: -origin.top - h0 * 0.32 };
  const to = { x: r.left + r.width / 2 - origin.left, y: r.top + r.height * 0.45 - origin.top };
  // A soft swoop past the card and back into it.
  const c = { x: to.x + (to.x - from.x) * 0.45, y: from.y + (to.y - from.y) * 0.3 };
  const end = Math.max(0.3, (r.width * 0.72) / w0);
  const at = (raw: number) => {
    const t = easeInOut(raw);
    return {
      x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * c.x + t * t * to.x,
      y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * c.y + t * t * to.y,
      s: 1 + (end - 1) * t,
      turn: (1 - t) * (-14 + Math.sin(raw * Math.PI * 3) * 7),
    };
  };
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 30; i++) {
    const raw = i / 30;
    const { x, y, s, turn } = at(raw);
    const landing = raw > 0.82 ? (raw - 0.82) / 0.18 : 0;
    frames.push({
      offset: raw,
      transform: `translate(${(x - w0 / 2).toFixed(1)}px, ${(y - h0 / 2).toFixed(1)}px) rotate(${turn.toFixed(2)}deg) scale(${(s * (1 - 0.15 * landing)).toFixed(3)})`,
      opacity: Math.min(1, raw / 0.1) * (1 - landing),
    });
  }
  // A thin trail of sparkles behind it, then a burst around the card as it lands.
  for (let k = 1; k <= 14; k++) {
    const raw = (k / 14) * 0.84;
    const { x, y, s } = at(raw);
    const jx = Math.sin(k * 2.3) * w0 * s * 0.22, jy = Math.cos(k * 1.7) * h0 * s * 0.18;
    star(layer, x + jx, y + jy, 6 + ((k * 5) % 7), "scarf-trail", raw * DURATION);
  }
  const burst: [number, number, number][] = [[0.12, 0.18, 15], [0.86, 0.12, 12], [0.92, 0.55, 17], [0.1, 0.62, 11], [0.5, 0.04, 13], [0.62, 0.9, 10], [0.3, 0.88, 14]];
  burst.forEach(([bx, by, size], i) =>
    star(layer, r.left - origin.left + r.width * bx, r.top - origin.top + r.height * by, size, "scarf-burst", DURATION * 0.86 + i * 60));
  const flight = scarf.animate(frames, { duration: DURATION, easing: "linear", fill: "forwards" });
  let done = 0;
  flight.finished
    .then(() => {
      // Landed: the card glows for a moment.
      card.dataset.scarfLanded = "true";
      done = window.setTimeout(() => {
        delete card.dataset.scarfLanded;
        layer.remove();
      }, 1600);
    })
    .catch(() => {});
  return () => {
    window.clearTimeout(done);
    flight.cancel();
    layer.remove();
    delete card.dataset.scarfLanded;
  };
}

/** Wait for the products row to come into view below the film, then fly once. */
export function watchScarfFlight(film: HTMLElement, snapshot: () => HTMLCanvasElement | null) {
  if (alreadyFlown() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let observer: IntersectionObserver | null = null;
  let timer = 0;
  let cancel = () => {};
  let tries = 0;
  // The products may render a moment after the hero: look again a few times.
  const watch = () => {
    const card = findTarget(film);
    if (!card) {
      if (tries++ < 6) timer = window.setTimeout(watch, 1200);
      return;
    }
    const image = card.querySelector(".editorial-product-image") ?? card;
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        // Only once the film is behind her (she scrolled down to the products).
        if (film.getBoundingClientRect().bottom > 0) return;
        observer?.disconnect();
        timer = window.setTimeout(() => {
          const picture = snapshot();
          if (!picture || alreadyFlown()) return;
          markFlown();
          cancel = fly(film, card, picture);
        }, 220);
      },
      { threshold: 0.6 },
    );
    observer.observe(image);
  };
  watch();
  return () => {
    observer?.disconnect();
    window.clearTimeout(timer);
    cancel();
  };
}
