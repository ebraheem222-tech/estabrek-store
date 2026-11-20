// How a Vercel token is made, in pictures (the setup's «متجرك» step, its token way): four steps as Vercel's own
// docs give them (vercel.com/docs/accounts/access-tokens), each drawn as a plain sketch of the screen, not a copy of
// it. The sketches take the page's own colours (currentColor), so they read in every skin.
import { say } from "../../studio/say";

export const VERCEL_TOKENS = "https://vercel.com/account/tokens";

const frame = "rounded-xl border border-white/10 bg-white/[0.03] p-2";
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } as const;

/** A browser's window, its address written in it. */
function Window({ address, children }: { address: string; children: React.ReactNode }) {
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
const Mark = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="9" fill="none" className="text-accent-400" stroke="currentColor" strokeWidth="2.5" />;
const Field = ({ x, y, w, label, value }: { x: number; y: number; w: number; label: string; value: string }) => (
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

function Step1() {
  return (
    <Window address="vercel.com/account/tokens">
      {["General", "Tokens", "Billing", "Security"].map((item, i) => (
        <g key={item}>
          {item === "Tokens" ? <rect x="12" y={46 + i * 22} width="70" height="18" rx="6" fill="currentColor" fillOpacity=".14" /> : null}
          <text x="20" y={59 + i * 22} fontSize="10" fill="currentColor">
            {item}
          </text>
        </g>
      ))}
      <Mark x={12} y={68} w={70} h={18} />
      <text x="104" y="58" fontSize="13" fontWeight="700" fill="currentColor">
        Tokens
      </text>
      <rect x="104" y="70" width="190" height="10" rx="4" fill="currentColor" fillOpacity=".12" />
      <rect x="104" y="88" width="150" height="10" rx="4" fill="currentColor" fillOpacity=".12" />
    </Window>
  );
}
function Step2() {
  return (
    <Window address="vercel.com/account/tokens">
      <text x="16" y="50" fontSize="11" fontWeight="700" fill="currentColor">
        Create Token
      </text>
      <Field x={16} y={66} w={135} label="Token name" value="estabrek-shop" />
      <Field x={168} y={66} w={135} label="Scope" value="My team › All Projects" />
      <Field x={16} y={108} w={135} label="Expiration" value="1 day" />
      <Mark x={168} y={66} w={135} h={18} />
      <rect x="230" y="140" width="72" height="24" rx="7" className="text-accent-400" fill="currentColor" />
      <text x="248" y="156" fontSize="11" fontWeight="700" fill="#fff">
        Create
      </text>
      <Mark x={230} y={140} w={72} h={24} />
    </Window>
  );
}
function Step3() {
  return (
    <Window address="vercel.com/account/tokens">
      <text x="16" y="54" fontSize="11" fontWeight="700" fill="currentColor">
        Token created
      </text>
      <rect x="16" y="66" width="250" height="26" rx="7" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeOpacity=".35" />
      <text x="26" y="83" fontSize="11" fill="currentColor" style={mono}>
        vcp_••••••••••••••••••••
      </text>
      <rect x="274" y="66" width="30" height="26" rx="7" fill="none" stroke="currentColor" strokeOpacity=".5" />
      <rect x="283" y="73" width="10" height="12" rx="2" fill="none" stroke="currentColor" />
      <rect x="286" y="70" width="10" height="12" rx="2" fill="none" stroke="currentColor" />
      <Mark x={274} y={66} w={30} h={26} />
      <text x="16" y="116" fontSize="9.5" fill="currentColor" fillOpacity=".75">
        Shown once only: copy it now.
      </text>
    </Window>
  );
}
function Step4() {
  return (
    <Window address="…/setup">
      <text x="304" y="54" fontSize="11" fontWeight="700" fill="currentColor" textAnchor="start" direction="rtl">
        متجرك
      </text>
      <text x="304" y="74" fontSize="9" fill="currentColor" fillOpacity=".7" textAnchor="start" direction="rtl">
        توكن Vercel
      </text>
      <rect x="16" y="80" width="288" height="20" rx="6" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text x="24" y="94" fontSize="10" fill="currentColor" style={mono}>
        vcp_••••••••••••
      </text>
      <Mark x={16} y={80} w={288} h={20} />
      <rect x="214" y="120" width="90" height="24" rx="7" className="text-accent-400" fill="currentColor" />
      <text x="259" y="136" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle" direction="rtl">
        اعمل المتجر
      </text>
      <Mark x={214} y={120} w={90} h={24} />
    </Window>
  );
}

const STEPS: Array<{ draw: () => React.ReactElement; words: string }> = [
  { draw: Step1, words: "افتح صفحة التوكنات بـ Vercel (لازم تكون فايت على حسابك). هي بالإعدادات تحت Tokens.|Open Vercel's tokens page (you need to be signed in). It's under Settings → Tokens.|פתחו את עמוד הטוקנים של Vercel (צריך להיות מחוברים). הוא בהגדרות תחת Tokens." },
  {
    draw: Step2,
    words:
      "اكتب اسم للتوكن (مثلاً estabrek-shop). من Scope اختار الفريق اللي فيه مشاريعك وبعدين All Projects، والمدة أقصر وحدة (يوم بيكفي). اكبس Create.|Name the token (e.g. estabrek-shop). Under Scope pick the team your projects are in, then All Projects; the shortest expiration (a day is enough). Press Create.|תנו שם לטוקן (למשל estabrek-shop). ב-Scope בחרו את הצוות שבו הפרויקטים שלכם ואז All Projects; התוקף הקצר ביותר (יום מספיק). לחצו Create.",
  },
  { draw: Step3, words: "انسخ التوكن (بيبلّش بـ vcp_). Vercel بيورجيه مرة وحدة بس.|Copy the token (it starts with vcp_). Vercel shows it once only.|העתיקו את הטוקן (הוא מתחיל ב-vcp_). Vercel מציג אותו פעם אחת בלבד." },
  { draw: Step4, words: "ارجع لهون، الصقه بخانة «توكن Vercel»، واكبس «اعمل المتجر». بيستعمل مرة وحدة وما بينحفظ.|Come back here, paste it in “Vercel token” and press “Make the shop”. It's used once and isn't kept.|חזרו לכאן, הדביקו אותו ב«טוקן Vercel» ולחצו «ליצור את החנות». הוא משמש פעם אחת ולא נשמר." },
];

/** The four steps in pictures, with Vercel's tokens page a press away. */
export function TokenGuide({ open }: { open?: boolean }) {
  return (
    <details className="rounded-xl border border-white/10 p-3" open={open} data-testid="setup-shop-guide">
      <summary className="cursor-pointer text-sm font-medium">{say("كيف بعمل توكن؟ بالصور|How do I make a token? In pictures|איך יוצרים טוקן? בתמונות")}</summary>
      <a href={VERCEL_TOKENS} target="_blank" rel="noreferrer noopener" className="mt-3 inline-block rounded-lg bg-white/5 px-3 py-2 text-xs underline" data-testid="setup-shop-guide-open">
        {say("افتح صفحة التوكنات بـ Vercel ↗|Open Vercel's tokens page ↗|פתיחת עמוד הטוקנים של Vercel ↗")}
      </a>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {STEPS.map(({ draw: Draw, words }, i) => (
          <li key={i} className={frame} data-testid={`setup-shop-guide-${i + 1}`}>
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
