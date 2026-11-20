// How a store's own Cloudinary account is made and its three keys found, in pictures (the setup's «وين بتنحفظ
// الصور» step, and admin → الاستضافة). The steps follow Cloudinary's own docs
// (cloudinary.com/documentation/finding_your_credentials_tutorial): the cloud name is on the Dashboard, the API key
// and secret on Settings → API Keys, where the secret is shown with a press (it may ask for a code from the email).
import { Bar, CopyButton, Field, Mark, PictureGuide, Press, Window, type GuideStep } from "./PictureGuide";
import { mono } from "./sketchStyle";

export const CLOUDINARY_SIGN_UP = "https://cloudinary.com/users/register_free";
export const CLOUDINARY_DASHBOARD = "https://console.cloudinary.com/app/home/dashboard";
export const CLOUDINARY_KEYS = "https://console.cloudinary.com/app/settings/api-keys";

function SignUp() {
  return (
    <Window address="cloudinary.com/users/register_free">
      <text x="160" y="54" fontSize="12" fontWeight="700" fill="currentColor" textAnchor="middle">
        Sign up for free
      </text>
      <rect x="80" y="66" width="160" height="22" rx="7" fill="none" stroke="currentColor" strokeOpacity=".5" />
      <circle cx="96" cy="77" r="5" fill="none" stroke="currentColor" />
      <text x="108" y="81" fontSize="10" fill="currentColor">
        Sign up with Google
      </text>
      <Mark x={80} y={66} w={160} h={22} />
      <text x="160" y="104" fontSize="9" fill="currentColor" fillOpacity=".6" textAnchor="middle">
        or
      </text>
      <Field x={80} y={118} w={160} label="Email" value="you@example.com" />
      <Bar x={80} y={146} w={160} />
    </Window>
  );
}
function Dashboard() {
  return (
    <Window address="console.cloudinary.com/app/home/dashboard">
      <text x="16" y="50" fontSize="9" fill="currentColor" fillOpacity=".7">
        Product Environment
      </text>
      <text x="16" y="68" fontSize="10" fill="currentColor">
        Cloud name:
      </text>
      <text x="82" y="68" fontSize="11" fontWeight="700" fill="currentColor" style={mono}>
        dxyz12abc
      </text>
      <CopyButton x={150} y={54} />
      <Bar x={16} y={88} w={170} />
      <Bar x={16} y={104} w={130} />
      <Press x={196} y={138} w={110} words="Go to API Keys" />
    </Window>
  );
}
function ApiKeys() {
  return (
    <Window address="console.cloudinary.com/app/settings/api-keys">
      <text x="16" y="50" fontSize="11" fontWeight="700" fill="currentColor">
        API Keys
      </text>
      {["Name", "API Key", "API Secret"].map((h, i) => (
        <text key={h} x={[16, 66, 206][i]} y="72" fontSize="8.5" fill="currentColor" fillOpacity=".65">
          {h}
        </text>
      ))}
      <line x1="16" y1="78" x2="304" y2="78" stroke="currentColor" strokeOpacity=".2" />
      <text x="16" y="96" fontSize="9.5" fill="currentColor">
        Root
      </text>
      <text x="66" y="96" fontSize="9.5" fill="currentColor" style={mono}>
        123456789012345
      </text>
      <CopyButton x={162} y={82} />
      <text x="206" y="96" fontSize="9.5" fill="currentColor" style={mono}>
        ••••••••••
      </text>
      {/* The eye that shows the secret. */}
      <g>
        <ellipse cx="290" cy="92" rx="9" ry="6" fill="none" stroke="currentColor" />
        <circle cx="290" cy="92" r="2.5" fill="currentColor" />
        <Mark x={278} y={83} w={24} h={18} />
      </g>
      <text x="16" y="130" fontSize="9" fill="currentColor" fillOpacity=".75">
        It may ask for a code sent to your email.
      </text>
    </Window>
  );
}
function PasteHere() {
  return (
    <Window address="…/setup">
      <Field x={16} y={52} w={288} label="Cloud name" value="dxyz12abc" />
      <Field x={16} y={88} w={288} label="API key" value="123456789012345" />
      <Field x={16} y={124} w={180} label="API secret" value="••••••••••••" />
      <Mark x={16} y={52} w={288} h={90} />
      <Press x={212} y={122} w={92} words="جرّب ووصّل" marked={false} />
    </Window>
  );
}

const STEPS: GuideStep[] = [
  {
    draw: SignUp,
    words:
      "اعمل حساب ببلاش بـ Cloudinary (أسهل إشي بحساب Google). الحساب المجاني بيكفي للبداية.|Make a free Cloudinary account (Google sign-in is the quickest). The free plan is enough to start.|צרו חשבון חינמי ב-Cloudinary (הכי מהר עם Google). התוכנית החינמית מספיקה להתחלה.",
  },
  {
    draw: Dashboard,
    words:
      "بالـ Dashboard، فوق تحت Product Environment، في Cloud name: انسخه. بعدين اكبس Go to API Keys (أو أيقونة الإعدادات ⚙ بالشريط الجانبي ← API Keys).|On the Dashboard, at the top under Product Environment, is the Cloud name: copy it. Then press Go to API Keys (or the ⚙ Settings icon in the side bar → API Keys).|ב-Dashboard, למעלה תחת Product Environment, מופיע ה-Cloud name: העתיקו אותו. אחר כך לחצו Go to API Keys (או סמל ההגדרות ⚙ בסרגל הצד ← API Keys).",
  },
  {
    draw: ApiKeys,
    words:
      "بصفحة API Keys انسخ الـ API Key (أرقام بس). الـ API Secret مخفي: اكبس العين ليبين وانسخه. ممكن يبعتلك كود عالإيميل قبل ما يورجيه.|On the API Keys page copy the API Key (digits only). The API Secret is hidden: press the eye to show it, then copy it. It may email you a code before it shows it.|בעמוד API Keys העתיקו את ה-API Key (רק ספרות). ה-API Secret מוסתר: לחצו על העין כדי להציג אותו והעתיקו. ייתכן שתישלח אליכם קודם קוד במייל.",
  },
  {
    draw: PasteHere,
    words:
      "ارجع لهون، الصق التلاتة واكبس «جرّب ووصّل»: بنجرّبهم مع Cloudinary قبل ما ينحفظوا، والسر بينحفظ مقفول وما بيرجع ينعرض.|Come back here, paste the three and press “Try it and connect”: they are tried with Cloudinary before they are kept, and the secret is kept sealed and never shown again.|חזרו לכאן, הדביקו את שלושתם ולחצו «לנסות ולחבר»: הם נבדקים מול Cloudinary לפני שהם נשמרים, והסוד נשמר נעול ולא מוצג שוב.",
  },
];

/** The four steps in pictures, with Cloudinary's sign-up page a press away. */
export function CloudinaryGuide({ open }: { open?: boolean }) {
  return (
    <div className="space-y-2" data-testid="cloudinary-guide-wrap">
      <PictureGuide testid="cloudinary-guide" open={open} title="كيف بعمل حساب Cloudinary وبلاقي المفاتيح؟ بالصور|How do I make a Cloudinary account and find its keys? In pictures|איך יוצרים חשבון Cloudinary ומוצאים את המפתחות? בתמונות" link={{ href: CLOUDINARY_SIGN_UP, label: "افتح صفحة التسجيل بـ Cloudinary ↗|Open Cloudinary's sign-up page ↗|פתיחת עמוד ההרשמה של Cloudinary ↗" }} steps={STEPS} />
      <p className="flex flex-wrap gap-3 text-[11px]">
        <a href={CLOUDINARY_DASHBOARD} target="_blank" rel="noreferrer noopener" className="underline text-white/60" data-testid="cloudinary-guide-dashboard">
          Dashboard ↗
        </a>
        <a href={CLOUDINARY_KEYS} target="_blank" rel="noreferrer noopener" className="underline text-white/60" data-testid="cloudinary-guide-keys">
          API Keys ↗
        </a>
      </p>
    </div>
  );
}
