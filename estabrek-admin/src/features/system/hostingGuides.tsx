// How a Railway token and a Neon API key are made, in pictures (admin → الاستضافة), as their own docs give them:
// Railway's account tokens are on railway.com/account/tokens ("No workspace" makes an account's token,
// docs.railway.com/reference/public-api); Neon's keys are under the profile menu → Account settings → API keys and
// shown once only (neon.com/docs/manage/api-keys). Both are only read with: the page shows what is there.
import { CopyButton, Field, Mark, PictureGuide, Press, Window, type GuideStep } from "../setup/PictureGuide";
import { mono } from "../setup/sketchStyle";

export const RAILWAY_TOKENS = "https://railway.com/account/tokens";
// Neon's docs give the way to its keys, not their page's address: the console's door, then its menu.
export const NEON_CONSOLE = "https://console.neon.tech";

/** The last step of both: the token pasted in this page's card. */
function PasteHere({ label }: { label: string }) {
  return (
    <Window address="…/admin/system/hosting">
      <text x="304" y="54" fontSize="11" fontWeight="700" fill="currentColor" textAnchor="start" direction="rtl">
        الاستضافة
      </text>
      <text x="16" y="74" fontSize="9" fill="currentColor" fillOpacity=".7">
        {label}
      </text>
      <rect x="16" y="80" width="288" height="20" rx="6" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text x="24" y="94" fontSize="10" fill="currentColor" style={mono}>
        ••••••••••••••••
      </text>
      <Mark x={16} y={80} w={288} h={20} />
      <Press x={226} y={120} w={78} words="وصّل" />
    </Window>
  );
}

function RailwayNew() {
  return (
    <Window address="railway.com/account/tokens">
      <text x="16" y="50" fontSize="11" fontWeight="700" fill="currentColor">
        Tokens
      </text>
      <Field x={16} y={68} w={135} label="Token name" value="estabrek" />
      <Field x={168} y={68} w={135} label="Workspace" value="No workspace" />
      <Mark x={168} y={68} w={135} h={18} />
      <Press x={222} y={130} w={82} words="Create" />
    </Window>
  );
}
function RailwayCopy() {
  return (
    <Window address="railway.com/account/tokens">
      <text x="16" y="54" fontSize="11" fontWeight="700" fill="currentColor">
        New token
      </text>
      <rect x="16" y="66" width="250" height="24" rx="7" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeOpacity=".35" />
      <text x="26" y="82" fontSize="10.5" fill="currentColor" style={mono}>
        3f2c••••-••••-••••-••••••••
      </text>
      <CopyButton x={276} y={68} />
      <text x="16" y="116" fontSize="9.5" fill="currentColor" fillOpacity=".75">
        Copy it now: it won't be shown again.
      </text>
    </Window>
  );
}
function NeonMenu() {
  return (
    <Window address="console.neon.tech">
      <circle cx="296" cy="48" r="9" fill="currentColor" fillOpacity=".2" />
      <Mark x={287} y={39} w={18} h={18} />
      <rect x="196" y="62" width="112" height="70" rx="8" fill="currentColor" fillOpacity=".06" stroke="currentColor" strokeOpacity=".3" />
      {["Profile", "Account settings", "Sign out"].map((w, i) => (
        <text key={w} x="206" y={80 + i * 20} fontSize="9.5" fill="currentColor">
          {w}
        </text>
      ))}
      <Mark x={202} y={89} w={100} h={14} />
      <rect x="16" y="48" width="160" height="10" rx="4" fill="currentColor" fillOpacity=".12" />
      <rect x="16" y="66" width="120" height="10" rx="4" fill="currentColor" fillOpacity=".12" />
    </Window>
  );
}
function NeonNew() {
  return (
    <Window address="console.neon.tech › Account settings › API keys">
      <text x="16" y="50" fontSize="11" fontWeight="700" fill="currentColor">
        API keys
      </text>
      <Press x={196} y={40} w={108} words="Create new API key" />
      <Field x={16} y={90} w={160} label="Key name" value="estabrek" />
      <text x="16" y="136" fontSize="9.5" fill="currentColor" fillOpacity=".75">
        The key is shown once only.
      </text>
    </Window>
  );
}

const RAILWAY: GuideStep[] = [
  {
    draw: RailwayNew,
    words:
      "افتح صفحة التوكنات بـ Railway (لازم تكون فايت). اكتب اسم (مثلاً estabrek)، ومن Workspace اختار «No workspace» ليصير توكن الحساب، واكبس Create.|Open Railway's tokens page (you need to be signed in). Write a name (e.g. estabrek), pick “No workspace” under Workspace for an account's token, and press Create.|פתחו את עמוד הטוקנים של Railway (צריך להיות מחוברים). כתבו שם (למשל estabrek), בחרו «No workspace» תחת Workspace לטוקן של החשבון, ולחצו Create.",
  },
  { draw: RailwayCopy, words: "انسخ التوكن هلأ: Railway ما بيرجع يورجيه.|Copy the token now: Railway won't show it again.|העתיקו את הטוקן עכשיו: Railway לא יציג אותו שוב." },
  {
    draw: () => <PasteHere label="Railway token" />,
    words: "ارجع لهون، الصقه بخانة Railway واكبس «وصّل». بنقرأ فيه بس: مشاريعك وآخر النشرات.|Come back here, paste it in the Railway box and press “Connect”. It is only read with: your projects and their last deploys.|חזרו לכאן, הדביקו אותו בתיבת Railway ולחצו «חיבור». רק קוראים איתו: הפרויקטים שלכם והפריסות האחרונות.",
  },
];

const NEON: GuideStep[] = [
  {
    draw: NeonMenu,
    words: "بـ Neon افتح قائمتك فوق عاليمين ← Account settings ← API keys.|In Neon open your menu at the top right → Account settings → API keys.|ב-Neon פתחו את התפריט שלכם למעלה מימין ← Account settings ← API keys.",
  },
  {
    draw: NeonNew,
    words: "اكبس Create new API key، اكتب اسم (مثلاً estabrek)، وانسخ المفتاح: Neon بيورجيه مرة وحدة بس.|Press Create new API key, write a name (e.g. estabrek), and copy the key: Neon shows it once only.|לחצו Create new API key, כתבו שם (למשל estabrek), והעתיקו את המפתח: Neon מציג אותו פעם אחת בלבד.",
  },
  {
    draw: () => <PasteHere label="Neon API key" />,
    words: "ارجع لهون، الصقه بخانة Neon واكبس «وصّل». بنقرأ فيه بس: مشاريعك وفروعها ومكانها.|Come back here, paste it in the Neon box and press “Connect”. It is only read with: your projects, their branches and where they are.|חזרו לכאן, הדביקו אותו בתיבת Neon ולחצו «חיבור». רק קוראים איתו: הפרויקטים, הענפים שלהם והמיקום.",
  },
];

export function RailwayGuide() {
  return <PictureGuide testid="railway-guide" title="كيف بعمل توكن Railway؟ بالصور|How do I make a Railway token? In pictures|איך יוצרים טוקן Railway? בתמונות" link={{ href: RAILWAY_TOKENS, label: "افتح صفحة التوكنات بـ Railway ↗|Open Railway's tokens page ↗|פתיחת עמוד הטוקנים של Railway ↗" }} steps={RAILWAY} />;
}
export function NeonGuide() {
  return <PictureGuide testid="neon-guide" title="كيف بعمل مفتاح Neon؟ بالصور|How do I make a Neon key? In pictures|איך יוצרים מפתח Neon? בתמונות" link={{ href: NEON_CONSOLE, label: "افتح Neon ↗|Open Neon ↗|פתיחת Neon ↗" }} steps={NEON} />;
}
