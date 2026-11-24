// A how-to in pictures (Vercel's token, Cloudinary's keys, Railway's and Neon's tokens): each step a plain sketch of
// the service's screen as its own docs describe it, not a copy of it. The sketches take the page's own colours
// (currentColor), so they read in every skin.
import { say } from "../../studio/say";
import { mono } from "./sketchStyle";

/** A browser's window, its address written in it. */
export function Window({ address, children }: { address: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" className="block h-auto w-full text-white/70" role="img" aria-hidden direction="ltr">
      <rect x="1" y="1" width="318" height="178" rx="12" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <circle cx="16" cy="16" r="4" fill="currentColor" fillOpacity=".3" />
      <circle cx="28" cy="16" r="4" fill="currentColor" fillOpacity=".3" />
      <circle cx="40" cy="16" r="4" fill="currentColor" fillOpacity=".3" />
      <rect x="56" y="8" width="252" height="16" rx="8" fill="currentColor" fillOpacity=".08" />
      <text x="66" y="20" fontSize="10" fill="currentColor" style={mono}>
        {address}
      </text>
      <line x1="1" y1="32" x2="319" y2="32" stroke="currentColor" strokeOpacity=".2" />
      {children}
    </svg>
  );
}
/** What is pressed or filled at this step: drawn in the page's accent. */
export const Mark = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="9" fill="none" className="text-accent-400" stroke="currentColor" strokeWidth="2.5" />;
export const Field = ({ x, y, w, label, value }: { x: number; y: number; w: number; label: string; value: string }) => (
  <g>
    <text x={x} y={y - 4} fontSize="9" fill="currentColor" fillOpacity=".7">
      {label}
    </text>
    <rect x={x} y={y} width={w} height="18" rx="5" fill="none" stroke="currentColor" strokeOpacity=".4" />
    <text x={x + 7} y={y + 12.5} fontSize="9.5" fill="currentColor" style={mono}>
      {value}
    </text>
  </g>
);
/** A button in the page's accent, its words centred (Arabic too). */
export const Press = ({ x, y, w, words, marked = true }: { x: number; y: number; w: number; words: string; marked?: boolean }) => (
  <g>
    <rect x={x} y={y} width={w} height="24" rx="7" className="text-accent-400" fill="currentColor" />
    <text x={x + w / 2} y={y + 16} fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle" direction={/[֐-ۿ]/.test(words) ? "rtl" : undefined}>
      {words}
    </text>
    {marked ? <Mark x={x} y={y} w={w} h={24} /> : null}
  </g>
);
/** A copy button: two sheets. */
export const CopyButton = ({ x, y, marked = true }: { x: number; y: number; marked?: boolean }) => (
  <g>
    <rect x={x} y={y} width="26" height="20" rx="6" fill="none" stroke="currentColor" strokeOpacity=".5" />
    <rect x={x + 8} y={y + 6} width="8" height="10" rx="2" fill="none" stroke="currentColor" />
    <rect x={x + 11} y={y + 3} width="8" height="10" rx="2" fill="none" stroke="currentColor" />
    {marked ? <Mark x={x} y={y} w={26} h={20} /> : null}
  </g>
);
/** A line of a page that only stands for words. */
export const Bar = ({ x, y, w }: { x: number; y: number; w: number }) => <rect x={x} y={y} width={w} height="9" rx="4" fill="currentColor" fillOpacity=".12" />;

export type GuideStep = { draw: () => React.ReactElement; words: string };

/** The steps in pictures, with the service's page a press away. */
export function PictureGuide({ testid, title, link, steps, open }: { testid: string; title: string; link: { href: string; label: string }; steps: GuideStep[]; open?: boolean }) {
  return (
    <details className="rounded-xl border border-white/10 p-3" open={open} data-testid={testid}>
      <summary className="cursor-pointer text-sm font-medium">{say(title)}</summary>
      <a href={link.href} target="_blank" rel="noreferrer noopener" className="mt-3 inline-block rounded-lg bg-white/5 px-3 py-2 text-xs underline" data-testid={`${testid}-open`}>
        {say(link.label)}
      </a>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {steps.map(({ draw: Draw, words }, i) => (
          <li key={i} className="rounded-xl border border-white/10 bg-white/3 p-2" data-testid={`${testid}-${i + 1}`}>
            <Draw />
            <p className="mt-2 text-xs leading-6 text-white/75">
              <span className="me-1 inline-grid h-5 w-5 place-items-center rounded-full bg-accent-500/25 text-[11px] font-bold">{i + 1}</span>
              {say(words)}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-white/50">{say("الصور رسمة تقريبية للشاشة، مش نسخة عنها.|The pictures are sketches of the screens, not copies of them.|התמונות הן סקיצות של המסכים, לא העתקים שלהם.")}</p>
    </details>
  );
}
