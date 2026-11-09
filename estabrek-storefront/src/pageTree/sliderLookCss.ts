/**
 * A slider's shapes (data-look), arrows (data-arrows) and dots (data-dots), set from its settings
 * (sliderLooksOf). They frame the same slides; "peek" and "trio" show more than one at a time, so
 * they only change the plain sliding row (with another effect, one slide shows as usual).
 */
const S = ".pt-slider";
const BAG = (fill: string) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Crect x='1' y='2' width='10' height='8' rx='2' fill='${fill}'/%3E%3C/svg%3E")`;

export const SLIDER_LOOK_CSS = [
  // Frames and shapes.
  `${S}[data-look=rounded]{border-radius:24px}`,
  `${S}[data-look=card]{padding:10px;border-radius:22px;background:var(--surface,#fff);box-shadow:0 18px 44px -18px #0006}`,
  `${S}[data-look=card] .pt-slides{border-radius:14px}`,
  `${S}[data-look=frame]{padding:clamp(14px,3.2%,36px);background:var(--surface,#fff);border:1px solid var(--border,#0002);box-shadow:inset 0 0 0 6px var(--bg,#fff),0 14px 34px -18px #0006}`,
  `${S}[data-look=polaroid]{padding:12px 12px 54px;background:#fff;box-shadow:0 16px 36px -14px #0007;transform:rotate(-1.6deg);transition:transform .5s cubic-bezier(.2,.7,.2,1)}`,
  `${S}[data-look=polaroid]:hover{transform:rotate(0deg)}`,
  `${S}[data-look=polaroid] .pt-slider-dots{bottom:14px}`,
  `${S}[data-look=polaroid] .pt-slider-dot::before{background:#0003;box-shadow:none}${S}[data-look=polaroid] .pt-slider-dot[aria-current=true]::before{background:#222}`,
  `${S}[data-look=arch]{border-radius:50% 50% 18px 18px/34% 34% 18px 18px}`,
  `${S}[data-look=circle]{width:min(100%,560px);max-width:100%;margin-inline:auto;aspect-ratio:1/1;border-radius:50%}`,
  `${S}[data-look=circle] .pt-slider-dots{bottom:7%}`,
  `${S}[data-look=blob]{border-radius:42% 58% 63% 37%/41% 44% 56% 59%;animation:pt-sl-blob 14s ease-in-out infinite alternate}`,
  "@keyframes pt-sl-blob{50%{border-radius:58% 42% 38% 62%/52% 61% 39% 48%}100%{border-radius:38% 62% 55% 45%/63% 39% 61% 37%}}",
  `${S}[data-look=ticket]{border-radius:16px;-webkit-mask:radial-gradient(circle 18px at 0 50%,#0000 97%,#000) left/51% 100% no-repeat,radial-gradient(circle 18px at 100% 50%,#0000 97%,#000) right/51% 100% no-repeat;mask:radial-gradient(circle 18px at 0 50%,#0000 97%,#000) left/51% 100% no-repeat,radial-gradient(circle 18px at 100% 50%,#0000 97%,#000) right/51% 100% no-repeat}`,
  `${S}[data-look=film]{padding:30px 0;border-radius:6px;background:${BAG("%23f2f2f2")} 6px 9px/24px 12px repeat-x,${BAG("%23f2f2f2")} 6px calc(100% - 9px)/24px 12px repeat-x,#111}`,
  `${S}[data-look=phone]{width:min(100%,340px);max-width:100%;margin-inline:auto;aspect-ratio:9/19;padding:12px;border-radius:46px;background:#111;box-shadow:0 0 0 2px #3a3a3a,0 26px 54px -18px #0009}`,
  `${S}[data-look=phone] .pt-slides{border-radius:34px}`,
  `${S}[data-look=phone]::before{content:"";position:absolute;z-index:9;top:22px;left:50%;width:30%;height:22px;transform:translateX(-50%);border-radius:999px;background:#111}`,
  `${S}[data-look=browser]{padding-top:34px;border-radius:12px;background:var(--surface,#f4f4f6);border:1px solid var(--border,#0002);box-shadow:0 18px 40px -18px #0006}`,
  `${S}[data-look=browser]::before{content:"";position:absolute;z-index:9;top:12px;inset-inline-start:14px;width:10px;height:10px;border-radius:50%;background:#ff5f57;box-shadow:16px 0 #febc2e,32px 0 #28c840}`,
  `[dir=rtl] ${S}[data-look=browser]::before{box-shadow:-16px 0 #febc2e,-32px 0 #28c840}`,
  `${S}[data-look=tilt]{border-radius:18px;transform:perspective(1400px) rotateY(-9deg) rotateX(4deg);box-shadow:28px 30px 60px -24px #0007;transition:transform .7s cubic-bezier(.2,.7,.2,1)}`,
  `[dir=rtl] ${S}[data-look=tilt]{transform:perspective(1400px) rotateY(9deg) rotateX(4deg)}`,
  `${S}[data-look=tilt]:hover,[dir=rtl] ${S}[data-look=tilt]:hover{transform:none}`,
  `${S}[data-look=stack]{border-radius:18px;margin-block-end:22px;box-shadow:11px 11px 0 -1px var(--surface,#fff),11px 11px 0 0 var(--border,#0002),22px 22px 0 -2px var(--surface,#fff),22px 22px 0 -1px var(--border,#0002)}`,
  `[dir=rtl] ${S}[data-look=stack]{box-shadow:-11px 11px 0 -1px var(--surface,#fff),-11px 11px 0 0 var(--border,#0002),-22px 22px 0 -2px var(--surface,#fff),-22px 22px 0 -1px var(--border,#0002)}`,
  // More than one at a time (the plain sliding row only).
  `${S}:is([data-look=peek],[data-look=trio]){background:none}`,
  `${S}:is([data-look=peek],[data-look=trio]):not([data-enhanced]) .pt-slides{gap:14px}`,
  `${S}:is([data-look=peek],[data-look=trio]):not([data-enhanced]) .pt-slide{border-radius:18px;overflow:hidden}`,
  `${S}[data-look=peek]:not([data-enhanced]) .pt-slides{padding-inline-end:14%}`,
  `${S}[data-look=peek]:not([data-enhanced]) .pt-slide{flex:0 0 84%;width:84%}`,
  `${S}[data-look=trio]:not([data-enhanced]) .pt-slide{flex:0 0 calc((100% - 28px)/3);width:calc((100% - 28px)/3)}`,
  `@media(max-width:639.98px){${S}[data-look=trio]:not([data-enhanced]) .pt-slide{flex-basis:80%;width:80%}}`,
  `${S}:is([data-look=peek],[data-look=trio]) .pt-slider-dots{bottom:-2px}`,
  // Arrows.
  `${S}[data-arrows=square] .pt-slider-arrow{border-radius:10px}`,
  `${S}[data-arrows=bare] .pt-slider-arrow{background:none;box-shadow:none;color:#fff;filter:drop-shadow(0 2px 6px #000a)}`,
  `${S}[data-arrows=bare] .pt-slider-arrow svg{width:30px;height:30px}`,
  `${S}[data-arrows=glass] .pt-slider-arrow{background:#ffffff2e;color:#fff;border:1px solid #ffffff66;box-shadow:0 8px 24px -10px #0008;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}`,
  `${S}[data-arrows=outline] .pt-slider-arrow{background:none;color:#fff;border:2px solid currentColor;box-shadow:none}`,
  `${S}[data-arrows=outline] .pt-slider-arrow:hover{background:#fff;color:#111}`,
  `${S}[data-arrows=corner] .pt-slider-arrow{top:auto;bottom:12px;width:40px;height:40px;transform:none}`,
  `${S}[data-arrows=corner] .pt-slider-prev{inset-inline-start:auto;inset-inline-end:60px}`,
  `${S}[data-arrows=corner] .pt-slider-dots{inset-inline:16px 112px;justify-content:flex-start}`,
  // Dots.
  `${S}[data-dots=lines] .pt-slider-dot::before{width:16px;height:3px;border-radius:2px}`,
  `${S}[data-dots=lines] .pt-slider-dot[aria-current=true]::before{width:30px}`,
  `${S}[data-dots=bars] .pt-slider-dots{flex-wrap:nowrap;gap:6px}`,
  `${S}[data-dots=bars] .pt-slider-dot{flex:1 1 0;width:auto;max-width:64px}`,
  `${S}[data-dots=bars] .pt-slider-dot::before,${S}[data-dots=bars] .pt-slider-dot[aria-current=true]::before{width:100%;height:3px;border-radius:2px}`,
  `${S}[data-dots=numbers] .pt-slider-dots{counter-reset:pt-sl-dot}`,
  `${S}[data-dots=numbers] .pt-slider-dot{counter-increment:pt-sl-dot;width:28px}`,
  `${S}[data-dots=numbers] .pt-slider-dot::before,${S}[data-dots=numbers] .pt-slider-dot[aria-current=true]::before{content:counter(pt-sl-dot,decimal-leading-zero);width:auto;height:auto;background:none;box-shadow:none;color:#ffffffb0;font:600 12px/1 system-ui,sans-serif;text-shadow:0 1px 4px #0009}`,
  `${S}[data-dots=numbers] .pt-slider-dot[aria-current=true]::before{color:#fff;text-decoration:underline;text-underline-offset:4px}`,
  `@media(prefers-reduced-motion:reduce){${S}[data-look=blob]{animation:none}${S}:is([data-look=polaroid],[data-look=tilt]){transition:none}}`,
].join("");
